# Postpartum Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mother-focused Postpartum life stage to Lumen — recovery tracking, week-by-week recovery content, and a crisis-aware EPDS mental-health screen — entered only via the birth path and exited on the user's terms.

**Architecture:** A deliberate structural mirror of Phase 4 (Pregnancy mode). Pure-TS domain core under `src/domain/postpartum/` (recovery math, EPDS instrument + scorer, weekly content, lifecycle transitions) → Dexie v3 data layer (`postpartumProfile` + `epdsEntries`) → `useHealthData` hook → App Router UI. All deterministic, test-first, no LLM, all-local.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind v4, Dexie, date-fns, Vitest + Testing Library + fake-indexeddb, Node 24.

## Global Constraints

- **Read `node_modules/next/dist/docs/` before writing any Next.js code** — this Next.js has breaking changes vs. training data (per AGENTS.md).
- **Domain logic is pure TS, deterministic, explainable** — no LLM, no randomness, no I/O. Predictions are never invented (no cycle-return forecast).
- **Test-first (TDD):** failing test → run to confirm fail → minimal implementation → run to confirm pass → commit. One logical change per commit.
- **Mirror existing patterns exactly** — chip/section styling, `rose-600` accent, `aria-label`/`aria-pressed` conventions, `'use client'` on interactive components, `// eslint-disable-next-line react-hooks/set-state-in-effect` (with justification) only at mount-time hydration sites.
- **EPDS is screening, not diagnosis** — every result surface states this and points to a provider. Crisis guidance is **region-agnostic** (no hardcoded phone numbers).
- **Postpartum bleeding is `lochia`, kept separate from `flow`** — it must never feed cycle stats or predictions, and must not create a `Cycle`.
- **Verify before done:** `npm test` and `npm run build` both green.

---

### Task 1: Recovery math (`recovery.ts`)

**Files:**
- Create: `src/domain/postpartum/recovery.ts`
- Test: `src/domain/postpartum/recovery.test.ts`

**Interfaces:**
- Consumes: `addDays`/`daysBetween` from `@/src/domain/dates`, `ISODate` from `@/src/domain/types`.
- Produces:
  - `postpartumDay(birthDate: ISODate, onDate: ISODate): number` — 0-based days since birth, clamped ≥ 0.
  - `postpartumWeek(birthDate: ISODate, onDate: ISODate): number` — 1-based week.
  - `RecoveryStage = 'acute' | 'extended' | 'ongoing'`
  - `recoveryStage(birthDate: ISODate, onDate: ISODate): RecoveryStage` — acute weeks 1–6, extended 7–12, ongoing 13+.

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/postpartum/recovery.test.ts
import { describe, it, expect } from 'vitest';
import { postpartumDay, postpartumWeek, recoveryStage } from './recovery';

describe('postpartumDay', () => {
  it('counts days since birth (0-based)', () => {
    expect(postpartumDay('2026-06-01', '2026-06-01')).toBe(0);
    expect(postpartumDay('2026-06-01', '2026-06-08')).toBe(7);
  });
  it('clamps dates before birth to 0', () => {
    expect(postpartumDay('2026-06-01', '2026-05-20')).toBe(0);
  });
});

describe('postpartumWeek', () => {
  it('is 1-based', () => {
    expect(postpartumWeek('2026-06-01', '2026-06-01')).toBe(1); // day 0 → week 1
    expect(postpartumWeek('2026-06-01', '2026-06-07')).toBe(1); // day 6 → week 1
    expect(postpartumWeek('2026-06-01', '2026-06-08')).toBe(2); // day 7 → week 2
  });
});

describe('recoveryStage', () => {
  it('bands weeks into acute / extended / ongoing', () => {
    expect(recoveryStage('2026-06-01', '2026-06-01')).toBe('acute'); // wk 1
    expect(recoveryStage('2026-06-01', '2026-07-12')).toBe('acute'); // wk 6 (day 41)
    expect(recoveryStage('2026-06-01', '2026-07-13')).toBe('extended'); // wk 7 (day 42)
    expect(recoveryStage('2026-06-01', '2026-08-23')).toBe('extended'); // wk 12 (day 83)
    expect(recoveryStage('2026-06-01', '2026-08-24')).toBe('ongoing'); // wk 13 (day 84)
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/postpartum/recovery.test.ts`
Expected: FAIL — cannot find module `./recovery`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/postpartum/recovery.ts
import { daysBetween } from '@/src/domain/dates';
import type { ISODate } from '@/src/domain/types';

export type RecoveryStage = 'acute' | 'extended' | 'ongoing';

export function postpartumDay(birthDate: ISODate, onDate: ISODate): number {
  return Math.max(0, daysBetween(birthDate, onDate));
}

export function postpartumWeek(birthDate: ISODate, onDate: ISODate): number {
  return Math.floor(postpartumDay(birthDate, onDate) / 7) + 1;
}

export function recoveryStage(birthDate: ISODate, onDate: ISODate): RecoveryStage {
  const week = postpartumWeek(birthDate, onDate);
  if (week <= 6) return 'acute';
  if (week <= 12) return 'extended';
  return 'ongoing';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/postpartum/recovery.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/postpartum/recovery.ts src/domain/postpartum/recovery.test.ts
git commit -m "feat(postpartum): recovery day/week/stage math"
```

---

### Task 2: EPDS instrument & scorer (`epds.ts`)

**Files:**
- Create: `src/domain/postpartum/epds.ts`
- Test: `src/domain/postpartum/epds.test.ts`

**Interfaces:**
- Produces:
  - `interface EpdsOption { label: string; value: 0 | 1 | 2 | 3 }`
  - `interface EpdsQuestion { prompt: string; options: EpdsOption[] }`
  - `EPDS_QUESTIONS: EpdsQuestion[]` (length 10; options already carry correct/reverse-scored values).
  - `EpdsBand = 'low' | 'possible' | 'probable'`
  - `interface EpdsResult { total: number; band: EpdsBand; riskFlag: boolean; bandText: string }`
  - `scoreEpds(responses: number[]): EpdsResult` — `responses` is the 10 chosen option **values** (0–3). Throws on malformed input. `band`: total<10 low, 10–12 possible, ≥13 probable. `riskFlag`: total≥13 OR `responses[9] > 0` (self-harm item).
  - `EPDS_SOURCE: string` — attribution line.

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/postpartum/epds.test.ts
import { describe, it, expect } from 'vitest';
import { EPDS_QUESTIONS, scoreEpds } from './epds';

describe('EPDS_QUESTIONS', () => {
  it('has 10 questions each with 4 options valued 0..3', () => {
    expect(EPDS_QUESTIONS).toHaveLength(10);
    for (const q of EPDS_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(q.options.map((o) => o.value).sort()).toEqual([0, 1, 2, 3]);
    }
  });
  it('self-harm item (10) is reverse-scored: "Never" is 0', () => {
    const last = EPDS_QUESTIONS[9];
    expect(last.options.at(-1)).toMatchObject({ value: 0 });
  });
});

describe('scoreEpds', () => {
  it('sums to a low band below 10', () => {
    const r = scoreEpds([0, 0, 0, 1, 0, 1, 0, 1, 0, 0]); // total 4
    expect(r.total).toBe(4);
    expect(r.band).toBe('low');
    expect(r.riskFlag).toBe(false);
  });
  it('bands 10-12 as possible', () => {
    expect(scoreEpds([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]).band).toBe('possible'); // 10
    expect(scoreEpds([2, 1, 1, 1, 1, 1, 1, 2, 1, 1]).band).toBe('possible'); // 12
  });
  it('bands >=13 as probable and flags risk', () => {
    const r = scoreEpds([2, 2, 1, 1, 1, 2, 1, 2, 1, 0]); // 13
    expect(r.band).toBe('probable');
    expect(r.riskFlag).toBe(true);
  });
  it('flags risk on any self-harm response even at a low total', () => {
    const r = scoreEpds([0, 0, 0, 0, 0, 0, 0, 0, 0, 1]); // total 1
    expect(r.band).toBe('low');
    expect(r.riskFlag).toBe(true);
  });
  it('throws on malformed input', () => {
    expect(() => scoreEpds([0, 0, 0])).toThrow();
    expect(() => scoreEpds([0, 0, 0, 0, 0, 0, 0, 0, 0, 4])).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/postpartum/epds.test.ts`
Expected: FAIL — cannot find module `./epds`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/postpartum/epds.ts
// Edinburgh Postnatal Depression Scale (Cox, Holden & Sagovsky, 1987).
// Each option carries its scored value; reverse-scored items encode 3→0 directly.

export interface EpdsOption {
  label: string;
  value: 0 | 1 | 2 | 3;
}
export interface EpdsQuestion {
  prompt: string;
  options: EpdsOption[];
}

export const EPDS_QUESTIONS: EpdsQuestion[] = [
  {
    prompt: 'I have been able to laugh and see the funny side of things',
    options: [
      { label: 'As much as I always could', value: 0 },
      { label: 'Not quite so much now', value: 1 },
      { label: 'Definitely not so much now', value: 2 },
      { label: 'Not at all', value: 3 },
    ],
  },
  {
    prompt: 'I have looked forward with enjoyment to things',
    options: [
      { label: 'As much as I ever did', value: 0 },
      { label: 'Rather less than I used to', value: 1 },
      { label: 'Definitely less than I used to', value: 2 },
      { label: 'Hardly at all', value: 3 },
    ],
  },
  {
    prompt: 'I have blamed myself unnecessarily when things went wrong',
    options: [
      { label: 'Yes, most of the time', value: 3 },
      { label: 'Yes, some of the time', value: 2 },
      { label: 'Not very often', value: 1 },
      { label: 'No, never', value: 0 },
    ],
  },
  {
    prompt: 'I have been anxious or worried for no good reason',
    options: [
      { label: 'No, not at all', value: 0 },
      { label: 'Hardly ever', value: 1 },
      { label: 'Yes, sometimes', value: 2 },
      { label: 'Yes, very often', value: 3 },
    ],
  },
  {
    prompt: 'I have felt scared or panicky for no very good reason',
    options: [
      { label: 'Yes, quite a lot', value: 3 },
      { label: 'Yes, sometimes', value: 2 },
      { label: 'No, not much', value: 1 },
      { label: 'No, not at all', value: 0 },
    ],
  },
  {
    prompt: 'Things have been getting on top of me',
    options: [
      { label: "Yes, most of the time I haven't been able to cope at all", value: 3 },
      { label: "Yes, sometimes I haven't been coping as well as usual", value: 2 },
      { label: 'No, most of the time I have coped quite well', value: 1 },
      { label: 'No, I have been coping as well as ever', value: 0 },
    ],
  },
  {
    prompt: 'I have been so unhappy that I have had difficulty sleeping',
    options: [
      { label: 'Yes, most of the time', value: 3 },
      { label: 'Yes, sometimes', value: 2 },
      { label: 'Not very often', value: 1 },
      { label: 'No, not at all', value: 0 },
    ],
  },
  {
    prompt: 'I have felt sad or miserable',
    options: [
      { label: 'Yes, most of the time', value: 3 },
      { label: 'Yes, quite often', value: 2 },
      { label: 'Not very often', value: 1 },
      { label: 'No, not at all', value: 0 },
    ],
  },
  {
    prompt: 'I have been so unhappy that I have been crying',
    options: [
      { label: 'Yes, most of the time', value: 3 },
      { label: 'Yes, quite often', value: 2 },
      { label: 'Only occasionally', value: 1 },
      { label: 'No, never', value: 0 },
    ],
  },
  {
    prompt: 'The thought of harming myself has occurred to me',
    options: [
      { label: 'Yes, quite often', value: 3 },
      { label: 'Sometimes', value: 2 },
      { label: 'Hardly ever', value: 1 },
      { label: 'Never', value: 0 },
    ],
  },
];

export const EPDS_SOURCE =
  'Edinburgh Postnatal Depression Scale (Cox, Holden & Sagovsky, 1987)';

export type EpdsBand = 'low' | 'possible' | 'probable';

export interface EpdsResult {
  total: number;
  band: EpdsBand;
  riskFlag: boolean;
  bandText: string;
}

const BAND_TEXT: Record<EpdsBand, string> = {
  low: 'Your score is in the lower range. This is a screening tool, not a diagnosis — if you have any concerns about how you are feeling, please talk to your healthcare provider.',
  possible:
    'Your score suggests you may be experiencing some symptoms of postnatal depression. Please share this result with your healthcare provider.',
  probable:
    'Your score suggests you may be experiencing symptoms of postnatal depression. Please contact your healthcare provider soon to talk about how you are feeling.',
};

export function scoreEpds(responses: number[]): EpdsResult {
  if (responses.length !== 10) {
    throw new Error('EPDS requires exactly 10 responses');
  }
  for (const v of responses) {
    if (!Number.isInteger(v) || v < 0 || v > 3) {
      throw new Error('EPDS responses must be integers 0..3');
    }
  }
  const total = responses.reduce((sum, v) => sum + v, 0);
  const band: EpdsBand = total >= 13 ? 'probable' : total >= 10 ? 'possible' : 'low';
  const riskFlag = total >= 13 || responses[9] > 0;
  return { total, band, riskFlag, bandText: BAND_TEXT[band] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/postpartum/epds.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/postpartum/epds.ts src/domain/postpartum/epds.test.ts
git commit -m "feat(postpartum): EPDS instrument and crisis-aware scorer"
```

---

### Task 3: Postpartum types & lifecycle (`lifecycle.ts`)

**Files:**
- Modify: `src/domain/types.ts` (add `'postpartum'` to `LifeStage`; add postpartum types; add `lochia?` to `DailyLog`; add `EpdsEntry`)
- Create: `src/domain/postpartum/lifecycle.ts`
- Test: `src/domain/postpartum/lifecycle.test.ts`

**Interfaces:**
- Produces (types.ts):
  ```ts
  export type LifeStage = 'cycle' | 'ttc' | 'pregnancy' | 'postpartum' | 'menopause';
  export type PostpartumStatus = 'active' | 'ended';
  export type PostpartumReturnTo = 'cycle' | 'ttc';
  export interface PostpartumProfile {
    id: 'current';
    birthDate: ISODate;
    startedAt: ISODate;
    breastfeeding?: boolean;
    status: PostpartumStatus;
    endDate?: ISODate;
    returnedTo?: PostpartumReturnTo;
  }
  export interface EpdsEntry {
    id: string;
    date: ISODate;
    responses: number[];
    total: number;
    band: 'low' | 'possible' | 'probable';
  }
  // DailyLog gains: lochia?: FlowIntensity;
  ```
- Produces (lifecycle.ts):
  - `startPostpartum(input: { birthDate: ISODate; today: ISODate; breastfeeding?: boolean }): PostpartumProfile`
  - `setBreastfeeding(p: PostpartumProfile, value: boolean): PostpartumProfile`
  - `editBirthDate(p: PostpartumProfile, birthDate: ISODate): PostpartumProfile`
  - `endPostpartum(p: PostpartumProfile, opts: { returnTo: PostpartumReturnTo; endDate: ISODate }): PostpartumProfile`

- [ ] **Step 1: Add the types**

In `src/domain/types.ts`, change the `LifeStage` line to include `'postpartum'`:

```ts
export type LifeStage = 'cycle' | 'ttc' | 'pregnancy' | 'postpartum' | 'menopause';
```

Add `lochia?: FlowIntensity;` to the `DailyLog` interface, just after the `intercourseProtected?` field:

```ts
  intercourseProtected?: boolean;
  // Postpartum (Phase 5) — bleeding after birth; kept separate from `flow`
  // so it never feeds cycle stats or predictions.
  lochia?: FlowIntensity;
```

Append the postpartum types at the end of the file:

```ts
export type PostpartumStatus = 'active' | 'ended';
export type PostpartumReturnTo = 'cycle' | 'ttc';

export interface PostpartumProfile {
  id: 'current'; // singleton key
  birthDate: ISODate;
  startedAt: ISODate;
  breastfeeding?: boolean; // content/education only — never a prediction input
  status: PostpartumStatus;
  endDate?: ISODate;
  returnedTo?: PostpartumReturnTo;
}

export interface EpdsEntry {
  id: string;
  date: ISODate;
  responses: number[]; // the 10 raw 0–3 values
  total: number;
  band: 'low' | 'possible' | 'probable';
}
```

- [ ] **Step 2: Write the failing test**

```ts
// src/domain/postpartum/lifecycle.test.ts
import { describe, it, expect } from 'vitest';
import { startPostpartum, setBreastfeeding, editBirthDate, endPostpartum } from './lifecycle';

describe('startPostpartum', () => {
  it('creates an active profile anchored to the birth date', () => {
    const p = startPostpartum({ birthDate: '2026-06-01', today: '2026-06-02', breastfeeding: true });
    expect(p).toMatchObject({
      id: 'current',
      birthDate: '2026-06-01',
      startedAt: '2026-06-02',
      breastfeeding: true,
      status: 'active',
    });
  });
});

describe('mutations', () => {
  const base = startPostpartum({ birthDate: '2026-06-01', today: '2026-06-02' });
  it('toggles breastfeeding', () => {
    expect(setBreastfeeding(base, true).breastfeeding).toBe(true);
  });
  it('edits the birth date', () => {
    expect(editBirthDate(base, '2026-05-30').birthDate).toBe('2026-05-30');
  });
  it('ends and records where the user returned to', () => {
    const p = endPostpartum(base, { returnTo: 'cycle', endDate: '2026-09-01' });
    expect(p.status).toBe('ended');
    expect(p.returnedTo).toBe('cycle');
    expect(p.endDate).toBe('2026-09-01');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/domain/postpartum/lifecycle.test.ts`
Expected: FAIL — cannot find module `./lifecycle`.

- [ ] **Step 4: Write minimal implementation**

```ts
// src/domain/postpartum/lifecycle.ts
import type {
  ISODate,
  PostpartumProfile,
  PostpartumReturnTo,
} from '@/src/domain/types';

export function startPostpartum(input: {
  birthDate: ISODate;
  today: ISODate;
  breastfeeding?: boolean;
}): PostpartumProfile {
  return {
    id: 'current',
    birthDate: input.birthDate,
    startedAt: input.today,
    breastfeeding: input.breastfeeding,
    status: 'active',
  };
}

export function setBreastfeeding(p: PostpartumProfile, value: boolean): PostpartumProfile {
  return { ...p, breastfeeding: value };
}

export function editBirthDate(p: PostpartumProfile, birthDate: ISODate): PostpartumProfile {
  return { ...p, birthDate };
}

export function endPostpartum(
  p: PostpartumProfile,
  opts: { returnTo: PostpartumReturnTo; endDate: ISODate },
): PostpartumProfile {
  return { ...p, status: 'ended', returnedTo: opts.returnTo, endDate: opts.endDate };
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run src/domain/postpartum/lifecycle.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/domain/postpartum/lifecycle.ts src/domain/postpartum/lifecycle.test.ts
git commit -m "feat(postpartum): profile/EPDS types and lifecycle transitions"
```

---

### Task 4: Recovery content (`weeks.ts`)

**Files:**
- Create: `src/domain/postpartum/weeks.ts`
- Test: `src/domain/postpartum/weeks.test.ts`

**Interfaces:**
- Produces:
  - `interface PostpartumWeekContent { week: number; focus: string; notes: string[] }`
  - `POSTPARTUM_WEEKS: PostpartumWeekContent[]` (weeks 1–12, contiguous).
  - `POSTPARTUM_SOURCES: string[]`
  - `postpartumWeekContent(week: number): PostpartumWeekContent` — clamps to 1..12 (weeks > 12 return the week-12 "and beyond" entry).

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/postpartum/weeks.test.ts
import { describe, it, expect } from 'vitest';
import { POSTPARTUM_WEEKS, postpartumWeekContent } from './weeks';

describe('POSTPARTUM_WEEKS', () => {
  it('covers weeks 1..12 contiguously', () => {
    expect(POSTPARTUM_WEEKS.map((w) => w.week)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const w of POSTPARTUM_WEEKS) expect(w.notes.length).toBeGreaterThan(0);
  });
});

describe('postpartumWeekContent', () => {
  it('returns the matching week', () => {
    expect(postpartumWeekContent(1).week).toBe(1);
    expect(postpartumWeekContent(6).week).toBe(6);
  });
  it('clamps below 1 and above 12', () => {
    expect(postpartumWeekContent(0).week).toBe(1);
    expect(postpartumWeekContent(40).week).toBe(12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/postpartum/weeks.test.ts`
Expected: FAIL — cannot find module `./weeks`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/postpartum/weeks.ts
export interface PostpartumWeekContent {
  week: number;
  focus: string;
  notes: string[];
}

// Mother-focused recovery content. Source-attributed at the dataset level
// (consistent with the content library and pregnancy weeks).
export const POSTPARTUM_SOURCES: string[] = [
  'NHS — Your body after the birth',
  'ACOG — Postpartum care and recovery',
  'Office on Women’s Health — Recovering from birth',
];

export const POSTPARTUM_WEEKS: PostpartumWeekContent[] = [
  {
    week: 1,
    focus: 'The first days',
    notes: [
      'Bleeding (lochia) is usually heaviest now and may include small clots.',
      'Afterpains — cramping as the uterus shrinks — are common, often while feeding.',
      'Rest whenever you can and accept help with everything else.',
    ],
  },
  {
    week: 2,
    focus: 'Early healing',
    notes: [
      'Lochia usually lightens and changes from red toward pink or brown.',
      'Perineal or C-section soreness is normal; keep the area clean as advised.',
      'Stay on top of any pain relief your provider recommended.',
    ],
  },
  {
    week: 3,
    focus: 'Settling in',
    notes: [
      'Bleeding continues to taper for most.',
      'Night sweats are common as pregnancy hormones fall.',
      'Gentle movement is fine — avoid pushing yourself.',
    ],
  },
  {
    week: 4,
    focus: 'One month',
    notes: [
      'Lochia has stopped for some by now; everyone is different.',
      'Emotional ups and downs are normal — persistent low mood is worth a check.',
      'Consider taking the mood check-in if you have not yet.',
    ],
  },
  {
    week: 5,
    focus: 'Building strength',
    notes: [
      'Gentle pelvic floor exercises can support recovery.',
      'Fatigue is expected; broken sleep adds up.',
      'Keep accepting help with chores and feeding.',
    ],
  },
  {
    week: 6,
    focus: 'Postnatal check',
    notes: [
      'Many providers offer a check around now — a good time to discuss recovery, mood, and contraception.',
      'Only return to exercise once your provider has cleared you.',
      'Bleeding should be near or fully finished for most.',
    ],
  },
  {
    week: 7,
    focus: 'Finding a rhythm',
    notes: [
      'Sleep is still broken for most — short rests count.',
      'Keep an eye on your mood and reach out if things feel heavy.',
      'There is no prize for doing it all alone.',
    ],
  },
  {
    week: 8,
    focus: 'Two months',
    notes: [
      'Energy may slowly start to improve.',
      'Pelvic floor and gentle core work can continue.',
      'Tell your provider if bleeding has returned or never stopped.',
    ],
  },
  {
    week: 9,
    focus: 'Adjusting',
    notes: [
      'Hair shedding can begin around now and is normal and temporary.',
      'Keep hydrated, especially if breastfeeding.',
      'Be patient with your body — recovery is not linear.',
    ],
  },
  {
    week: 10,
    focus: 'Steadier days',
    notes: [
      'Many people feel more like themselves around now.',
      'Persistent low mood, anxiety, or intrusive thoughts deserve professional support.',
      'Asking for help is a strength, not a failure.',
    ],
  },
  {
    week: 11,
    focus: 'Looking after you',
    notes: [
      'Make space for your own rest, food, and support.',
      'Recovery is not only physical — your mental health matters just as much.',
      'Reconnect with people and activities that restore you.',
    ],
  },
  {
    week: 12,
    focus: 'Three months and beyond',
    notes: [
      'Recovery continues well past now for many people.',
      'Your cycle may or may not have returned — breastfeeding can delay it, and there is no set timeline.',
      'Check in with your provider with any concerns, whenever they come up.',
    ],
  },
];

const MIN_WEEK = POSTPARTUM_WEEKS[0].week; // 1
const MAX_WEEK = POSTPARTUM_WEEKS[POSTPARTUM_WEEKS.length - 1].week; // 12

export function postpartumWeekContent(week: number): PostpartumWeekContent {
  const clamped = Math.min(MAX_WEEK, Math.max(MIN_WEEK, Math.round(week)));
  return POSTPARTUM_WEEKS[clamped - MIN_WEEK];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/postpartum/weeks.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/postpartum/weeks.ts src/domain/postpartum/weeks.test.ts
git commit -m "feat(postpartum): weekly recovery content dataset and accessor"
```

---

### Task 5: Dexie v3 + repository CRUD

**Files:**
- Modify: `src/data/db.ts` (add `version(3)`, declare two tables)
- Modify: `src/data/repository.ts` (CRUD for postpartum profile + EPDS entries)
- Test: `src/data/repository.postpartum.test.ts`

**Interfaces:**
- Consumes: `PostpartumProfile`, `EpdsEntry` from types.
- Produces (repository.ts):
  - `getPostpartumProfile(): Promise<PostpartumProfile | undefined>`
  - `savePostpartumProfile(p: PostpartumProfile): Promise<void>`
  - `deletePostpartumProfile(): Promise<void>`
  - `addEpdsEntry(e: EpdsEntry): Promise<void>`
  - `getEpdsEntries(): Promise<EpdsEntry[]>` — sorted by `date` desc.

- [ ] **Step 1: Add the Dexie v3 schema**

In `src/data/db.ts`, add the two imports to the existing type import block (`PostpartumProfile`, `EpdsEntry`), declare the tables on the class, and append a `version(3)`:

```ts
// add to the type imports:
  PostpartumProfile,
  EpdsEntry,
```
```ts
// add to the class field declarations:
  postpartumProfile!: Table<PostpartumProfile, string>;
  epdsEntries!: Table<EpdsEntry, string>;
```
```ts
// add after the existing this.version(2).stores({...}) block:
    this.version(3).stores({
      cycles: 'id, startDate',
      dailyLogs: 'date',
      pregnancyProfile: 'id',
      kickSessions: 'id, date',
      contractionSessions: 'id, date',
      postpartumProfile: 'id',
      epdsEntries: 'id, date',
    });
```

- [ ] **Step 2: Write the failing test**

```ts
// src/data/repository.postpartum.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import {
  savePostpartumProfile,
  getPostpartumProfile,
  deletePostpartumProfile,
  addEpdsEntry,
  getEpdsEntries,
} from './repository';
import type { PostpartumProfile, EpdsEntry } from '@/src/domain/types';

const profile: PostpartumProfile = {
  id: 'current',
  birthDate: '2026-06-01',
  startedAt: '2026-06-01',
  status: 'active',
};

beforeEach(async () => {
  await db.postpartumProfile.clear();
  await db.epdsEntries.clear();
});

describe('postpartum profile repo', () => {
  it('saves, reads, and deletes the singleton', async () => {
    await savePostpartumProfile(profile);
    expect(await getPostpartumProfile()).toMatchObject({ birthDate: '2026-06-01' });
    await deletePostpartumProfile();
    expect(await getPostpartumProfile()).toBeUndefined();
  });
});

describe('EPDS entries repo', () => {
  it('stores entries and returns them newest-first', async () => {
    const a: EpdsEntry = { id: 'a', date: '2026-06-10', responses: Array(10).fill(0), total: 0, band: 'low' };
    const b: EpdsEntry = { id: 'b', date: '2026-06-20', responses: Array(10).fill(1), total: 10, band: 'possible' };
    await addEpdsEntry(a);
    await addEpdsEntry(b);
    expect((await getEpdsEntries()).map((e) => e.id)).toEqual(['b', 'a']);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/data/repository.postpartum.test.ts`
Expected: FAIL — exports do not exist.

- [ ] **Step 4: Implement repository functions**

In `src/data/repository.ts`, add `PostpartumProfile, EpdsEntry` to the type imports, then append:

```ts
export async function getPostpartumProfile(): Promise<PostpartumProfile | undefined> {
  return db.postpartumProfile.get('current');
}

export async function savePostpartumProfile(p: PostpartumProfile): Promise<void> {
  await db.postpartumProfile.put(p);
}

export async function deletePostpartumProfile(): Promise<void> {
  await db.postpartumProfile.delete('current');
}

export async function addEpdsEntry(e: EpdsEntry): Promise<void> {
  await db.epdsEntries.put(e);
}

export async function getEpdsEntries(): Promise<EpdsEntry[]> {
  const all = await db.epdsEntries.toArray();
  return all.sort((a, b) => b.date.localeCompare(a.date));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/repository.postpartum.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/db.ts src/data/repository.ts src/data/repository.postpartum.test.ts
git commit -m "feat(postpartum): Dexie v3 tables and repository CRUD"
```

---

### Task 6: Export & hard-delete coverage

**Files:**
- Modify: `src/data/export.ts` (bump to version 3, include new tables)
- Modify: `src/data/repository.ts` (`exportAll` + `deleteAll` include new tables)
- Test: `src/data/export.test.ts` (extend), `src/data/repository.postpartum.test.ts` (extend)

**Interfaces:**
- Consumes: `getPostpartumProfile`, `getEpdsEntries` (Task 5).
- Produces: `buildExportBlob` payload gains `postpartumProfile` and `epdsEntries`; `exportAll` returns them; `deleteAll` clears both tables.

- [ ] **Step 1: Write the failing test (export blob)**

Add to `src/data/export.test.ts`:

```ts
import type { PostpartumProfile, EpdsEntry } from '@/src/domain/types';

it('includes postpartum profile and EPDS entries at version 3', () => {
  const profile: PostpartumProfile = {
    id: 'current', birthDate: '2026-06-01', startedAt: '2026-06-01', status: 'active',
  };
  const epds: EpdsEntry[] = [
    { id: 'a', date: '2026-06-10', responses: Array(10).fill(0), total: 0, band: 'low' },
  ];
  const { json } = buildExportBlob({ cycles: [], dailyLogs: [], postpartumProfile: profile, epdsEntries: epds });
  const parsed = JSON.parse(json);
  expect(parsed.version).toBe(3);
  expect(parsed.postpartumProfile).toMatchObject({ birthDate: '2026-06-01' });
  expect(parsed.epdsEntries).toHaveLength(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/export.test.ts`
Expected: FAIL — `version` is 2 / new fields absent.

- [ ] **Step 3: Update `buildExportBlob`**

Replace the body of `buildExportBlob` in `src/data/export.ts` (add the two params and payload fields, bump version):

```ts
import type {
  Cycle,
  DailyLog,
  PregnancyProfile,
  KickSession,
  ContractionSession,
  PostpartumProfile,
  EpdsEntry,
} from '@/src/domain/types';
import { todayISO } from '@/src/domain/dates';

export function buildExportBlob(data: {
  cycles: Cycle[];
  dailyLogs: DailyLog[];
  pregnancyProfile?: PregnancyProfile | null;
  kickSessions?: KickSession[];
  contractionSessions?: ContractionSession[];
  postpartumProfile?: PostpartumProfile | null;
  epdsEntries?: EpdsEntry[];
}): { filename: string; json: string } {
  const payload = {
    version: 3 as const,
    exportedAt: new Date().toISOString(),
    cycles: data.cycles,
    dailyLogs: data.dailyLogs,
    pregnancyProfile: data.pregnancyProfile ?? null,
    kickSessions: data.kickSessions ?? [],
    contractionSessions: data.contractionSessions ?? [],
    postpartumProfile: data.postpartumProfile ?? null,
    epdsEntries: data.epdsEntries ?? [],
  };
  return {
    filename: `lumen-export-${todayISO()}.json`,
    json: JSON.stringify(payload, null, 2),
  };
}
```

- [ ] **Step 4: Update `exportAll` and `deleteAll`**

In `src/data/repository.ts`, extend `exportAll`'s return type and object with `postpartumProfile` and `epdsEntries`, and add the two `clear()` calls to `deleteAll`:

```ts
// exportAll return type additions:
  postpartumProfile: PostpartumProfile | null;
  epdsEntries: EpdsEntry[];
```
```ts
// exportAll return object additions:
    postpartumProfile: (await getPostpartumProfile()) ?? null,
    epdsEntries: await getEpdsEntries(),
```
```ts
// deleteAll additions:
  await db.postpartumProfile.clear();
  await db.epdsEntries.clear();
```

- [ ] **Step 5: Write the failing test (delete coverage)**

Add to `src/data/repository.postpartum.test.ts`:

```ts
import { deleteAll, exportAll } from './repository';

it('deleteAll clears postpartum tables; exportAll returns them', async () => {
  await savePostpartumProfile(profile);
  await addEpdsEntry({ id: 'a', date: '2026-06-10', responses: Array(10).fill(0), total: 0, band: 'low' });
  const dump = await exportAll();
  expect(dump.postpartumProfile).not.toBeNull();
  expect(dump.epdsEntries).toHaveLength(1);
  await deleteAll();
  expect(await getPostpartumProfile()).toBeUndefined();
  expect(await getEpdsEntries()).toHaveLength(0);
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/data/export.test.ts src/data/repository.postpartum.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/export.ts src/data/repository.ts src/data/export.test.ts src/data/repository.postpartum.test.ts
git commit -m "feat(postpartum): include recovery data in export and hard delete"
```

---

### Task 7: Hook — postpartum state, EPDS, and mutators

**Files:**
- Modify: `src/state/useHealthData.ts`
- Test: `src/state/useHealthData.postpartum.test.tsx`

**Interfaces:**
- Consumes: repository fns (Tasks 5–6), `startPostpartum`/`setBreastfeeding`/`editBirthDate`/`endPostpartum` (Task 3), `postpartumWeek`/`recoveryStage` (Task 1), `postpartumWeekContent` (Task 4), `scoreEpds` (Task 2), `setLifeStage` (preferences).
- Produces (added to the hook's return object):
  - `postpartumProfile: PostpartumProfile | null`
  - `isPostpartum: boolean` (`lifeStage === 'postpartum' && profile?.status === 'active'`)
  - `postpartumWeekNumber: number | null`, `recoveryStageToday: RecoveryStage | null`, `postpartumContentToday: PostpartumWeekContent | null`
  - `epdsEntries: EpdsEntry[]`, `latestEpds: EpdsEntry | null`
  - `saveEpdsCheckin(responses: number[]): Promise<void>`
  - `setPostpartumBreastfeeding(value: boolean): Promise<void>`
  - `updateBirthDate(birthDate: ISODate): Promise<void>`
  - `endPostpartumMode(returnTo: PostpartumReturnTo): Promise<void>`

- [ ] **Step 1: Wire imports, state, load, derived values, and mutators**

Add imports:

```ts
import {
  getPostpartumProfile,
  savePostpartumProfile,
  addEpdsEntry,
  getEpdsEntries,
} from '@/src/data/repository';
import {
  startPostpartum,
  setBreastfeeding,
  editBirthDate,
  endPostpartum,
} from '@/src/domain/postpartum/lifecycle';
import { postpartumWeek, recoveryStage, type RecoveryStage } from '@/src/domain/postpartum/recovery';
import { postpartumWeekContent, type PostpartumWeekContent } from '@/src/domain/postpartum/weeks';
import { scoreEpds } from '@/src/domain/postpartum/epds';
import type { PostpartumProfile, PostpartumReturnTo, EpdsEntry } from '@/src/domain/types';
```

Add state near the other `useState` calls:

```ts
const [postpartumProfile, setPostpartumProfile] = useState<PostpartumProfile | null>(null);
const [epdsEntries, setEpdsEntries] = useState<EpdsEntry[]>([]);
```

Extend `refresh()` to load both (add to the `Promise.all` and set state):

```ts
const [c, l, p, ks, cs, pp, ep] = await Promise.all([
  getCycles(),
  getAllDailyLogs(),
  getPregnancyProfile(),
  getKickSessions(),
  getContractionSessions(),
  getPostpartumProfile(),
  getEpdsEntries(),
]);
// ...existing setters...
setPostpartumProfile(pp ?? null);
setEpdsEntries(ep);
```

Add derived values (near the pregnancy derived block):

```ts
const isPostpartum = lifeStage === 'postpartum' && postpartumProfile?.status === 'active';

const postpartumWeekNumber: number | null = useMemo(
  () => (isPostpartum && postpartumProfile ? postpartumWeek(postpartumProfile.birthDate, todayISO()) : null),
  [isPostpartum, postpartumProfile],
);

const recoveryStageToday: RecoveryStage | null = useMemo(
  () => (isPostpartum && postpartumProfile ? recoveryStage(postpartumProfile.birthDate, todayISO()) : null),
  [isPostpartum, postpartumProfile],
);

const postpartumContentToday: PostpartumWeekContent | null = useMemo(
  () => (postpartumWeekNumber !== null ? postpartumWeekContent(postpartumWeekNumber) : null),
  [postpartumWeekNumber],
);

const latestEpds: EpdsEntry | null = epdsEntries[0] ?? null;
```

Add mutators (near the pregnancy mutators):

```ts
const saveEpdsCheckin = useCallback(
  async (responses: number[]) => {
    const result = scoreEpds(responses);
    await addEpdsEntry({
      id: newId(),
      date: todayISO(),
      responses,
      total: result.total,
      band: result.band,
    });
    await refresh();
  },
  [refresh],
);

const setPostpartumBreastfeeding = useCallback(
  async (value: boolean) => {
    if (!postpartumProfile) return;
    await savePostpartumProfile(setBreastfeeding(postpartumProfile, value));
    await refresh();
  },
  [postpartumProfile, refresh],
);

const updateBirthDate = useCallback(
  async (birthDate: ISODate) => {
    if (!postpartumProfile) return;
    await savePostpartumProfile(editBirthDate(postpartumProfile, birthDate));
    await refresh();
  },
  [postpartumProfile, refresh],
);

const endPostpartumMode = useCallback(
  async (returnTo: PostpartumReturnTo) => {
    if (!postpartumProfile) return;
    await savePostpartumProfile(endPostpartum(postpartumProfile, { returnTo, endDate: todayISO() }));
    setLifeStage(returnTo, todayISO());
    refreshSettings();
    await refresh();
  },
  [postpartumProfile, refresh, refreshSettings],
);
```

Add all the new names to the hook's returned object.

- [ ] **Step 2: Write the failing test**

```tsx
// src/state/useHealthData.postpartum.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { renderHook, act, waitFor } from '@testing-library/react';
import { db } from '@/src/data/db';
import { savePostpartumProfile } from '@/src/data/repository';
import { setLifeStage, clearPreferences } from '@/src/settings/preferences';
import { useHealthData } from './useHealthData';
import type { PostpartumProfile } from '@/src/domain/types';

const profile: PostpartumProfile = {
  id: 'current', birthDate: '2026-06-01', startedAt: '2026-06-01', status: 'active',
};

beforeEach(async () => {
  await db.delete();
  await db.open();
  clearPreferences();
});

describe('postpartum hook state', () => {
  it('derives recovery week and content in postpartum mode', async () => {
    await savePostpartumProfile(profile);
    setLifeStage('postpartum', '2026-06-08');
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isPostpartum).toBe(true);
    expect(result.current.postpartumWeekNumber).toBeGreaterThanOrEqual(1);
    expect(result.current.postpartumContentToday).not.toBeNull();
  });

  it('saves a scored EPDS check-in and exposes the latest', async () => {
    await savePostpartumProfile(profile);
    setLifeStage('postpartum', '2026-06-08');
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.saveEpdsCheckin([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    });
    expect(result.current.latestEpds?.total).toBe(10);
    expect(result.current.latestEpds?.band).toBe('possible');
  });

  it('endPostpartumMode switches life stage and ends the profile', async () => {
    await savePostpartumProfile(profile);
    setLifeStage('postpartum', '2026-06-08');
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.endPostpartumMode('cycle');
    });
    expect(result.current.lifeStage).toBe('cycle');
    expect(result.current.isPostpartum).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails, then passes after Step 1 is complete**

Run: `npx vitest run src/state/useHealthData.postpartum.test.tsx`
Expected: PASS (this task implements Step 1 and the test together; if red, fix the wiring).

- [ ] **Step 4: Commit**

```bash
git add src/state/useHealthData.ts src/state/useHealthData.postpartum.test.tsx
git commit -m "feat(postpartum): hook state, EPDS check-in, and exit mutators"
```

---

### Task 8: Birth → postpartum transition

**Files:**
- Modify: `src/state/useHealthData.ts` (`endPregnancyBirth` now enters postpartum)
- Test: `src/state/useHealthData.postpartum.test.tsx` (extend); update `src/state/useHealthData.pregnancy.test.tsx` if it asserts the old `cycle` outcome.

**Interfaces:**
- Consumes: `endByBirth` (pregnancy lifecycle, unchanged), `startPostpartum`, `savePostpartumProfile`, `setLifeStage`.
- Produces: confirming birth sets `lifeStage = 'postpartum'` with a fresh active `PostpartumProfile` whose `birthDate = endDate`. The loss path (`endPregnancyLoss`) is unchanged (still returns to `cycle`).

- [ ] **Step 1: Update `endPregnancyBirth`**

Replace the body of `endPregnancyBirth` in `src/state/useHealthData.ts`:

```ts
const endPregnancyBirth = useCallback(
  async (endDate: ISODate) => {
    if (!pregnancyProfile) return;
    await savePregnancyProfile(endByBirth(pregnancyProfile, endDate));
    await savePostpartumProfile(startPostpartum({ birthDate: endDate, today: todayISO() }));
    setLifeStage('postpartum', todayISO());
    refreshSettings();
    await refresh();
  },
  [pregnancyProfile, refresh, refreshSettings],
);
```

- [ ] **Step 2: Write the failing test**

Add to `src/state/useHealthData.postpartum.test.tsx`:

```tsx
import { savePregnancyProfile } from '@/src/data/repository';
import type { PregnancyProfile } from '@/src/domain/types';

it('confirming birth enters postpartum mode with a profile', async () => {
  const preg: PregnancyProfile = {
    id: 'current', dueDate: '2026-10-08', lmp: '2026-01-01',
    dueDateSource: 'lmp', startedAt: '2026-01-10', status: 'active',
  };
  await savePregnancyProfile(preg);
  setLifeStage('pregnancy', '2026-06-08');
  const { result } = renderHook(() => useHealthData());
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    await result.current.endPregnancyBirth('2026-06-20');
  });
  expect(result.current.lifeStage).toBe('postpartum');
  expect(result.current.isPostpartum).toBe(true);
  expect(result.current.postpartumProfile?.birthDate).toBe('2026-06-20');
});
```

- [ ] **Step 3: Reconcile the existing pregnancy hook test**

Run: `npx vitest run src/state/useHealthData.pregnancy.test.tsx`
If any assertion expects `lifeStage === 'cycle'` after `endPregnancyBirth`, update it to expect `'postpartum'`. (The loss-path assertions stay as `'cycle'` — do not change those.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/state/useHealthData.postpartum.test.tsx src/state/useHealthData.pregnancy.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/useHealthData.ts src/state/useHealthData.postpartum.test.tsx src/state/useHealthData.pregnancy.test.tsx
git commit -m "feat(postpartum): enter postpartum mode when birth is confirmed"
```

---

### Task 9: PostpartumCard (home/hub summary)

**Files:**
- Create: `src/components/PostpartumCard.tsx`
- Test: `src/components/PostpartumCard.test.tsx`

**Interfaces:**
- Produces: `PostpartumCard({ week, stage, latestBand })` where `week: number`, `stage: RecoveryStage`, `latestBand: EpdsBand | null`. Pure presentational (props in, no hook) — mirrors `PregnancyCard`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/PostpartumCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostpartumCard } from './PostpartumCard';

describe('PostpartumCard', () => {
  it('shows the recovery week', () => {
    render(<PostpartumCard week={3} stage="acute" latestBand={null} />);
    expect(screen.getByText(/week 3/i)).toBeInTheDocument();
  });
  it('shows the latest EPDS band when present', () => {
    render(<PostpartumCard week={5} stage="acute" latestBand="possible" />);
    expect(screen.getByText(/check-in/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PostpartumCard.test.tsx`
Expected: FAIL — cannot find module `./PostpartumCard`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/PostpartumCard.tsx
import type { RecoveryStage } from '@/src/domain/postpartum/recovery';
import type { EpdsBand } from '@/src/domain/postpartum/epds';

const STAGE_LABEL: Record<RecoveryStage, string> = {
  acute: 'Early recovery',
  extended: 'Recovering',
  ongoing: 'Ongoing recovery',
};

const BAND_LABEL: Record<EpdsBand, string> = {
  low: 'lower range',
  possible: 'some symptoms — worth sharing with your provider',
  probable: 'please reach out to your provider',
};

export function PostpartumCard({
  week,
  stage,
  latestBand,
}: {
  week: number;
  stage: RecoveryStage;
  latestBand: EpdsBand | null;
}) {
  return (
    <section className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-4">
      <h2 className="text-base font-semibold">Postpartum · week {week}</h2>
      <p className="text-sm text-neutral-700">{STAGE_LABEL[stage]}</p>
      {latestBand && (
        <p className="text-sm text-neutral-700">
          Last mood check-in: <span className="font-medium">{BAND_LABEL[latestBand]}</span>.
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/PostpartumCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PostpartumCard.tsx src/components/PostpartumCard.test.tsx
git commit -m "feat(postpartum): PostpartumCard summary component"
```

---

### Task 10: EPDS check-in component

**Files:**
- Create: `src/components/EpdsCheckin.tsx`
- Test: `src/components/EpdsCheckin.test.tsx`

**Interfaces:**
- Consumes: `EPDS_QUESTIONS`, `EPDS_SOURCE`, `scoreEpds` (Task 2), `useHealthData().saveEpdsCheckin` (Task 7).
- Produces: a `'use client'` component that renders 10 questions (radio per option), a non-diagnostic intro, a Submit that computes the result locally for display and persists via `saveEpdsCheckin`, the result band + `bandText` + "share with your provider", and — when `riskFlag` — a prominent region-agnostic crisis-support block. Submit is disabled until all 10 are answered.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/EpdsCheckin.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EpdsCheckin } from './EpdsCheckin';

const saveEpdsCheckin = vi.fn();
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({ saveEpdsCheckin }),
}));

beforeEach(() => saveEpdsCheckin.mockReset());

function answerAll(value: number) {
  // each question group has 4 radios; pick the option whose label maps to `value`
  const groups = screen.getAllByRole('radiogroup');
  for (const g of groups) {
    const radios = within(g).getAllByRole('radio');
    fireEvent.click(radios[value]); // option index, not score — see note
  }
}

import { within } from '@testing-library/react';

describe('EpdsCheckin', () => {
  it('keeps submit disabled until all questions are answered', () => {
    render(<EpdsCheckin />);
    expect(screen.getByRole('button', { name: /see my result/i })).toBeDisabled();
  });

  it('shows the crisis block when the self-harm item is non-zero', () => {
    render(<EpdsCheckin />);
    const groups = screen.getAllByRole('radiogroup');
    groups.forEach((g, i) => {
      const radios = within(g).getAllByRole('radio');
      // answer "best" option for items 1-9, and a non-zero option for item 10
      fireEvent.click(i === 9 ? radios[0] : radios[radios.length - 1]);
      // note: item layouts differ; this drives at least one self-harm > 0
    });
    fireEvent.click(screen.getByRole('button', { name: /see my result/i }));
    expect(saveEpdsCheckin).toHaveBeenCalled();
    expect(screen.getByText(/support is available|crisis|emergency/i)).toBeInTheDocument();
  });
});
```

> Implementer note: render each question's options in their declared order and use each option's **value** to build the responses array. The test clicks by option position; ensure option order matches `EPDS_QUESTIONS`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/EpdsCheckin.test.tsx`
Expected: FAIL — cannot find module `./EpdsCheckin`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/EpdsCheckin.tsx
'use client';

import { useState } from 'react';
import { EPDS_QUESTIONS, EPDS_SOURCE, scoreEpds, type EpdsResult } from '@/src/domain/postpartum/epds';
import { useHealthData } from '@/src/state/useHealthData';

export function EpdsCheckin() {
  const { saveEpdsCheckin } = useHealthData();
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [result, setResult] = useState<EpdsResult | null>(null);

  const complete = answers.every((a) => a !== null);

  function choose(qi: number, value: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qi] = value;
      return next;
    });
  }

  async function submit() {
    if (!complete) return;
    const responses = answers as number[];
    const r = scoreEpds(responses);
    setResult(r);
    await saveEpdsCheckin(responses);
  }

  if (result) {
    return (
      <div className="space-y-4">
        <section className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="text-base font-semibold">Your check-in</h2>
          <p className="text-sm text-neutral-700">Score: {result.total} / 30</p>
          <p className="text-sm text-neutral-700">{result.bandText}</p>
          <p className="text-xs text-neutral-500">
            This is a screening tool, not a diagnosis. Please share your result with your healthcare provider.
          </p>
        </section>

        {result.riskFlag && (
          <section className="space-y-2 rounded-md border border-rose-300 bg-rose-50 p-4">
            <h3 className="text-sm font-semibold text-rose-800">Support is available</h3>
            <p className="text-sm text-neutral-700">
              You do not have to go through this alone. If you are in danger or thinking of harming
              yourself, please reach out right now.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
              <li>Contact your healthcare provider as soon as you can.</li>
              <li>Call a crisis or mental-health support line in your area.</li>
              <li>If you are in immediate danger, contact your local emergency services.</li>
            </ul>
          </section>
        )}

        <p className="text-[11px] text-neutral-500">Source: {EPDS_SOURCE}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-700">
        This short check-in asks how you have felt in the past 7 days. It is a screening tool, not a
        diagnosis. Answer the option closest to how you have been feeling.
      </p>

      {EPDS_QUESTIONS.map((q, qi) => (
        <fieldset key={q.prompt} role="radiogroup" aria-label={q.prompt} className="space-y-2">
          <legend className="text-sm font-medium">{q.prompt}</legend>
          {q.options.map((o) => (
            <label key={o.label} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`epds-${qi}`}
                checked={answers[qi] === o.value}
                onChange={() => choose(qi, o.value)}
              />
              {o.label}
            </label>
          ))}
        </fieldset>
      ))}

      <button
        type="button"
        onClick={submit}
        disabled={!complete}
        className="w-full rounded-md bg-rose-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        See my result
      </button>
    </div>
  );
}
```

> Note on the test's radio indexing: because `checked` is keyed by `o.value` and options render in declared order, clicking the last radio of items 1–9 and a non-last radio of item 10 produces a non-zero self-harm value, tripping `riskFlag`. If the test's option-position logic does not reliably produce `responses[9] > 0`, adjust the test to click item 10's first option (value 3) explicitly.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/EpdsCheckin.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/EpdsCheckin.tsx src/components/EpdsCheckin.test.tsx
git commit -m "feat(postpartum): EPDS check-in component with crisis-aware result"
```

---

### Task 11: PostpartumView + routes

**Files:**
- Create: `src/components/PostpartumView.tsx`
- Create: `app/postpartum/page.tsx`
- Create: `app/postpartum/checkin/page.tsx`
- Test: `src/components/PostpartumView.test.tsx`

**Interfaces:**
- Consumes: `useHealthData` (postpartum fields), `PostpartumCard` (Task 9), `POSTPARTUM_SOURCES` (Task 4).
- Produces: `PostpartumView` — guards to `/` when not postpartum (mirrors `PregnancyView`); shows the card, this-week recovery notes, a breastfeeding-aware cycle-return note, links to the check-in / logging / settings. Two thin route files render the view and the check-in.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/PostpartumView.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostpartumView } from './PostpartumView';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({
    loading: false,
    isPostpartum: true,
    postpartumWeekNumber: 3,
    recoveryStageToday: 'acute',
    postpartumContentToday: { week: 3, focus: 'Settling in', notes: ['Rest when you can.'] },
    latestEpds: null,
  }),
}));

describe('PostpartumView', () => {
  it('renders the recovery week and content', () => {
    render(<PostpartumView />);
    expect(screen.getByText(/week 3/i)).toBeInTheDocument();
    expect(screen.getByText(/rest when you can/i)).toBeInTheDocument();
  });
  it('links to the mood check-in', () => {
    render(<PostpartumView />);
    expect(screen.getByRole('link', { name: /check-in/i })).toHaveAttribute('href', '/postpartum/checkin');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PostpartumView.test.tsx`
Expected: FAIL — cannot find module `./PostpartumView`.

- [ ] **Step 3: Write the view and routes**

```tsx
// src/components/PostpartumView.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHealthData } from '@/src/state/useHealthData';
import { PostpartumCard } from '@/src/components/PostpartumCard';
import { POSTPARTUM_SOURCES } from '@/src/domain/postpartum/weeks';

export function PostpartumView() {
  const router = useRouter();
  const {
    loading, isPostpartum, postpartumWeekNumber, recoveryStageToday,
    postpartumContentToday, latestEpds,
  } = useHealthData();

  useEffect(() => {
    if (!loading && !isPostpartum) router.replace('/');
  }, [loading, isPostpartum, router]);

  if (loading) return <main className="p-6">Loading…</main>;
  if (!isPostpartum || postpartumWeekNumber === null || !recoveryStageToday || !postpartumContentToday) {
    return <main className="p-6">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <PostpartumCard
        week={postpartumWeekNumber}
        stage={recoveryStageToday}
        latestBand={latestEpds?.band ?? null}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-600">{postpartumContentToday.focus}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
          {postpartumContentToday.notes.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-md border border-neutral-200 p-3">
        <h2 className="text-sm font-medium text-neutral-600">When your cycle returns</h2>
        <p className="text-sm text-neutral-700">
          Your periods may take weeks or many months to return, and breastfeeding can delay them.
          Lumen will not guess a date. When your period comes back, you can switch back to cycle
          tracking from Settings.
        </p>
      </section>

      <nav className="grid grid-cols-2 gap-3 text-center text-sm">
        <Link href="/postpartum/checkin" className="rounded-md border px-4 py-3">
          Mood check-in
        </Link>
        <Link href="/log" className="rounded-md border px-4 py-3">
          Log recovery
        </Link>
        <Link href="/settings" className="rounded-md border px-4 py-3">
          Manage postpartum
        </Link>
      </nav>

      <section className="space-y-1">
        <h2 className="text-sm font-medium text-neutral-600">Sources</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-neutral-500">
          {POSTPARTUM_SOURCES.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <p className="text-[11px] text-neutral-500">
        Educational information only — not a substitute for medical advice. Contact your provider
        with any concerns.
      </p>
    </main>
  );
}
```

```tsx
// app/postpartum/page.tsx
import { PostpartumView } from '@/src/components/PostpartumView';

export default function PostpartumPage() {
  return <PostpartumView />;
}
```

```tsx
// app/postpartum/checkin/page.tsx
import { EpdsCheckin } from '@/src/components/EpdsCheckin';

export default function PostpartumCheckinPage() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">Mood check-in</h1>
      <EpdsCheckin />
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/PostpartumView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PostpartumView.tsx app/postpartum/page.tsx app/postpartum/checkin/page.tsx src/components/PostpartumView.test.tsx
git commit -m "feat(postpartum): hub view and check-in routes"
```

---

### Task 12: PostpartumControls (settings)

**Files:**
- Create: `src/components/PostpartumControls.tsx`
- Modify: `app/settings/page.tsx` (add a Postpartum section that renders it)
- Test: `src/components/PostpartumControls.test.tsx`

**Interfaces:**
- Consumes: `useHealthData` (`isPostpartum`, `postpartumProfile`, `epdsEntries`, `setPostpartumBreastfeeding`, `updateBirthDate`, `endPostpartumMode`).
- Produces: when postpartum is active — a breastfeeding toggle, edit-birth-date input, EPDS history list, and an "End postpartum mode" flow offering return to cycle or TTC. When not active, render nothing (postpartum is entered only via birth, never started manually here).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/PostpartumControls.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostpartumControls } from './PostpartumControls';

const endPostpartumMode = vi.fn();
const setPostpartumBreastfeeding = vi.fn();
const updateBirthDate = vi.fn();

vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({
    isPostpartum: true,
    postpartumProfile: { id: 'current', birthDate: '2026-06-01', startedAt: '2026-06-01', status: 'active', breastfeeding: false },
    epdsEntries: [{ id: 'a', date: '2026-06-10', responses: Array(10).fill(1), total: 10, band: 'possible' }],
    setPostpartumBreastfeeding, updateBirthDate, endPostpartumMode,
  }),
}));

beforeEach(() => { endPostpartumMode.mockReset(); });

describe('PostpartumControls', () => {
  it('lists EPDS history', () => {
    render(<PostpartumControls />);
    expect(screen.getByText(/10 \/ 30/)).toBeInTheDocument();
  });
  it('ends postpartum mode returning to cycle', () => {
    render(<PostpartumControls />);
    fireEvent.click(screen.getByRole('button', { name: /end postpartum/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to cycle tracking/i }));
    expect(endPostpartumMode).toHaveBeenCalledWith('cycle');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PostpartumControls.test.tsx`
Expected: FAIL — cannot find module `./PostpartumControls`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/PostpartumControls.tsx
'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';

export function PostpartumControls() {
  const {
    isPostpartum, postpartumProfile, epdsEntries,
    setPostpartumBreastfeeding, updateBirthDate, endPostpartumMode,
  } = useHealthData();
  const [editBirth, setEditBirth] = useState('');
  const [ending, setEnding] = useState(false);

  if (!isPostpartum || !postpartumProfile) return null;

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={postpartumProfile.breastfeeding ?? false}
          onChange={(e) => setPostpartumBreastfeeding(e.target.checked)}
        />
        I am breastfeeding
      </label>

      <div className="flex items-end gap-2">
        <label className="flex-1 text-sm">
          Edit birth date
          <input
            type="date"
            aria-label="edit birth date"
            value={editBirth}
            onChange={(e) => setEditBirth(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={() => editBirth && updateBirthDate(editBirth)}
          className="rounded-md border px-4 py-2 text-sm"
        >
          Save
        </button>
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-medium text-neutral-600">Mood check-in history</h3>
        {epdsEntries.length === 0 ? (
          <p className="text-sm text-neutral-500">No check-ins yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-neutral-700">
            {epdsEntries.map((e) => (
              <li key={e.id}>
                {e.date} — {e.total} / 30 ({e.band})
              </li>
            ))}
          </ul>
        )}
      </div>

      {!ending ? (
        <button
          type="button"
          onClick={() => setEnding(true)}
          className="w-full rounded-md border px-4 py-2 text-sm text-neutral-700"
        >
          End postpartum mode
        </button>
      ) : (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm text-neutral-700">Where would you like to go next?</p>
          <button
            type="button"
            onClick={() => endPostpartumMode('cycle')}
            className="w-full rounded-md border px-4 py-2 text-sm"
          >
            Back to cycle tracking
          </button>
          <button
            type="button"
            onClick={() => endPostpartumMode('ttc')}
            className="w-full rounded-md border px-4 py-2 text-sm"
          >
            Start trying to conceive
          </button>
          <button
            type="button"
            onClick={() => setEnding(false)}
            className="w-full rounded-md px-4 py-2 text-sm text-neutral-500"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
```

In `app/settings/page.tsx`, import `PostpartumControls` and add a section after the Pregnancy section:

```tsx
import { PostpartumControls } from '@/src/components/PostpartumControls';
```
```tsx
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600">Postpartum</h2>
        <p className="text-xs text-neutral-500">
          After birth, Lumen supports your recovery with weekly guidance and a mood check-in.
          This section appears while postpartum mode is active.
        </p>
        <PostpartumControls />
      </section>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/PostpartumControls.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PostpartumControls.tsx app/settings/page.tsx src/components/PostpartumControls.test.tsx
git commit -m "feat(postpartum): settings controls for recovery, history, and exit"
```

---

### Task 13: PregnancyEndFlow birth-path copy

**Files:**
- Modify: `src/components/PregnancyEndFlow.tsx` (birth screen copy)
- Test: `src/components/PregnancyEndFlow.test.tsx` (extend/adjust)

**Interfaces:**
- No signature change — `endPregnancyBirth` already routes to postpartum (Task 8). Only the birth-screen copy changes to reflect entering a recovery space rather than "switch you back to cycle tracking." The loss screen is unchanged.

- [ ] **Step 1: Update the birth-screen copy**

In `src/components/PregnancyEndFlow.tsx`, replace the birth-screen paragraph:

```tsx
        <p className="text-sm text-neutral-700">
          Congratulations. We&apos;ll switch to postpartum mode to support your recovery — you can
          return to cycle tracking whenever you&apos;re ready.
        </p>
```

- [ ] **Step 2: Reconcile the existing test**

Run: `npx vitest run src/components/PregnancyEndFlow.test.tsx`
If a test asserts the old birth copy ("switch you back to cycle tracking"), update that assertion to match the new copy. Keep all loss-path assertions unchanged.

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/components/PregnancyEndFlow.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/PregnancyEndFlow.tsx src/components/PregnancyEndFlow.test.tsx
git commit -m "feat(postpartum): birth path now hands off to postpartum recovery"
```

---

### Task 14: DailyLogForm — postpartum group + lochia

**Files:**
- Modify: `src/domain/log-options.ts` (add postpartum symptom/mood arrays)
- Modify: `src/components/DailyLogForm.tsx` (postpartum branch: lochia replaces flow; postpartum symptoms/moods; save `lochia`, no cycle creation)
- Test: `src/components/DailyLogForm.postpartum.test.tsx`

**Interfaces:**
- Produces (log-options.ts):
  - `POSTPARTUM_SYMPTOM_OPTIONS: string[]`
  - `POSTPARTUM_MOOD_OPTIONS: string[]`
- Behavior: when `lifeStage === 'postpartum'`, the form hides the Flow section and shows a **Lochia** section (same `FLOW_OPTIONS` scale), uses postpartum symptom/mood catalogs, and on save writes `lochia` (not `flow`) and does **not** create or extend a `Cycle`.

- [ ] **Step 1: Add the option catalogs**

Append to `src/domain/log-options.ts`:

```ts
export const POSTPARTUM_SYMPTOM_OPTIONS: string[] = [
  'Afterpains',
  'Perineal pain',
  'C-section pain',
  'Breast pain',
  'Engorgement',
  'Sore nipples',
  'Night sweats',
  'Constipation',
  'Hemorrhoids',
  'Fatigue',
  'Back pain',
  'Hair loss',
];

export const POSTPARTUM_MOOD_OPTIONS: string[] = [
  'Happy',
  'Calm',
  'Bonding',
  'Anxious',
  'Overwhelmed',
  'Tearful',
  'Irritable',
  'Sad',
  'Numb',
  'Guilty',
];
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/DailyLogForm.postpartum.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DailyLogForm } from './DailyLogForm';

const saveLog = vi.fn();
const startPeriod = vi.fn();

vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({
    dailyLogs: [],
    saveLog,
    startPeriod,
    endPeriod: vi.fn(),
    cycles: [],
    lifeStage: 'postpartum',
    bbtUnit: 'C',
    isPregnant: false,
  }),
}));

beforeEach(() => { saveLog.mockReset(); startPeriod.mockReset(); });

describe('DailyLogForm postpartum', () => {
  it('shows a Lochia section and a postpartum symptom', () => {
    render(<DailyLogForm date="2026-06-10" />);
    expect(screen.getByText(/lochia/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Afterpains' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Flow' })).not.toBeInTheDocument();
  });

  it('saves lochia and never starts a cycle', async () => {
    render(<DailyLogForm date="2026-06-10" />);
    fireEvent.click(screen.getByRole('button', { name: 'medium' }));
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await screen.findByText(/saved/i);
    expect(saveLog).toHaveBeenCalledWith(expect.objectContaining({ lochia: 'medium' }));
    expect(startPeriod).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/DailyLogForm.postpartum.test.tsx`
Expected: FAIL — no Lochia section / `lochia` not saved.

- [ ] **Step 4: Implement the postpartum branch**

In `src/components/DailyLogForm.tsx`:

Add to the imports:

```ts
import {
  FLOW_OPTIONS,
  MOOD_OPTIONS,
  SYMPTOM_OPTIONS,
  PREGNANCY_SYMPTOM_OPTIONS,
  POSTPARTUM_SYMPTOM_OPTIONS,
  POSTPARTUM_MOOD_OPTIONS,
  MUCUS_OPTIONS,
  LH_OPTIONS,
} from '@/src/domain/log-options';
```

Add a `lochia` state and a postpartum flag near the other state:

```ts
const isPostpartum = lifeStage === 'postpartum';
const [lochia, setLochia] = useState<FlowIntensity>('none');
```

Choose the catalogs based on stage:

```ts
const symptomChoices = isPregnant
  ? Array.from(new Set([...SYMPTOM_OPTIONS, ...PREGNANCY_SYMPTOM_OPTIONS]))
  : isPostpartum
    ? POSTPARTUM_SYMPTOM_OPTIONS
    : SYMPTOM_OPTIONS;

const moodChoices = isPostpartum ? POSTPARTUM_MOOD_OPTIONS : MOOD_OPTIONS;
```

Hydrate `lochia` in the existing `useEffect` (add inside the `if (existing)` block):

```ts
setLochia(existing.lochia ?? 'none');
```

Replace the top of `handleSave` so postpartum writes `lochia` and skips cycle logic:

```ts
async function handleSave() {
  if (isPostpartum) {
    await saveLog({
      date,
      flow: 'none',
      lochia,
      symptoms,
      moods,
      notes: notes || undefined,
    });
    setSaved(true);
    return;
  }
  // ...existing non-postpartum body (BBT parsing, saveLog, cycle creation)...
}
```

In the JSX, render the Flow section only when not postpartum, and a Lochia section when postpartum. Replace the existing `<section>` for Flow with:

```tsx
{isPostpartum ? (
  <section>
    <h2 className="mb-2 text-sm font-medium">Lochia (bleeding)</h2>
    <div className="flex flex-wrap gap-2">
      {FLOW_OPTIONS.map((f) => (
        <Chip key={f} label={f} active={lochia === f} onClick={() => setLochia(f)} />
      ))}
    </div>
  </section>
) : (
  <section>
    <h2 className="mb-2 text-sm font-medium">Flow</h2>
    <div className="flex flex-wrap gap-2">
      {FLOW_OPTIONS.map((f) => (
        <Chip key={f} label={f} active={flow === f} onClick={() => setFlow(f)} />
      ))}
    </div>
  </section>
)}
```

Update the Mood section to use `moodChoices` instead of `MOOD_OPTIONS`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/DailyLogForm.postpartum.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/log-options.ts src/components/DailyLogForm.tsx src/components/DailyLogForm.postpartum.test.tsx
git commit -m "feat(postpartum): recovery logging with lochia and postpartum catalogs"
```

---

### Task 15: Home page wiring (card + nav)

**Files:**
- Modify: `app/page.tsx`
- Test: covered by existing home rendering + the manual verification in Task 16 (the home file is a thin composition; no new unit test required, but keep the existing home tests green).

**Interfaces:**
- Consumes: `isPostpartum`, `postpartumWeekNumber`, `recoveryStageToday`, `latestEpds` (Task 7), `PostpartumCard` (Task 9).
- Produces: home renders `PostpartumCard` when postpartum is active (in the same priority chain as the pregnancy/loss/cycle branch), suppresses cycle insight/daily-content while postpartum, and shows a `/postpartum` nav link.

- [ ] **Step 1: Add postpartum to the home composition**

In `app/page.tsx`:

Import the card and pull the postpartum fields from the hook:

```ts
import { PostpartumCard } from '@/src/components/PostpartumCard';
```
```ts
const {
  cycles, stats, prediction, insights, dailyContent, lifeStage,
  conceptionToday, ovulationConfirmation, loading,
  isPregnant, gestation, currentTrimester, daysToDue, weekContentToday,
  pregnancyProfile,
  isPostpartum, postpartumWeekNumber, recoveryStageToday, latestEpds,
} = useHealthData();
```

Add a postpartum branch to the hero selection (before the `endedByLoss` branch):

```tsx
{isPostpartum && postpartumWeekNumber !== null && recoveryStageToday ? (
  <PostpartumCard
    week={postpartumWeekNumber}
    stage={recoveryStageToday}
    latestBand={latestEpds?.band ?? null}
  />
) : isPregnant && gestation && currentTrimester && daysToDue !== null && weekContentToday ? (
  <PregnancyCard
    gestation={gestation}
    trimester={currentTrimester}
    daysToDue={daysToDue}
    week={weekContentToday}
  />
) : endedByLoss ? (
  <PostLossCard />
) : (
  <CycleSummary
    prediction={prediction}
    stats={stats}
    lastPeriodStart={lastPeriodStart}
    today={todayISO()}
  />
)}
```

Suppress cycle-stage content while postpartum (same rationale as pregnancy) — change the two guards:

```tsx
{!isPregnant && !isPostpartum && highlight && <InsightCard insight={highlight} />}
```
```tsx
{!isPregnant && !isPostpartum && <DailyContentCard article={dailyContent} />}
```

Add the nav link (after the pregnancy nav link):

```tsx
{isPostpartum && (
  <Link href="/postpartum" className="rounded-md border px-4 py-3">
    Postpartum
  </Link>
)}
```

- [ ] **Step 2: Run the existing home/related tests**

Run: `npx vitest run src/components/PostpartumCard.test.tsx src/components/PostpartumView.test.tsx`
Expected: PASS. (No home-specific unit test exists; Task 16 covers the integrated check.)

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(postpartum): surface recovery card and nav on home"
```

---

### Task 16: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all suites pass (new postpartum suites + the adjusted pregnancy/end-flow suites + all prior tests).

- [ ] **Step 2: Typecheck + production build**

Run: `npm run build`
Expected: green (App Router compiles `/postpartum` and `/postpartum/checkin`).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: clean. If a mount-time hydration `set-state-in-effect` warning appears at a new legitimate site, suppress it with a justification comment matching the existing convention; do not suppress anything else.

- [ ] **Step 4: Manual smoke (dev server)**

Run: `npm run dev`, then walk the flow: Settings → Pregnancy → start a pregnancy → "Manage pregnancy" → "Baby arrived" → Confirm → confirm you land in postpartum mode (home shows the PostpartumCard, `/postpartum` works). Take the mood check-in, including a run that trips the crisis block (answer the self-harm item non-zero) and confirm the support block renders. Log a recovery day (lochia + a postpartum symptom). End postpartum mode → back to cycle tracking. Separately confirm the **loss** path still goes straight to cycle with the compassionate copy and no postpartum.

- [ ] **Step 5: Commit any verification fixes**

```bash
git add -A
git commit -m "test(postpartum): verification pass — suite and build green"
```

---

## Self-Review

**Spec coverage:**
- Life stage + `PostpartumProfile` + transitions → Tasks 3, 7, 8, 13.
- EPDS (crisis-aware, user-initiated) → Tasks 2, 10, 11.
- Recovery math + weekly content → Tasks 1, 4, 11.
- Data layer (Dexie v3, repo, export/delete) → Tasks 5, 6.
- `lochia` separate from `flow`, no cycle pollution → Tasks 3, 14.
- UI (card, hub, settings, log form, home, nav) → Tasks 9–15.
- Safety/ethics (non-diagnostic, region-agnostic crisis, all-local, export/delete) → Tasks 6, 10, 11.
- Exit user-driven, no cycle prediction → Tasks 7, 11, 12. ✓ All spec sections map to tasks.

**Type consistency:** `PostpartumProfile`, `PostpartumReturnTo`, `EpdsEntry`, `EpdsBand`, `EpdsResult`, `RecoveryStage`, `PostpartumWeekContent` are defined once (Tasks 1–4) and consumed with matching names in Tasks 5–15. `scoreEpds(responses: number[])`, `endPostpartumMode(returnTo)`, `saveEpdsCheckin(responses)`, `postpartumWeekContent(week)` signatures are used identically downstream. ✓

**Placeholder scan:** No TBD/TODO; every code step carries complete code; the EPDS dataset and recovery content are fully written, not stubbed. ✓
