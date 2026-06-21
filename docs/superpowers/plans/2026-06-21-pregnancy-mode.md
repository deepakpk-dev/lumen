# Pregnancy Mode (Phase 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, local-first pregnancy life-stage mode to Lumen — week-by-week tracking, weekly baby-development content, a kick counter, a contraction timer, and a first-class compassionate birth/loss exit flow.

**Architecture:** A new pure-TS domain package `src/domain/pregnancy/` (gestation math, weekly content, kick/contraction logic, lifecycle transitions) built test-first, surfaced through the existing `useHealthData` hook, persisted in a Dexie `version(2)` schema (three additive tables), and rendered by Next.js App Router pages/components. `lifeStage` stays in localStorage as the mode switch; all pregnancy *data* lives in Dexie so it rides the existing export + hard-delete paths.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind v4, Dexie, date-fns, Vitest + Testing Library + fake-indexeddb, Node 24.

## Global Constraints

- **No LLM in any computation path.** All predictions/derivations are deterministic and explainable.
- **No backend/sync.** All data is local (Dexie / localStorage).
- **No diagnosis.** Kick-counter and contraction (5-1-1) outputs are framed as educational guidance that defers to a clinician, never medical advice.
- **Privacy:** every new Dexie table MUST be covered by `exportAll`/`buildExportBlob` (export) and `deleteAll` (hard delete). No pregnancy data — including loss state — may survive a hard delete.
- **Dates:** use the helpers in `src/domain/dates.ts` (`addDays`, `daysBetween`, `todayISO`, `parseISODate`, `toISODate`). `ISODate` = `'YYYY-MM-DD'`. Never hand-roll date arithmetic.
- **Compassion rule (loss path):** the pregnancy-loss flow MUST NOT show celebratory copy and MUST NOT show period/prediction prompts ("log your period", "when was your last period") on or immediately after return to cycle mode.
- **Existing patterns:** follow the TTC mode precedent — conditional rendering keyed off `lifeStage`, mount-time localStorage hydration guarded with the existing `// eslint-disable-next-line react-hooks/set-state-in-effect` comment, pure domain modules with colocated `*.test.ts`.
- **Next.js caveat (AGENTS.md):** this Next.js has breaking changes vs. training data — consult `node_modules/next/dist/docs/` before writing any Next-specific code (routing, metadata, etc.).
- **Commit cadence:** one commit per task, message prefixed `feat(pregnancy):` (or `chore`/`test` where appropriate).

---

## File Structure

**Create (domain):**
- `src/domain/pregnancy/gestation.ts` (+ `.test.ts`) — gestational date math.
- `src/domain/pregnancy/weeks.ts` (+ `.test.ts`) — weekly content dataset + accessor.
- `src/domain/pregnancy/kicks.ts` (+ `.test.ts`) — kick-session summary.
- `src/domain/pregnancy/contractions.ts` (+ `.test.ts`) — contraction duration/frequency/5-1-1.
- `src/domain/pregnancy/lifecycle.ts` (+ `.test.ts`) — profile transition helpers.

**Create (UI):**
- `src/components/PregnancyCard.tsx` (+ `.test.tsx`) — home summary card.
- `src/components/PregnancyView.tsx` (+ `.test.tsx`) — `/pregnancy` hub.
- `src/components/KickCounter.tsx` (+ `.test.tsx`) — kick counter tool.
- `src/components/ContractionTimer.tsx` (+ `.test.tsx`) — contraction timer tool.
- `src/components/PregnancyControls.tsx` (+ `.test.tsx`) — settings: enter/edit pregnancy mode.
- `src/components/PregnancyEndFlow.tsx` (+ `.test.tsx`) — birth/loss exit flow.
- `app/pregnancy/page.tsx`, `app/pregnancy/kicks/page.tsx`, `app/pregnancy/contractions/page.tsx` — routes.

**Modify:**
- `src/domain/types.ts` — new pregnancy types.
- `src/domain/log-options.ts` — pregnancy symptom group.
- `src/data/db.ts` — Dexie `version(2)` + table typings.
- `src/data/repository.ts` — pregnancy CRUD + export/delete extension.
- `src/data/export.ts` — include pregnancy data in the export blob.
- `src/state/useHealthData.ts` — pregnancy state + mutators.
- `app/page.tsx` — conditional `PregnancyCard`, nav tile, redirect fix.
- `app/settings/page.tsx` — `PregnancyControls` section.
- `src/components/OnboardingForm.tsx` — "I'm pregnant" goal.
- `src/components/DailyLogForm.tsx` — pregnancy symptom group when in pregnancy mode.

---

## Task 1: Data model — pregnancy types + symptom options

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/log-options.ts`
- Test: `src/domain/log-options.test.ts` (create)

**Interfaces:**
- Consumes: existing `ISODate` from `src/domain/types.ts`.
- Produces: `ISOTimestamp`, `PregnancyEndReason`, `DueDateSource`, `PregnancyStatus`, `PregnancyProfile`, `KickSession`, `Contraction`, `ContractionSession` (all from `src/domain/types.ts`); `PREGNANCY_SYMPTOM_OPTIONS: string[]` (from `src/domain/log-options.ts`).

- [ ] **Step 1: Write the failing test**

Create `src/domain/log-options.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PREGNANCY_SYMPTOM_OPTIONS } from './log-options';

describe('PREGNANCY_SYMPTOM_OPTIONS', () => {
  it('includes pregnancy-specific symptoms and has no duplicates', () => {
    expect(PREGNANCY_SYMPTOM_OPTIONS).toContain('Nausea');
    expect(PREGNANCY_SYMPTOM_OPTIONS).toContain('Braxton Hicks');
    expect(new Set(PREGNANCY_SYMPTOM_OPTIONS).size).toBe(
      PREGNANCY_SYMPTOM_OPTIONS.length,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/log-options.test.ts`
Expected: FAIL — `PREGNANCY_SYMPTOM_OPTIONS` is not exported.

- [ ] **Step 3: Add the types**

Append to `src/domain/types.ts`:

```ts
export type ISOTimestamp = string; // ISO 8601 datetime, e.g. '2026-06-21T14:03:00.000Z'

export type PregnancyEndReason = 'birth' | 'loss';
export type DueDateSource = 'lmp' | 'manual' | 'cycle';
export type PregnancyStatus = 'active' | 'ended';

export interface PregnancyProfile {
  id: 'current'; // singleton key
  dueDate: ISODate;
  lmp?: ISODate; // present when known or derived
  dueDateSource: DueDateSource;
  startedAt: ISODate; // when pregnancy mode was switched on
  status: PregnancyStatus;
  endReason?: PregnancyEndReason;
  endDate?: ISODate;
}

export interface KickSession {
  id: string;
  date: ISODate; // local date of the session
  startedAt: ISOTimestamp;
  kickTimestamps: ISOTimestamp[];
  endedAt?: ISOTimestamp;
}

export interface Contraction {
  start: ISOTimestamp;
  end?: ISOTimestamp;
}

export interface ContractionSession {
  id: string;
  date: ISODate;
  contractions: Contraction[];
}
```

- [ ] **Step 4: Add the symptom options**

Append to `src/domain/log-options.ts`:

```ts
export const PREGNANCY_SYMPTOM_OPTIONS: string[] = [
  'Nausea',
  'Vomiting',
  'Heartburn',
  'Constipation',
  'Swelling',
  'Round ligament pain',
  'Braxton Hicks',
  'Shortness of breath',
  'Trouble sleeping',
  'Pelvic pressure',
];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/domain/log-options.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/domain/log-options.ts src/domain/log-options.test.ts
git commit -m "feat(pregnancy): add pregnancy types and symptom options"
```

---

## Task 2: Gestation conversions (EDD ↔ LMP)

**Files:**
- Create: `src/domain/pregnancy/gestation.ts`
- Test: `src/domain/pregnancy/gestation.test.ts`

**Interfaces:**
- Consumes: `addDays`, `daysBetween` from `src/domain/dates.ts`; `ISODate` from `src/domain/types.ts`.
- Produces: `GESTATION_DAYS: 280`; `eddFromLmp(lmp: ISODate, opts?: { averageCycleLength?: number }): ISODate`; `lmpFromEdd(dueDate: ISODate): ISODate`.

- [ ] **Step 1: Write the failing test**

Create `src/domain/pregnancy/gestation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { eddFromLmp, lmpFromEdd, GESTATION_DAYS } from './gestation';

describe('eddFromLmp', () => {
  it('adds 280 days (Naegele) for a 28-day cycle', () => {
    expect(GESTATION_DAYS).toBe(280);
    expect(eddFromLmp('2026-01-01')).toBe('2026-10-08'); // +280 days
  });

  it('adjusts for cycle length when provided', () => {
    // 31-day cycle → ovulation 3 days later → +283 days
    expect(eddFromLmp('2026-01-01', { averageCycleLength: 31 })).toBe('2026-10-11');
  });

  it('ignores a non-finite average cycle length', () => {
    expect(eddFromLmp('2026-01-01', { averageCycleLength: NaN })).toBe('2026-10-08');
  });
});

describe('lmpFromEdd', () => {
  it('subtracts 280 days', () => {
    expect(lmpFromEdd('2026-10-08')).toBe('2026-01-01');
  });

  it('round-trips with eddFromLmp', () => {
    expect(lmpFromEdd(eddFromLmp('2026-03-15'))).toBe('2026-03-15');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pregnancy/gestation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/domain/pregnancy/gestation.ts` (import only `addDays` for now — Task 3 adds `daysBetween`, so importing it here would be an unused-import lint error):

```ts
import { addDays } from '@/src/domain/dates';
import type { ISODate } from '@/src/domain/types';

export const GESTATION_DAYS = 280;

export function eddFromLmp(
  lmp: ISODate,
  opts?: { averageCycleLength?: number },
): ISODate {
  const avg = opts?.averageCycleLength;
  const adjustment =
    typeof avg === 'number' && Number.isFinite(avg) ? avg - 28 : 0;
  return addDays(lmp, GESTATION_DAYS + adjustment);
}

export function lmpFromEdd(dueDate: ISODate): ISODate {
  return addDays(dueDate, -GESTATION_DAYS);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pregnancy/gestation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/pregnancy/gestation.ts src/domain/pregnancy/gestation.test.ts
git commit -m "feat(pregnancy): add EDD/LMP gestation conversions"
```

---

## Task 3: Gestation progress (age, trimester, countdown, fraction)

**Files:**
- Modify: `src/domain/pregnancy/gestation.ts`
- Test: `src/domain/pregnancy/gestation.test.ts` (extend)

**Interfaces:**
- Consumes: `lmpFromEdd` (Task 2); `addDays`, `daysBetween` from `src/domain/dates.ts`.
- Produces: `GestationalAge { weeks: number; days: number; totalDays: number }`; `Trimester = 1 | 2 | 3`; `gestationalAge(dueDate: ISODate, onDate: ISODate): GestationalAge`; `trimester(weeks: number): Trimester`; `daysUntilDue(dueDate: ISODate, onDate: ISODate): number`; `progressFraction(dueDate: ISODate, onDate: ISODate): number`.

- [ ] **Step 1: Write the failing test**

Append to `src/domain/pregnancy/gestation.test.ts`:

```ts
import {
  gestationalAge,
  trimester,
  daysUntilDue,
  progressFraction,
} from './gestation';

describe('gestationalAge', () => {
  it('computes weeks and days from the due date', () => {
    // LMP 2026-01-01 → due 2026-10-08. On 2026-02-19 = 49 days = 7w 0d.
    expect(gestationalAge('2026-10-08', '2026-02-19')).toEqual({
      weeks: 7,
      days: 0,
      totalDays: 49,
    });
  });

  it('clamps to zero before conception date', () => {
    expect(gestationalAge('2026-10-08', '2025-12-01')).toEqual({
      weeks: 0,
      days: 0,
      totalDays: 0,
    });
  });
});

describe('trimester', () => {
  it('maps completed weeks to ACOG trimesters', () => {
    expect(trimester(0)).toBe(1);
    expect(trimester(13)).toBe(1);
    expect(trimester(14)).toBe(2);
    expect(trimester(27)).toBe(2);
    expect(trimester(28)).toBe(3);
    expect(trimester(41)).toBe(3);
  });
});

describe('daysUntilDue', () => {
  it('is positive before the due date and negative after', () => {
    expect(daysUntilDue('2026-10-08', '2026-10-01')).toBe(7);
    expect(daysUntilDue('2026-10-08', '2026-10-15')).toBe(-7);
  });
});

describe('progressFraction', () => {
  it('is 0 at LMP, ~0.5 mid, 1 at due date, clamped', () => {
    expect(progressFraction('2026-10-08', '2026-01-01')).toBe(0);
    expect(progressFraction('2026-10-08', '2026-10-08')).toBe(1);
    expect(progressFraction('2026-10-08', '2027-01-01')).toBe(1); // post-term clamp
    expect(progressFraction('2026-10-08', '2025-01-01')).toBe(0); // pre-LMP clamp
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pregnancy/gestation.test.ts`
Expected: FAIL — `gestationalAge` etc. not exported.

- [ ] **Step 3: Implement**

Update the import line in `src/domain/pregnancy/gestation.ts` to:

```ts
import { addDays, daysBetween } from '@/src/domain/dates';
```

Append to `src/domain/pregnancy/gestation.ts`:

```ts
export interface GestationalAge {
  weeks: number;
  days: number;
  totalDays: number;
}

export type Trimester = 1 | 2 | 3;

export function gestationalAge(dueDate: ISODate, onDate: ISODate): GestationalAge {
  const lmp = lmpFromEdd(dueDate);
  const raw = daysBetween(lmp, onDate);
  const totalDays = Math.max(0, raw);
  return {
    weeks: Math.floor(totalDays / 7),
    days: totalDays % 7,
    totalDays,
  };
}

export function trimester(weeks: number): Trimester {
  if (weeks <= 13) return 1;
  if (weeks <= 27) return 2;
  return 3;
}

export function daysUntilDue(dueDate: ISODate, onDate: ISODate): number {
  return daysBetween(onDate, dueDate);
}

export function progressFraction(dueDate: ISODate, onDate: ISODate): number {
  const { totalDays } = gestationalAge(dueDate, onDate);
  return Math.min(1, Math.max(0, totalDays / GESTATION_DAYS));
}
```

Add `lmpFromEdd` to the in-file references — it is already defined in this module (Task 2), so no new import is needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pregnancy/gestation.test.ts`
Expected: PASS (all Task 2 + Task 3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/pregnancy/gestation.ts src/domain/pregnancy/gestation.test.ts
git commit -m "feat(pregnancy): add gestational age, trimester, countdown, progress"
```

---

## Task 4: Weekly content dataset + accessor

**Files:**
- Create: `src/domain/pregnancy/weeks.ts`
- Test: `src/domain/pregnancy/weeks.test.ts`

**Interfaces:**
- Consumes: `Trimester` from `src/domain/pregnancy/gestation.ts`.
- Produces: `WeekContent { week: number; sizeComparison: string; fetalDevelopment: string[]; maternalChanges: string[] }`; `PREGNANCY_WEEKS: WeekContent[]` (weeks 4–40); `WEEK_SOURCES: Record<Trimester, string[]>`; `weekContent(week: number): WeekContent` (clamps to [4, 40]).

- [ ] **Step 1: Write the failing test**

Create `src/domain/pregnancy/weeks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PREGNANCY_WEEKS, weekContent, WEEK_SOURCES } from './weeks';

describe('PREGNANCY_WEEKS', () => {
  it('covers weeks 4 through 40 contiguously', () => {
    expect(PREGNANCY_WEEKS[0].week).toBe(4);
    expect(PREGNANCY_WEEKS.at(-1)?.week).toBe(40);
    PREGNANCY_WEEKS.forEach((w, i) => expect(w.week).toBe(4 + i));
  });

  it('every entry has non-empty content', () => {
    for (const w of PREGNANCY_WEEKS) {
      expect(w.sizeComparison.length).toBeGreaterThan(0);
      expect(w.fetalDevelopment.length).toBeGreaterThan(0);
      expect(w.maternalChanges.length).toBeGreaterThan(0);
    }
  });
});

describe('weekContent', () => {
  it('returns the matching week', () => {
    expect(weekContent(12).week).toBe(12);
  });

  it('clamps below 4 and above 40', () => {
    expect(weekContent(1).week).toBe(4);
    expect(weekContent(42).week).toBe(40);
  });
});

describe('WEEK_SOURCES', () => {
  it('has attributed sources for each trimester', () => {
    expect(WEEK_SOURCES[1].length).toBeGreaterThan(0);
    expect(WEEK_SOURCES[2].length).toBeGreaterThan(0);
    expect(WEEK_SOURCES[3].length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pregnancy/weeks.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/domain/pregnancy/weeks.ts`:

```ts
import type { Trimester } from './gestation';

export interface WeekContent {
  week: number;
  sizeComparison: string;
  fetalDevelopment: string[];
  maternalChanges: string[];
}

// Source-attributed at the trimester level (consistent with the content library).
export const WEEK_SOURCES: Record<Trimester, string[]> = {
  1: ['NHS — Week-by-week guide to pregnancy', 'ACOG — How your fetus grows during pregnancy'],
  2: ['NHS — Week-by-week guide to pregnancy', 'ACOG — How your fetus grows during pregnancy'],
  3: ['NHS — Week-by-week guide to pregnancy', 'ACOG — How your fetus grows during pregnancy'],
};

export const PREGNANCY_WEEKS: WeekContent[] = [
  {
    week: 4,
    sizeComparison: 'a poppy seed',
    fetalDevelopment: ['The embryo implants in the uterine lining.', 'The amniotic sac and placenta begin forming.'],
    maternalChanges: ['A missed period may be your first sign.'],
  },
  {
    week: 5,
    sizeComparison: 'a sesame seed',
    fetalDevelopment: ['The neural tube (brain and spinal cord) starts to form.', 'The heart begins to develop.'],
    maternalChanges: ['Early pregnancy hormones may bring fatigue.'],
  },
  {
    week: 6,
    sizeComparison: 'a lentil',
    fetalDevelopment: ['The heart starts to beat.', 'Tiny buds that become arms and legs appear.'],
    maternalChanges: ['Nausea ("morning sickness") may begin.'],
  },
  {
    week: 7,
    sizeComparison: 'a blueberry',
    fetalDevelopment: ['The brain grows rapidly.', 'Hands and feet begin as paddle-like shapes.'],
    maternalChanges: ['You may need to urinate more often.'],
  },
  {
    week: 8,
    sizeComparison: 'a kidney bean',
    fetalDevelopment: ['Fingers and toes start to form.', 'All major organs have begun developing.'],
    maternalChanges: ['Breasts may feel tender and fuller.'],
  },
  {
    week: 9,
    sizeComparison: 'a grape',
    fetalDevelopment: ['Essential organs continue to grow.', 'Tiny muscles allow first movements (not yet felt).'],
    maternalChanges: ['Mood changes are common as hormones shift.'],
  },
  {
    week: 10,
    sizeComparison: 'a strawberry',
    fetalDevelopment: ['Vital organs are formed and starting to function.', 'Nails begin to develop.'],
    maternalChanges: ['Your waistband may start to feel snug.'],
  },
  {
    week: 11,
    sizeComparison: 'a fig',
    fetalDevelopment: ['The head is about half the body length.', 'Tooth buds and tiny bones appear.'],
    maternalChanges: ['Nausea often begins to ease for some.'],
  },
  {
    week: 12,
    sizeComparison: 'a lime',
    fetalDevelopment: ['Reflexes develop; fingers can open and close.', 'Kidneys begin producing urine.'],
    maternalChanges: ['The uterus rises above the pelvis.'],
  },
  {
    week: 13,
    sizeComparison: 'a pea pod',
    fetalDevelopment: ['Vocal cords begin to form.', 'Fingerprints are forming on tiny fingers.'],
    maternalChanges: ['First-trimester symptoms often start to settle.'],
  },
  {
    week: 14,
    sizeComparison: 'a lemon',
    fetalDevelopment: ['Facial muscles develop; the baby can squint and frown.', 'The liver and spleen begin working.'],
    maternalChanges: ['You may feel more energetic in the second trimester.'],
  },
  {
    week: 15,
    sizeComparison: 'an apple',
    fetalDevelopment: ['Bones are forming and becoming firmer.', 'The baby can sense light through closed eyelids.'],
    maternalChanges: ['You might notice a little more appetite.'],
  },
  {
    week: 16,
    sizeComparison: 'an avocado',
    fetalDevelopment: ['Eyes can make small movements.', 'The heart pumps a notable amount of blood each day.'],
    maternalChanges: ['Some people feel the first flutters of movement.'],
  },
  {
    week: 17,
    sizeComparison: 'a pear',
    fetalDevelopment: ['A protective coating (vernix) begins covering the skin.', 'Body fat starts to develop.'],
    maternalChanges: ['Your center of gravity is starting to shift.'],
  },
  {
    week: 18,
    sizeComparison: 'a bell pepper',
    fetalDevelopment: ['Ears are in position and the baby may hear sounds.', 'Nerves are forming protective coverings.'],
    maternalChanges: ['Backache may begin as your bump grows.'],
  },
  {
    week: 19,
    sizeComparison: 'a mango',
    fetalDevelopment: ['A waxy coating protects developing skin.', 'Sensory areas of the brain develop.'],
    maternalChanges: ['Round ligament pain (side aches) can appear.'],
  },
  {
    week: 20,
    sizeComparison: 'a banana',
    fetalDevelopment: ['The baby is swallowing and producing meconium.', 'You are about halfway through.'],
    maternalChanges: ['The anatomy scan is usually around now.'],
  },
  {
    week: 21,
    sizeComparison: 'a carrot',
    fetalDevelopment: ['Movements grow stronger and more coordinated.', 'Taste buds are forming.'],
    maternalChanges: ['Movements ("quickening") become clearer.'],
  },
  {
    week: 22,
    sizeComparison: 'a papaya',
    fetalDevelopment: ['Eyebrows and lips are more distinct.', 'The inner ear helps with balance.'],
    maternalChanges: ['You may notice stretch marks appearing.'],
  },
  {
    week: 23,
    sizeComparison: 'a grapefruit',
    fetalDevelopment: ['Lungs develop blood vessels in preparation for breathing.', 'The baby responds to sounds.'],
    maternalChanges: ['Swelling in feet and ankles can begin.'],
  },
  {
    week: 24,
    sizeComparison: 'an ear of corn',
    fetalDevelopment: ['The lungs develop branches and surfactant cells.', 'The skin is still thin and translucent.'],
    maternalChanges: ['Glucose screening is usually offered soon.'],
  },
  {
    week: 25,
    sizeComparison: 'a cauliflower',
    fetalDevelopment: ['The baby is gaining fat and looking fuller.', 'Hands are more dexterous.'],
    maternalChanges: ['Hair may feel thicker; energy varies.'],
  },
  {
    week: 26,
    sizeComparison: 'a head of lettuce',
    fetalDevelopment: ['Eyes begin to open.', 'Lungs practice breathing movements.'],
    maternalChanges: ['Braxton Hicks (practice contractions) may start.'],
  },
  {
    week: 27,
    sizeComparison: 'a rutabaga',
    fetalDevelopment: ['Brain activity becomes more complex.', 'The baby may hiccup — you might feel it.'],
    maternalChanges: ['This is the end of the second trimester.'],
  },
  {
    week: 28,
    sizeComparison: 'an eggplant',
    fetalDevelopment: ['Eyes can open and close and sense light.', 'Rapid brain development continues.'],
    maternalChanges: ['Third-trimester appointments become more frequent.'],
  },
  {
    week: 29,
    sizeComparison: 'a butternut squash',
    fetalDevelopment: ['Muscles and lungs keep maturing.', 'Bones are fully developed but still soft.'],
    maternalChanges: ['Shortness of breath can occur as the uterus rises.'],
  },
  {
    week: 30,
    sizeComparison: 'a cabbage',
    fetalDevelopment: ['The brain develops grooves and folds.', 'Bone marrow takes over red blood cell production.'],
    maternalChanges: ['Trouble sleeping and heartburn are common.'],
  },
  {
    week: 31,
    sizeComparison: 'a coconut',
    fetalDevelopment: ['The baby can process information and track light.', 'Rapid weight gain continues.'],
    maternalChanges: ['Braxton Hicks may become more noticeable.'],
  },
  {
    week: 32,
    sizeComparison: 'a squash',
    fetalDevelopment: ['Toenails and fingernails have formed.', 'The baby often settles head-down.'],
    maternalChanges: ['You may feel more pelvic pressure.'],
  },
  {
    week: 33,
    sizeComparison: 'a pineapple',
    fetalDevelopment: ['The immune system is developing.', 'Skull bones stay soft and movable for birth.'],
    maternalChanges: ['Swelling and fatigue may increase.'],
  },
  {
    week: 34,
    sizeComparison: 'a cantaloupe',
    fetalDevelopment: ['Lungs are nearly mature.', 'The protective vernix thickens.'],
    maternalChanges: ['You may feel the baby "drop" lower.'],
  },
  {
    week: 35,
    sizeComparison: 'a honeydew melon',
    fetalDevelopment: ['Most growth now is weight gain.', 'Kidneys are fully developed.'],
    maternalChanges: ['Frequent urination may return as baby drops.'],
  },
  {
    week: 36,
    sizeComparison: 'a romaine lettuce',
    fetalDevelopment: ['The baby is gaining about an ounce a day.', 'Fine body hair (lanugo) is shedding.'],
    maternalChanges: ['Weekly check-ups typically begin.'],
  },
  {
    week: 37,
    sizeComparison: 'a bunch of Swiss chard',
    fetalDevelopment: ['The baby is considered early term.', 'Practice breathing and sucking continue.'],
    maternalChanges: ['Watch for signs of labor; ask your provider what to track.'],
  },
  {
    week: 38,
    sizeComparison: 'a leek',
    fetalDevelopment: ['Organs are ready to function on their own.', 'A firm grasp reflex is present.'],
    maternalChanges: ['Nesting urges and Braxton Hicks may intensify.'],
  },
  {
    week: 39,
    sizeComparison: 'a small watermelon',
    fetalDevelopment: ['The baby is full term.', 'The brain and lungs keep maturing until birth.'],
    maternalChanges: ['Stay in touch with your provider about labor signs.'],
  },
  {
    week: 40,
    sizeComparison: 'a pumpkin',
    fetalDevelopment: ['The baby is ready to be born.', 'Most babies arrive within a week or two of the due date.'],
    maternalChanges: ['If you pass your due date, your provider will discuss next steps.'],
  },
];

const MIN_WEEK = PREGNANCY_WEEKS[0].week; // 4
const MAX_WEEK = PREGNANCY_WEEKS[PREGNANCY_WEEKS.length - 1].week; // 40

export function weekContent(week: number): WeekContent {
  const clamped = Math.min(MAX_WEEK, Math.max(MIN_WEEK, Math.round(week)));
  // PREGNANCY_WEEKS is contiguous from MIN_WEEK, so index is deterministic.
  return PREGNANCY_WEEKS[clamped - MIN_WEEK];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pregnancy/weeks.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/pregnancy/weeks.ts src/domain/pregnancy/weeks.test.ts
git commit -m "feat(pregnancy): add weekly content dataset and accessor"
```

---

## Task 5: Kick-session summary

**Files:**
- Create: `src/domain/pregnancy/kicks.ts`
- Test: `src/domain/pregnancy/kicks.test.ts`

**Interfaces:**
- Consumes: `KickSession` from `src/domain/types.ts`.
- Produces: `KICK_TARGET: 10`; `KickSummary { count: number; elapsedMinutes: number; reachedTarget: boolean }`; `summarizeKickSession(session: KickSession, now?: ISOTimestamp): KickSummary`.

- [ ] **Step 1: Write the failing test**

Create `src/domain/pregnancy/kicks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { summarizeKickSession, KICK_TARGET } from './kicks';
import type { KickSession } from '@/src/domain/types';

function ts(min: number): string {
  return new Date(Date.UTC(2026, 5, 21, 10, min, 0)).toISOString();
}

describe('summarizeKickSession', () => {
  it('counts kicks and reaches the target at 10', () => {
    const session: KickSession = {
      id: 'k1',
      date: '2026-06-21',
      startedAt: ts(0),
      kickTimestamps: Array.from({ length: 10 }, (_, i) => ts(i)),
      endedAt: ts(9),
    };
    const s = summarizeKickSession(session);
    expect(KICK_TARGET).toBe(10);
    expect(s.count).toBe(10);
    expect(s.elapsedMinutes).toBe(9);
    expect(s.reachedTarget).toBe(true);
  });

  it('uses `now` for an unfinished session', () => {
    const session: KickSession = {
      id: 'k2',
      date: '2026-06-21',
      startedAt: ts(0),
      kickTimestamps: [ts(1), ts(2)],
    };
    const s = summarizeKickSession(session, ts(5));
    expect(s.count).toBe(2);
    expect(s.elapsedMinutes).toBe(5);
    expect(s.reachedTarget).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pregnancy/kicks.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/domain/pregnancy/kicks.ts`:

```ts
import type { ISOTimestamp, KickSession } from '@/src/domain/types';

export const KICK_TARGET = 10;

export interface KickSummary {
  count: number;
  elapsedMinutes: number;
  reachedTarget: boolean;
}

export function summarizeKickSession(
  session: KickSession,
  now?: ISOTimestamp,
): KickSummary {
  const count = session.kickTimestamps.length;
  const endIso = session.endedAt ?? now ?? session.startedAt;
  const startMs = new Date(session.startedAt).getTime();
  const endMs = new Date(endIso).getTime();
  const elapsedMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));
  return { count, elapsedMinutes, reachedTarget: count >= KICK_TARGET };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pregnancy/kicks.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/pregnancy/kicks.ts src/domain/pregnancy/kicks.test.ts
git commit -m "feat(pregnancy): add kick-session summary"
```

---

## Task 6: Contraction duration / frequency / 5-1-1

**Files:**
- Create: `src/domain/pregnancy/contractions.ts`
- Test: `src/domain/pregnancy/contractions.test.ts`

**Interfaces:**
- Consumes: `Contraction`, `ISOTimestamp` from `src/domain/types.ts`.
- Produces: `contractionDurationSeconds(c: Contraction): number | null`; `contractionFrequencyMinutes(contractions: Contraction[]): number[]`; `FiveOneOneStatus { meetsCriteria: boolean; message: string }`; `fiveOneOneStatus(contractions: Contraction[], now: ISOTimestamp): FiveOneOneStatus`.

- [ ] **Step 1: Write the failing test**

Create `src/domain/pregnancy/contractions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  contractionDurationSeconds,
  contractionFrequencyMinutes,
  fiveOneOneStatus,
} from './contractions';
import type { Contraction } from '@/src/domain/types';

function at(min: number, sec = 0): string {
  return new Date(Date.UTC(2026, 5, 21, 9, min, sec)).toISOString();
}

describe('contractionDurationSeconds', () => {
  it('returns seconds between start and end', () => {
    expect(contractionDurationSeconds({ start: at(0, 0), end: at(1, 0) })).toBe(60);
  });
  it('returns null without an end', () => {
    expect(contractionDurationSeconds({ start: at(0, 0) })).toBeNull();
  });
});

describe('contractionFrequencyMinutes', () => {
  it('returns start-to-start intervals in minutes', () => {
    const cs: Contraction[] = [{ start: at(0) }, { start: at(5) }, { start: at(10) }];
    expect(contractionFrequencyMinutes(cs)).toEqual([5, 5]);
  });
  it('returns empty for fewer than two', () => {
    expect(contractionFrequencyMinutes([{ start: at(0) }])).toEqual([]);
  });
});

describe('fiveOneOneStatus', () => {
  it('meets 5-1-1 when ~5 min apart, ~1 min long, for ~1 hour', () => {
    const cs: Contraction[] = [];
    for (let m = 0; m <= 60; m += 5) cs.push({ start: at(m, 0), end: at(m, 60) });
    const out = fiveOneOneStatus(cs, at(61));
    expect(out.meetsCriteria).toBe(true);
    expect(out.message).toMatch(/provider/i);
  });

  it('does not meet criteria when contractions are far apart', () => {
    const cs: Contraction[] = [
      { start: at(0, 0), end: at(1, 0) },
      { start: at(15, 0), end: at(16, 0) },
    ];
    const out = fiveOneOneStatus(cs, at(20));
    expect(out.meetsCriteria).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pregnancy/contractions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/domain/pregnancy/contractions.ts`:

```ts
import type { Contraction, ISOTimestamp } from '@/src/domain/types';

const ms = (iso: ISOTimestamp): number => new Date(iso).getTime();

export function contractionDurationSeconds(c: Contraction): number | null {
  if (!c.end) return null;
  return Math.max(0, Math.round((ms(c.end) - ms(c.start)) / 1000));
}

export function contractionFrequencyMinutes(contractions: Contraction[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < contractions.length; i++) {
    out.push((ms(contractions[i].start) - ms(contractions[i - 1].start)) / 60000);
  }
  return out;
}

export interface FiveOneOneStatus {
  meetsCriteria: boolean;
  message: string;
}

const ADVISE = 'Your contractions match a 5-1-1 pattern. Consider contacting your provider or birth team.';
const KEEP_TRACKING = 'Keep tracking your contractions. This is informational only — contact your provider with any concerns.';

// Educational 5-1-1: contractions ~5 min apart, lasting ~1 min, sustained for ~1 hour.
// Non-diagnostic. Looks only at the trailing 60 minutes before `now`.
export function fiveOneOneStatus(
  contractions: Contraction[],
  now: ISOTimestamp,
): FiveOneOneStatus {
  const nowMs = ms(now);
  const windowStart = nowMs - 60 * 60000;
  const recent = contractions.filter((c) => ms(c.start) >= windowStart);

  if (recent.length < 2) return { meetsCriteria: false, message: KEEP_TRACKING };

  const span = ms(recent[recent.length - 1].start) - ms(recent[0].start);
  const intervals = contractionFrequencyMinutes(recent);
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const durations = recent
    .map(contractionDurationSeconds)
    .filter((d): d is number => d !== null);
  const avgDuration = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  const meetsCriteria =
    span >= 55 * 60000 && // sustained ~1 hour
    avgInterval <= 5 && // ~5 minutes apart
    avgDuration >= 60; // ~1 minute long

  return { meetsCriteria, message: meetsCriteria ? ADVISE : KEEP_TRACKING };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pregnancy/contractions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/pregnancy/contractions.ts src/domain/pregnancy/contractions.test.ts
git commit -m "feat(pregnancy): add contraction duration/frequency and 5-1-1 guidance"
```

---

## Task 7: Pregnancy lifecycle transitions

**Files:**
- Create: `src/domain/pregnancy/lifecycle.ts`
- Test: `src/domain/pregnancy/lifecycle.test.ts`

**Interfaces:**
- Consumes: `PregnancyProfile`, `DueDateSource`, `ISODate` from `src/domain/types.ts`; `eddFromLmp`, `lmpFromEdd` from `src/domain/pregnancy/gestation.ts`.
- Produces: `StartPregnancyInput { today: ISODate; dueDate?: ISODate; lmp?: ISODate; averageCycleLength?: number; source?: DueDateSource }`; `startPregnancy(input: StartPregnancyInput): PregnancyProfile`; `editDueDate(profile: PregnancyProfile, dueDate: ISODate, source: DueDateSource): PregnancyProfile`; `endByBirth(profile: PregnancyProfile, endDate: ISODate): PregnancyProfile`; `endByLoss(profile: PregnancyProfile, endDate: ISODate): PregnancyProfile`.

- [ ] **Step 1: Write the failing test**

Create `src/domain/pregnancy/lifecycle.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  startPregnancy,
  editDueDate,
  endByBirth,
  endByLoss,
} from './lifecycle';
import type { PregnancyProfile } from '@/src/domain/types';

describe('startPregnancy', () => {
  it('derives the due date from an LMP', () => {
    const p = startPregnancy({ today: '2026-01-10', lmp: '2026-01-01' });
    expect(p.id).toBe('current');
    expect(p.lmp).toBe('2026-01-01');
    expect(p.dueDate).toBe('2026-10-08');
    expect(p.dueDateSource).toBe('lmp');
    expect(p.startedAt).toBe('2026-01-10');
    expect(p.status).toBe('active');
  });

  it('derives the LMP from a manual due date', () => {
    const p = startPregnancy({ today: '2026-01-10', dueDate: '2026-10-08' });
    expect(p.lmp).toBe('2026-01-01');
    expect(p.dueDateSource).toBe('manual');
  });

  it('honors an explicit source (cycle import) and cycle-length adjustment', () => {
    const p = startPregnancy({
      today: '2026-01-10',
      lmp: '2026-01-01',
      averageCycleLength: 31,
      source: 'cycle',
    });
    expect(p.dueDate).toBe('2026-10-11');
    expect(p.dueDateSource).toBe('cycle');
  });
});

const active: PregnancyProfile = {
  id: 'current',
  dueDate: '2026-10-08',
  lmp: '2026-01-01',
  dueDateSource: 'lmp',
  startedAt: '2026-01-10',
  status: 'active',
};

describe('editDueDate', () => {
  it('updates due date, source, and recomputed LMP', () => {
    const p = editDueDate(active, '2026-10-15', 'manual');
    expect(p.dueDate).toBe('2026-10-15');
    expect(p.dueDateSource).toBe('manual');
    expect(p.lmp).toBe('2026-01-08');
    expect(p.status).toBe('active');
  });
});

describe('end transitions', () => {
  it('ends by birth', () => {
    const p = endByBirth(active, '2026-10-05');
    expect(p.status).toBe('ended');
    expect(p.endReason).toBe('birth');
    expect(p.endDate).toBe('2026-10-05');
  });

  it('ends by loss', () => {
    const p = endByLoss(active, '2026-04-02');
    expect(p.status).toBe('ended');
    expect(p.endReason).toBe('loss');
    expect(p.endDate).toBe('2026-04-02');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pregnancy/lifecycle.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/domain/pregnancy/lifecycle.ts`:

```ts
import type { DueDateSource, ISODate, PregnancyProfile } from '@/src/domain/types';
import { eddFromLmp, lmpFromEdd } from './gestation';

export interface StartPregnancyInput {
  today: ISODate;
  dueDate?: ISODate;
  lmp?: ISODate;
  averageCycleLength?: number;
  source?: DueDateSource;
}

export function startPregnancy(input: StartPregnancyInput): PregnancyProfile {
  let dueDate: ISODate;
  let lmp: ISODate;
  let source: DueDateSource;

  if (input.dueDate) {
    dueDate = input.dueDate;
    lmp = lmpFromEdd(dueDate);
    source = input.source ?? 'manual';
  } else if (input.lmp) {
    lmp = input.lmp;
    dueDate = eddFromLmp(lmp, { averageCycleLength: input.averageCycleLength });
    source = input.source ?? 'lmp';
  } else {
    throw new Error('startPregnancy requires either dueDate or lmp');
  }

  return {
    id: 'current',
    dueDate,
    lmp,
    dueDateSource: source,
    startedAt: input.today,
    status: 'active',
  };
}

export function editDueDate(
  profile: PregnancyProfile,
  dueDate: ISODate,
  source: DueDateSource,
): PregnancyProfile {
  return { ...profile, dueDate, lmp: lmpFromEdd(dueDate), dueDateSource: source };
}

export function endByBirth(
  profile: PregnancyProfile,
  endDate: ISODate,
): PregnancyProfile {
  return { ...profile, status: 'ended', endReason: 'birth', endDate };
}

export function endByLoss(
  profile: PregnancyProfile,
  endDate: ISODate,
): PregnancyProfile {
  return { ...profile, status: 'ended', endReason: 'loss', endDate };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pregnancy/lifecycle.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/pregnancy/lifecycle.ts src/domain/pregnancy/lifecycle.test.ts
git commit -m "feat(pregnancy): add lifecycle transition helpers"
```

---

## Task 8: Dexie v2 schema + repository CRUD + export/delete extension

**Files:**
- Modify: `src/data/db.ts`
- Modify: `src/data/repository.ts:29-42` (extend `exportAll` and `deleteAll`)
- Test: `src/data/repository.test.ts` (extend)

**Interfaces:**
- Consumes: `PregnancyProfile`, `KickSession`, `ContractionSession`, `Cycle`, `DailyLog`, `ISODate` from `src/domain/types.ts`.
- Produces: `getPregnancyProfile(): Promise<PregnancyProfile | undefined>`; `savePregnancyProfile(p: PregnancyProfile): Promise<void>`; `deletePregnancyProfile(): Promise<void>`; `addKickSession(s: KickSession): Promise<void>`; `getKickSessions(): Promise<KickSession[]>`; `addContractionSession(s: ContractionSession): Promise<void>`; `updateContractionSession(s: ContractionSession): Promise<void>`; `getContractionSessions(): Promise<ContractionSession[]>`. `exportAll` return type extended to `{ cycles; dailyLogs; pregnancyProfile: PregnancyProfile | null; kickSessions: KickSession[]; contractionSessions: ContractionSession[] }`.

- [ ] **Step 1: Write the failing test**

Append to `src/data/repository.test.ts`:

```ts
import {
  getPregnancyProfile,
  savePregnancyProfile,
  deletePregnancyProfile,
  addKickSession,
  getKickSessions,
  addContractionSession,
  getContractionSessions,
} from './repository';
import type { PregnancyProfile } from '@/src/domain/types';

const profile: PregnancyProfile = {
  id: 'current',
  dueDate: '2026-10-08',
  lmp: '2026-01-01',
  dueDateSource: 'lmp',
  startedAt: '2026-01-10',
  status: 'active',
};

describe('pregnancy repository', () => {
  it('stores and reads the singleton pregnancy profile', async () => {
    await savePregnancyProfile(profile);
    expect((await getPregnancyProfile())?.dueDate).toBe('2026-10-08');
    await deletePregnancyProfile();
    expect(await getPregnancyProfile()).toBeUndefined();
  });

  it('stores kick and contraction sessions', async () => {
    await addKickSession({ id: 'k1', date: '2026-06-21', startedAt: '2026-06-21T10:00:00.000Z', kickTimestamps: [] });
    await addContractionSession({ id: 'c1', date: '2026-06-21', contractions: [] });
    expect(await getKickSessions()).toHaveLength(1);
    expect(await getContractionSessions()).toHaveLength(1);
  });

  it('export includes pregnancy data and delete clears it', async () => {
    await savePregnancyProfile(profile);
    await addKickSession({ id: 'k2', date: '2026-06-21', startedAt: '2026-06-21T10:00:00.000Z', kickTimestamps: [] });
    await addContractionSession({ id: 'c2', date: '2026-06-21', contractions: [] });

    const dump = await exportAll();
    expect(dump.pregnancyProfile?.dueDate).toBe('2026-10-08');
    expect(dump.kickSessions).toHaveLength(1);
    expect(dump.contractionSessions).toHaveLength(1);

    await deleteAll();
    const empty = await exportAll();
    expect(empty.pregnancyProfile).toBeNull();
    expect(empty.kickSessions).toHaveLength(0);
    expect(empty.contractionSessions).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/repository.test.ts`
Expected: FAIL — new functions not exported.

- [ ] **Step 3: Bump the Dexie schema**

Replace the body of `src/data/db.ts` with:

```ts
import Dexie, { type Table } from 'dexie';
import type {
  Cycle,
  DailyLog,
  PregnancyProfile,
  KickSession,
  ContractionSession,
} from '@/src/domain/types';

export class HealthDB extends Dexie {
  cycles!: Table<Cycle, string>;
  dailyLogs!: Table<DailyLog, string>;
  pregnancyProfile!: Table<PregnancyProfile, string>;
  kickSessions!: Table<KickSession, string>;
  contractionSessions!: Table<ContractionSession, string>;

  constructor() {
    super('lumen-health');
    this.version(1).stores({
      cycles: 'id, startDate',
      dailyLogs: 'date',
    });
    this.version(2).stores({
      cycles: 'id, startDate',
      dailyLogs: 'date',
      pregnancyProfile: 'id',
      kickSessions: 'id, date',
      contractionSessions: 'id, date',
    });
  }
}

export const db = new HealthDB();
```

- [ ] **Step 4: Add repository functions and extend export/delete**

In `src/data/repository.ts`, update the import line to add the new types:

```ts
import type {
  Cycle,
  DailyLog,
  ISODate,
  PregnancyProfile,
  KickSession,
  ContractionSession,
} from '@/src/domain/types';
```

Add these functions (before `exportAll`):

```ts
export async function getPregnancyProfile(): Promise<PregnancyProfile | undefined> {
  return db.pregnancyProfile.get('current');
}

export async function savePregnancyProfile(p: PregnancyProfile): Promise<void> {
  await db.pregnancyProfile.put(p);
}

export async function deletePregnancyProfile(): Promise<void> {
  await db.pregnancyProfile.delete('current');
}

export async function addKickSession(s: KickSession): Promise<void> {
  await db.kickSessions.put(s);
}

export async function getKickSessions(): Promise<KickSession[]> {
  const all = await db.kickSessions.toArray();
  return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function addContractionSession(s: ContractionSession): Promise<void> {
  await db.contractionSessions.put(s);
}

export async function updateContractionSession(s: ContractionSession): Promise<void> {
  await db.contractionSessions.put(s);
}

export async function getContractionSessions(): Promise<ContractionSession[]> {
  const all = await db.contractionSessions.toArray();
  return all.sort((a, b) => b.date.localeCompare(a.date));
}
```

Replace `exportAll` and `deleteAll` with:

```ts
export async function exportAll(): Promise<{
  cycles: Cycle[];
  dailyLogs: DailyLog[];
  pregnancyProfile: PregnancyProfile | null;
  kickSessions: KickSession[];
  contractionSessions: ContractionSession[];
}> {
  return {
    cycles: await getCycles(),
    dailyLogs: await getAllDailyLogs(),
    pregnancyProfile: (await getPregnancyProfile()) ?? null,
    kickSessions: await getKickSessions(),
    contractionSessions: await getContractionSessions(),
  };
}

export async function deleteAll(): Promise<void> {
  await db.cycles.clear();
  await db.dailyLogs.clear();
  await db.pregnancyProfile.clear();
  await db.kickSessions.clear();
  await db.contractionSessions.clear();
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/repository.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/db.ts src/data/repository.ts src/data/repository.test.ts
git commit -m "feat(pregnancy): add Dexie v2 tables and pregnancy repository CRUD"
```

---

## Task 9: Export blob includes pregnancy data

**Files:**
- Modify: `src/data/export.ts`
- Test: `src/data/export.test.ts` (extend)

**Interfaces:**
- Consumes: `PregnancyProfile`, `KickSession`, `ContractionSession` from `src/domain/types.ts`; the extended `exportAll` shape (Task 8).
- Produces: `buildExportBlob` accepting `{ cycles; dailyLogs; pregnancyProfile?: PregnancyProfile | null; kickSessions?: KickSession[]; contractionSessions?: ContractionSession[] }` and emitting `version: 2`.

- [ ] **Step 1: Write the failing test**

Append to `src/data/export.test.ts`:

```ts
it('includes pregnancy data and bumps the version', () => {
  const { json } = buildExportBlob({
    cycles: [],
    dailyLogs: [],
    pregnancyProfile: {
      id: 'current',
      dueDate: '2026-10-08',
      dueDateSource: 'lmp',
      startedAt: '2026-01-10',
      status: 'active',
    },
    kickSessions: [],
    contractionSessions: [],
  });
  const parsed = JSON.parse(json);
  expect(parsed.version).toBe(2);
  expect(parsed.pregnancyProfile.dueDate).toBe('2026-10-08');
  expect(parsed.kickSessions).toEqual([]);
  expect(parsed.contractionSessions).toEqual([]);
});
```

(If `export.test.ts` does not already import `buildExportBlob`, add `import { buildExportBlob } from './export';` at the top.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/export.test.ts`
Expected: FAIL — `version` is 1 / pregnancy fields absent.

- [ ] **Step 3: Implement**

Replace `src/data/export.ts` with:

```ts
import type {
  Cycle,
  DailyLog,
  PregnancyProfile,
  KickSession,
  ContractionSession,
} from '@/src/domain/types';
import { todayISO } from '@/src/domain/dates';

export function buildExportBlob(data: {
  cycles: Cycle[];
  dailyLogs: DailyLog[];
  pregnancyProfile?: PregnancyProfile | null;
  kickSessions?: KickSession[];
  contractionSessions?: ContractionSession[];
}): { filename: string; json: string } {
  const payload = {
    version: 2 as const,
    exportedAt: new Date().toISOString(),
    cycles: data.cycles,
    dailyLogs: data.dailyLogs,
    pregnancyProfile: data.pregnancyProfile ?? null,
    kickSessions: data.kickSessions ?? [],
    contractionSessions: data.contractionSessions ?? [],
  };
  return {
    filename: `lumen-export-${todayISO()}.json`,
    json: JSON.stringify(payload, null, 2),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/export.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/export.ts src/data/export.test.ts
git commit -m "feat(pregnancy): include pregnancy data in export blob"
```

---

## Task 10: useHealthData — pregnancy profile, derived state, lifecycle mutators

**Files:**
- Modify: `src/state/useHealthData.ts`
- Test: `src/state/useHealthData.pregnancy.test.tsx` (create)

**Interfaces:**
- Consumes: repository fns (Task 8); `gestationalAge`, `trimester`, `daysUntilDue`, `progressFraction`, `GestationalAge`, `Trimester` (Task 3); `weekContent`, `WeekContent` (Task 4); `startPregnancy`, `editDueDate`, `endByBirth`, `endByLoss` (Task 7); existing `stats` (`CycleStats`).
- Produces: hook return additions — `pregnancyProfile: PregnancyProfile | null`; `isPregnant: boolean`; `gestation: GestationalAge | null`; `currentTrimester: Trimester | null`; `daysToDue: number | null`; `weekContentToday: WeekContent | null`; mutators `startPregnancyMode(input: { dueDate?: ISODate; lmp?: ISODate; source?: DueDateSource; useCycleLength?: boolean }): Promise<void>`, `updateDueDate(dueDate: ISODate, source: DueDateSource): Promise<void>`, `endPregnancyBirth(endDate: ISODate): Promise<void>`, `endPregnancyLoss(endDate: ISODate): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `src/state/useHealthData.pregnancy.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHealthData } from './useHealthData';
import { deleteAll } from '@/src/data/repository';
import { clearPreferences } from '@/src/settings/preferences';

beforeEach(async () => {
  await deleteAll();
  clearPreferences();
});

describe('useHealthData pregnancy', () => {
  it('starts pregnancy mode and exposes derived gestation state', async () => {
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.startPregnancyMode({ dueDate: '2026-10-08' });
    });

    await waitFor(() => expect(result.current.isPregnant).toBe(true));
    expect(result.current.pregnancyProfile?.dueDate).toBe('2026-10-08');
    expect(result.current.gestation).not.toBeNull();
    expect(result.current.currentTrimester).not.toBeNull();
    expect(result.current.weekContentToday).not.toBeNull();
  });

  it('ends pregnancy by loss and returns to cycle mode', async () => {
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.startPregnancyMode({ dueDate: '2026-10-08' });
    });
    await waitFor(() => expect(result.current.isPregnant).toBe(true));

    await act(async () => {
      await result.current.endPregnancyLoss('2026-04-02');
    });

    await waitFor(() => expect(result.current.isPregnant).toBe(false));
    expect(result.current.lifeStage).toBe('cycle');
    expect(result.current.pregnancyProfile?.status).toBe('ended');
    expect(result.current.pregnancyProfile?.endReason).toBe('loss');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/useHealthData.pregnancy.test.tsx`
Expected: FAIL — `startPregnancyMode` is not a function.

- [ ] **Step 3: Implement**

In `src/state/useHealthData.ts`, add imports:

```ts
import type {
  PregnancyProfile,
  DueDateSource,
} from '@/src/domain/types';
import {
  getPregnancyProfile,
  savePregnancyProfile,
} from '@/src/data/repository';
import {
  gestationalAge,
  trimester,
  daysUntilDue,
  type GestationalAge,
  type Trimester,
} from '@/src/domain/pregnancy/gestation';
import { weekContent, type WeekContent } from '@/src/domain/pregnancy/weeks';
import {
  startPregnancy,
  editDueDate,
  endByBirth,
  endByLoss,
} from '@/src/domain/pregnancy/lifecycle';
import { setLifeStage } from '@/src/settings/preferences';
```

Add state + load. After the `dailyLogs` state declarations, add:

```ts
const [pregnancyProfile, setPregnancyProfile] = useState<PregnancyProfile | null>(null);
```

Extend the `refresh` callback to also load the profile:

```ts
const refresh = useCallback(async () => {
  const [c, l, p] = await Promise.all([
    getCycles(),
    getAllDailyLogs(),
    getPregnancyProfile(),
  ]);
  setCycles(c);
  setDailyLogs(l);
  setPregnancyProfile(p ?? null);
  setLoading(false);
}, []);
```

Add derived values (after `stats` is computed):

```ts
const isPregnant = lifeStage === 'pregnancy' && pregnancyProfile?.status === 'active';

const gestation: GestationalAge | null = useMemo(
  () => (isPregnant && pregnancyProfile ? gestationalAge(pregnancyProfile.dueDate, todayISO()) : null),
  [isPregnant, pregnancyProfile],
);

const currentTrimester: Trimester | null = useMemo(
  () => (gestation ? trimester(gestation.weeks) : null),
  [gestation],
);

const daysToDue: number | null = useMemo(
  () => (isPregnant && pregnancyProfile ? daysUntilDue(pregnancyProfile.dueDate, todayISO()) : null),
  [isPregnant, pregnancyProfile],
);

const weekContentToday: WeekContent | null = useMemo(
  () => (gestation ? weekContent(gestation.weeks) : null),
  [gestation],
);
```

Add mutators (after `saveLog`):

```ts
const startPregnancyMode = useCallback(
  async (input: { dueDate?: ISODate; lmp?: ISODate; source?: DueDateSource; useCycleLength?: boolean }) => {
    const profile = startPregnancy({
      today: todayISO(),
      dueDate: input.dueDate,
      lmp: input.lmp,
      source: input.source,
      averageCycleLength: input.useCycleLength ? stats.averageCycleLength : undefined,
    });
    await savePregnancyProfile(profile);
    setLifeStage('pregnancy', todayISO());
    refreshSettings();
    await refresh();
  },
  [stats.averageCycleLength, refresh, refreshSettings],
);

const updateDueDate = useCallback(
  async (dueDate: ISODate, source: DueDateSource) => {
    if (!pregnancyProfile) return;
    await savePregnancyProfile(editDueDate(pregnancyProfile, dueDate, source));
    await refresh();
  },
  [pregnancyProfile, refresh],
);

const endPregnancyBirth = useCallback(
  async (endDate: ISODate) => {
    if (!pregnancyProfile) return;
    await savePregnancyProfile(endByBirth(pregnancyProfile, endDate));
    setLifeStage('cycle', todayISO());
    refreshSettings();
    await refresh();
  },
  [pregnancyProfile, refresh, refreshSettings],
);

const endPregnancyLoss = useCallback(
  async (endDate: ISODate) => {
    if (!pregnancyProfile) return;
    await savePregnancyProfile(endByLoss(pregnancyProfile, endDate));
    setLifeStage('cycle', todayISO());
    refreshSettings();
    await refresh();
  },
  [pregnancyProfile, refresh, refreshSettings],
);
```

Add all new values to the hook's `return { ... }` object:

```ts
    pregnancyProfile,
    isPregnant,
    gestation,
    currentTrimester,
    daysToDue,
    weekContentToday,
    startPregnancyMode,
    updateDueDate,
    endPregnancyBirth,
    endPregnancyLoss,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/useHealthData.pregnancy.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/useHealthData.ts src/state/useHealthData.pregnancy.test.tsx
git commit -m "feat(pregnancy): wire pregnancy profile, derived state, and lifecycle mutators into useHealthData"
```

---

## Task 11: useHealthData — kick & contraction session state + mutators

**Files:**
- Modify: `src/state/useHealthData.ts`
- Test: `src/state/useHealthData.pregnancy.test.tsx` (extend)

**Interfaces:**
- Consumes: `addKickSession`, `getKickSessions`, `addContractionSession`, `getContractionSessions` (Task 8); `KickSession`, `ContractionSession` types.
- Produces: hook return additions — `kickSessions: KickSession[]`; `contractionSessions: ContractionSession[]`; `saveKickSession(s: KickSession): Promise<void>`; `saveContractionSession(s: ContractionSession): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Append to `src/state/useHealthData.pregnancy.test.tsx`:

```tsx
it('saves kick and contraction sessions', async () => {
  const { result } = renderHook(() => useHealthData());
  await waitFor(() => expect(result.current.loading).toBe(false));

  await act(async () => {
    await result.current.saveKickSession({
      id: 'k1',
      date: '2026-06-21',
      startedAt: '2026-06-21T10:00:00.000Z',
      kickTimestamps: ['2026-06-21T10:01:00.000Z'],
      endedAt: '2026-06-21T10:02:00.000Z',
    });
    await result.current.saveContractionSession({
      id: 'c1',
      date: '2026-06-21',
      contractions: [{ start: '2026-06-21T09:00:00.000Z', end: '2026-06-21T09:01:00.000Z' }],
    });
  });

  await waitFor(() => expect(result.current.kickSessions).toHaveLength(1));
  expect(result.current.contractionSessions).toHaveLength(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/useHealthData.pregnancy.test.tsx`
Expected: FAIL — `saveKickSession` is not a function.

- [ ] **Step 3: Implement**

In `src/state/useHealthData.ts`, add to the imports from the repository:

```ts
import {
  addKickSession,
  getKickSessions,
  addContractionSession,
  getContractionSessions,
} from '@/src/data/repository';
import type { KickSession, ContractionSession } from '@/src/domain/types';
```

Add state:

```ts
const [kickSessions, setKickSessions] = useState<KickSession[]>([]);
const [contractionSessions, setContractionSessions] = useState<ContractionSession[]>([]);
```

Extend `refresh` to load them (add to the `Promise.all` and set state):

```ts
const refresh = useCallback(async () => {
  const [c, l, p, ks, cs] = await Promise.all([
    getCycles(),
    getAllDailyLogs(),
    getPregnancyProfile(),
    getKickSessions(),
    getContractionSessions(),
  ]);
  setCycles(c);
  setDailyLogs(l);
  setPregnancyProfile(p ?? null);
  setKickSessions(ks);
  setContractionSessions(cs);
  setLoading(false);
}, []);
```

Add mutators:

```ts
const saveKickSession = useCallback(
  async (s: KickSession) => {
    await addKickSession(s);
    await refresh();
  },
  [refresh],
);

const saveContractionSession = useCallback(
  async (s: ContractionSession) => {
    await addContractionSession(s);
    await refresh();
  },
  [refresh],
);
```

Add to the return object:

```ts
    kickSessions,
    contractionSessions,
    saveKickSession,
    saveContractionSession,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/useHealthData.pregnancy.test.tsx`
Expected: PASS (all pregnancy hook tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/useHealthData.ts src/state/useHealthData.pregnancy.test.tsx
git commit -m "feat(pregnancy): expose kick/contraction sessions and savers from useHealthData"
```

---

## Task 12: PregnancyCard (home summary)

**Files:**
- Create: `src/components/PregnancyCard.tsx`
- Test: `src/components/PregnancyCard.test.tsx`

**Interfaces:**
- Consumes: `GestationalAge`, `Trimester` (Task 3); `WeekContent` (Task 4).
- Produces: `PregnancyCard({ gestation, trimester, daysToDue, week }: { gestation: GestationalAge; trimester: Trimester; daysToDue: number; week: WeekContent })`.

- [ ] **Step 1: Write the failing test**

Create `src/components/PregnancyCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PregnancyCard } from './PregnancyCard';

describe('PregnancyCard', () => {
  it('shows the week, trimester, countdown, and size comparison', () => {
    render(
      <PregnancyCard
        gestation={{ weeks: 20, days: 3, totalDays: 143 }}
        trimester={2}
        daysToDue={137}
        week={{ week: 20, sizeComparison: 'a banana', fetalDevelopment: ['x'], maternalChanges: ['y'] }}
      />,
    );
    expect(screen.getByText(/20 weeks/i)).toBeTruthy();
    expect(screen.getByText(/trimester 2/i)).toBeTruthy();
    expect(screen.getByText(/137 days/i)).toBeTruthy();
    expect(screen.getByText(/a banana/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PregnancyCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/components/PregnancyCard.tsx`:

```tsx
import type { GestationalAge, Trimester } from '@/src/domain/pregnancy/gestation';
import type { WeekContent } from '@/src/domain/pregnancy/weeks';

export function PregnancyCard({
  gestation,
  trimester,
  daysToDue,
  week,
}: {
  gestation: GestationalAge;
  trimester: Trimester;
  daysToDue: number;
  week: WeekContent;
}) {
  const countdown =
    daysToDue > 0
      ? `${daysToDue} days to go`
      : daysToDue === 0
        ? 'Due today'
        : `${Math.abs(daysToDue)} days past due`;

  return (
    <section className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-4">
      <h2 className="text-base font-semibold">
        {gestation.weeks} weeks {gestation.days} days
      </h2>
      <p className="text-sm text-neutral-700">Trimester {trimester} · {countdown}</p>
      <p className="text-sm text-neutral-700">
        Your baby is about the size of <span className="font-medium">{week.sizeComparison}</span>.
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/PregnancyCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PregnancyCard.tsx src/components/PregnancyCard.test.tsx
git commit -m "feat(pregnancy): add PregnancyCard home summary"
```

---

## Task 13: Home wiring — conditional card, nav tile, redirect fix

**Files:**
- Modify: `app/page.tsx`
- Test: (covered by the build + existing home behavior; no new unit test — this is wiring of already-tested units)

**Interfaces:**
- Consumes: `useHealthData` additions (`isPregnant`, `gestation`, `currentTrimester`, `daysToDue`, `weekContentToday`, `pregnancyProfile`); `PregnancyCard` (Task 12).
- Produces: home renders `PregnancyCard` and a Pregnancy nav tile when pregnant; suppresses the cycle summary when pregnant; onboarding redirect no longer fires for a pregnancy-only user.

- [ ] **Step 1: Update the redirect + destructuring**

In `app/page.tsx`, change the `useHealthData()` destructure to also pull pregnancy values:

```tsx
  const {
    cycles, stats, prediction, insights, dailyContent, lifeStage,
    conceptionToday, ovulationConfirmation, loading,
    isPregnant, gestation, currentTrimester, daysToDue, weekContentToday,
    pregnancyProfile,
  } = useHealthData();
```

Change the redirect effect so a pregnancy-only user is not bounced to onboarding:

```tsx
  useEffect(() => {
    if (!loading && cycles.length === 0 && !pregnancyProfile) router.replace('/onboarding');
  }, [loading, cycles.length, pregnancyProfile, router]);
```

- [ ] **Step 2: Render the pregnancy card + suppress cycle summary**

Replace the `<CycleSummary ... />` block and the TTC card block region with conditional rendering:

```tsx
      {isPregnant && gestation && currentTrimester && daysToDue !== null && weekContentToday ? (
        <PregnancyCard
          gestation={gestation}
          trimester={currentTrimester}
          daysToDue={daysToDue}
          week={weekContentToday}
        />
      ) : (
        <CycleSummary
          prediction={prediction}
          stats={stats}
          lastPeriodStart={lastPeriodStart}
          today={todayISO()}
        />
      )}
      {highlight && <InsightCard insight={highlight} />}
      {lifeStage === 'ttc' && (
        <ConceptionCard guidance={conceptionToday} confirmation={ovulationConfirmation} />
      )}
```

Add the import at the top:

```tsx
import { PregnancyCard } from '@/src/components/PregnancyCard';
```

- [ ] **Step 3: Add the Pregnancy nav tile**

In the `<nav>` grid, after the TTC Fertility link block, add:

```tsx
        {isPregnant && (
          <Link href="/pregnancy" className="rounded-md border px-4 py-3">
            Pregnancy
          </Link>
        )}
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds; `/` still renders.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat(pregnancy): show PregnancyCard and nav on home when in pregnancy mode"
```

---

## Task 14: /pregnancy hub (PregnancyView + route)

**Files:**
- Create: `src/components/PregnancyView.tsx`
- Create: `app/pregnancy/page.tsx`
- Test: `src/components/PregnancyView.test.tsx`

**Interfaces:**
- Consumes: `useHealthData` (`isPregnant`, `gestation`, `currentTrimester`, `daysToDue`, `weekContentToday`, `loading`).
- Produces: `PregnancyView()` — the hub page body; renders the current week's development + maternal lists, links to the two tools and to Manage pregnancy, and redirects to `/` when not pregnant. The route file renders `<PregnancyView />`.

- [ ] **Step 1: Write the failing test**

Create `src/components/PregnancyView.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PregnancyView } from './PregnancyView';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const base = {
  loading: false,
  isPregnant: true,
  gestation: { weeks: 20, days: 0, totalDays: 140 },
  currentTrimester: 2 as const,
  daysToDue: 140,
  weekContentToday: {
    week: 20,
    sizeComparison: 'a banana',
    fetalDevelopment: ['Baby is swallowing.'],
    maternalChanges: ['Halfway there.'],
  },
};
let mockState = { ...base };
vi.mock('@/src/state/useHealthData', () => ({ useHealthData: () => mockState }));

beforeEach(() => {
  replace.mockReset();
  mockState = { ...base };
});

describe('PregnancyView', () => {
  it('renders weekly development and maternal content', () => {
    render(<PregnancyView />);
    expect(screen.getByText(/Baby is swallowing/i)).toBeTruthy();
    expect(screen.getByText(/Halfway there/i)).toBeTruthy();
    expect(screen.getByText(/Kick counter/i)).toBeTruthy();
    expect(screen.getByText(/Contraction timer/i)).toBeTruthy();
  });

  it('redirects home when not pregnant', () => {
    mockState = { ...base, isPregnant: false };
    render(<PregnancyView />);
    expect(replace).toHaveBeenCalledWith('/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PregnancyView.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/PregnancyView.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHealthData } from '@/src/state/useHealthData';
import { PregnancyCard } from '@/src/components/PregnancyCard';

export function PregnancyView() {
  const router = useRouter();
  const { loading, isPregnant, gestation, currentTrimester, daysToDue, weekContentToday } =
    useHealthData();

  useEffect(() => {
    if (!loading && !isPregnant) router.replace('/');
  }, [loading, isPregnant, router]);

  if (loading) return <main className="p-6">Loading…</main>;
  if (!isPregnant || !gestation || !currentTrimester || daysToDue === null || !weekContentToday) {
    return <main className="p-6">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <PregnancyCard
        gestation={gestation}
        trimester={currentTrimester}
        daysToDue={daysToDue}
        week={weekContentToday}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-600">Baby this week</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
          {weekContentToday.fetalDevelopment.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-600">Your body this week</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
          {weekContentToday.maternalChanges.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <nav className="grid grid-cols-2 gap-3 text-center text-sm">
        <Link href="/pregnancy/kicks" className="rounded-md border px-4 py-3">
          Kick counter
        </Link>
        <Link href="/pregnancy/contractions" className="rounded-md border px-4 py-3">
          Contraction timer
        </Link>
        <Link href="/log" className="rounded-md border px-4 py-3">
          Log symptoms
        </Link>
        <Link href="/settings" className="rounded-md border px-4 py-3">
          Manage pregnancy
        </Link>
      </nav>

      <p className="text-[11px] text-neutral-500">
        Educational information only — not a substitute for medical advice. Contact your
        provider with any concerns.
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Create the route**

Create `app/pregnancy/page.tsx`:

```tsx
import { PregnancyView } from '@/src/components/PregnancyView';

export default function PregnancyPage() {
  return <PregnancyView />;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/PregnancyView.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/PregnancyView.tsx src/components/PregnancyView.test.tsx app/pregnancy/page.tsx
git commit -m "feat(pregnancy): add /pregnancy hub view"
```

---

## Task 15: Kick counter (component + route)

**Files:**
- Create: `src/components/KickCounter.tsx`
- Create: `app/pregnancy/kicks/page.tsx`
- Test: `src/components/KickCounter.test.tsx`

**Interfaces:**
- Consumes: `useHealthData` (`saveKickSession`, `kickSessions`); `summarizeKickSession`, `KICK_TARGET` (Task 5).
- Produces: `KickCounter()` — start/record/finish a count-to-10 session; renders the live count and recent sessions. The route renders `<KickCounter />`.

- [ ] **Step 1: Write the failing test**

Create `src/components/KickCounter.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KickCounter } from './KickCounter';

const saveKickSession = vi.fn().mockResolvedValue(undefined);
let kickSessions: unknown[] = [];
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({ saveKickSession, kickSessions }),
}));

beforeEach(() => {
  saveKickSession.mockClear();
  kickSessions = [];
});

describe('KickCounter', () => {
  it('starts a session and increments the count on each kick', () => {
    render(<KickCounter />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    fireEvent.click(screen.getByRole('button', { name: /record a kick/i }));
    fireEvent.click(screen.getByRole('button', { name: /record a kick/i }));
    expect(screen.getByText(/2 \/ 10/)).toBeTruthy();
  });

  it('saves the session on finish', () => {
    render(<KickCounter />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    fireEvent.click(screen.getByRole('button', { name: /record a kick/i }));
    fireEvent.click(screen.getByRole('button', { name: /finish/i }));
    expect(saveKickSession).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/KickCounter.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/KickCounter.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useHealthData } from '@/src/state/useHealthData';
import { KICK_TARGET } from '@/src/domain/pregnancy/kicks';
import { todayISO } from '@/src/domain/dates';

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `k_${Date.now()}_${Math.random()}`;
}

export function KickCounter() {
  const { saveKickSession, kickSessions } = useHealthData();
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [kicks, setKicks] = useState<string[]>([]);

  function start() {
    setStartedAt(new Date().toISOString());
    setKicks([]);
  }

  function recordKick() {
    setKicks((k) => [...k, new Date().toISOString()]);
  }

  async function finish() {
    if (!startedAt) return;
    await saveKickSession({
      id: newId(),
      date: todayISO(),
      startedAt,
      kickTimestamps: kicks,
      endedAt: new Date().toISOString(),
    });
    setStartedAt(null);
    setKicks([]);
  }

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kick counter</h1>
        <Link href="/pregnancy" className="text-sm text-rose-600">Back</Link>
      </div>

      {startedAt ? (
        <div className="space-y-4 text-center">
          <p className="text-4xl font-bold">{kicks.length} / {KICK_TARGET}</p>
          <button
            type="button"
            onClick={recordKick}
            className="w-full rounded-md bg-rose-600 px-4 py-6 text-lg text-white"
          >
            Record a kick
          </button>
          <button type="button" onClick={finish} className="w-full rounded-md border px-4 py-2">
            Finish
          </button>
        </div>
      ) : (
        <button type="button" onClick={start} className="w-full rounded-md bg-rose-600 px-4 py-3 text-white">
          Start a session
        </button>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-600">Recent sessions</h2>
        {kickSessions.length === 0 ? (
          <p className="text-sm text-neutral-500">No sessions yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-neutral-700">
            {kickSessions.map((s) => (
              <li key={s.id}>{s.date}: {s.kickTimestamps.length} kicks</li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[11px] text-neutral-500">
        Counting movements is informational. Contact your provider if you notice reduced movement.
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Create the route**

Create `app/pregnancy/kicks/page.tsx`:

```tsx
import { KickCounter } from '@/src/components/KickCounter';

export default function KicksPage() {
  return <KickCounter />;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/KickCounter.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/KickCounter.tsx src/components/KickCounter.test.tsx app/pregnancy/kicks/page.tsx
git commit -m "feat(pregnancy): add kick counter tool"
```

---

## Task 16: Contraction timer (component + route)

**Files:**
- Create: `src/components/ContractionTimer.tsx`
- Create: `app/pregnancy/contractions/page.tsx`
- Test: `src/components/ContractionTimer.test.tsx`

**Interfaces:**
- Consumes: `useHealthData` (`saveContractionSession`, `contractionSessions`); `fiveOneOneStatus`, `contractionFrequencyMinutes` (Task 6).
- Produces: `ContractionTimer()` — start/stop a contraction, shows running count and the educational 5-1-1 status, saves the session. The route renders `<ContractionTimer />`.

- [ ] **Step 1: Write the failing test**

Create `src/components/ContractionTimer.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContractionTimer } from './ContractionTimer';

const saveContractionSession = vi.fn().mockResolvedValue(undefined);
let contractionSessions: unknown[] = [];
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({ saveContractionSession, contractionSessions }),
}));

beforeEach(() => {
  saveContractionSession.mockClear();
  contractionSessions = [];
});

describe('ContractionTimer', () => {
  it('records a contraction start and stop', () => {
    render(<ContractionTimer />);
    fireEvent.click(screen.getByRole('button', { name: /start contraction/i }));
    fireEvent.click(screen.getByRole('button', { name: /stop contraction/i }));
    expect(screen.getByText(/1 contraction/i)).toBeTruthy();
  });

  it('saves the session on save', () => {
    render(<ContractionTimer />);
    fireEvent.click(screen.getByRole('button', { name: /start contraction/i }));
    fireEvent.click(screen.getByRole('button', { name: /stop contraction/i }));
    fireEvent.click(screen.getByRole('button', { name: /save session/i }));
    expect(saveContractionSession).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ContractionTimer.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/ContractionTimer.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useHealthData } from '@/src/state/useHealthData';
import type { Contraction } from '@/src/domain/types';
import { fiveOneOneStatus } from '@/src/domain/pregnancy/contractions';
import { todayISO } from '@/src/domain/dates';

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `ct_${Date.now()}_${Math.random()}`;
}

export function ContractionTimer() {
  const { saveContractionSession, contractionSessions } = useHealthData();
  const [contractions, setContractions] = useState<Contraction[]>([]);
  const [openStart, setOpenStart] = useState<string | null>(null);

  function startContraction() {
    setOpenStart(new Date().toISOString());
  }

  function stopContraction() {
    if (!openStart) return;
    setContractions((cs) => [...cs, { start: openStart, end: new Date().toISOString() }]);
    setOpenStart(null);
  }

  async function save() {
    if (contractions.length === 0) return;
    await saveContractionSession({ id: newId(), date: todayISO(), contractions });
    setContractions([]);
  }

  const status = fiveOneOneStatus(contractions, new Date().toISOString());

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Contraction timer</h1>
        <Link href="/pregnancy" className="text-sm text-rose-600">Back</Link>
      </div>

      <p className="text-center text-sm text-neutral-700">
        {contractions.length} contraction{contractions.length === 1 ? '' : 's'} logged
      </p>

      {openStart ? (
        <button type="button" onClick={stopContraction} className="w-full rounded-md bg-neutral-700 px-4 py-6 text-lg text-white">
          Stop contraction
        </button>
      ) : (
        <button type="button" onClick={startContraction} className="w-full rounded-md bg-rose-600 px-4 py-6 text-lg text-white">
          Start contraction
        </button>
      )}

      {status.meetsCriteria && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {status.message}
        </p>
      )}

      <button type="button" onClick={save} className="w-full rounded-md border px-4 py-2">
        Save session
      </button>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-600">Recent sessions</h2>
        {contractionSessions.length === 0 ? (
          <p className="text-sm text-neutral-500">No sessions yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-neutral-700">
            {contractionSessions.map((s) => (
              <li key={s.id}>{s.date}: {s.contractions.length} contractions</li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[11px] text-neutral-500">
        This timer is informational only and does not diagnose labor. Follow your provider&apos;s guidance.
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Create the route**

Create `app/pregnancy/contractions/page.tsx`:

```tsx
import { ContractionTimer } from '@/src/components/ContractionTimer';

export default function ContractionsPage() {
  return <ContractionTimer />;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/ContractionTimer.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ContractionTimer.tsx src/components/ContractionTimer.test.tsx app/pregnancy/contractions/page.tsx
git commit -m "feat(pregnancy): add contraction timer tool"
```

---

## Task 17: PregnancyControls (settings: enter/edit mode) + settings wiring

**Files:**
- Create: `src/components/PregnancyControls.tsx`
- Modify: `app/settings/page.tsx`
- Test: `src/components/PregnancyControls.test.tsx`

**Interfaces:**
- Consumes: `useHealthData` (`isPregnant`, `pregnancyProfile`, `startPregnancyMode`, `updateDueDate`, `cycles`); `PregnancyEndFlow` (Task 18 — imported but the End-flow itself is built in Task 18; for THIS task, render a placeholder button region that Task 18 fills. To avoid a forward dependency, Task 17 ships the enter/edit UI only and a `<PregnancyEndFlow />` slot is added in Task 18).
- Produces: `PregnancyControls()` — when not pregnant, a form to start pregnancy (radio: enter due date / enter LMP / use my last period); when pregnant, shows due date with an edit field.

- [ ] **Step 1: Write the failing test**

Create `src/components/PregnancyControls.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PregnancyControls } from './PregnancyControls';

const startPregnancyMode = vi.fn().mockResolvedValue(undefined);
const updateDueDate = vi.fn().mockResolvedValue(undefined);
let mockState: Record<string, unknown>;
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => mockState,
}));

beforeEach(() => {
  startPregnancyMode.mockClear();
  updateDueDate.mockClear();
  mockState = {
    isPregnant: false,
    pregnancyProfile: null,
    startPregnancyMode,
    updateDueDate,
    cycles: [{ id: 'c1', startDate: '2026-01-01' }],
  };
});

describe('PregnancyControls', () => {
  it('starts pregnancy from an entered due date', () => {
    render(<PregnancyControls />);
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-10-08' } });
    fireEvent.click(screen.getByRole('button', { name: /start pregnancy mode/i }));
    expect(startPregnancyMode).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: '2026-10-08' }),
    );
  });

  it('shows the due date when already pregnant', () => {
    mockState = {
      ...mockState,
      isPregnant: true,
      pregnancyProfile: { id: 'current', dueDate: '2026-10-08', dueDateSource: 'lmp', startedAt: '2026-01-10', status: 'active' },
    };
    render(<PregnancyControls />);
    expect(screen.getByText(/2026-10-08/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PregnancyControls.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/PregnancyControls.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { todayISO } from '@/src/domain/dates';

type Method = 'due' | 'lmp' | 'cycle';

export function PregnancyControls() {
  const { isPregnant, pregnancyProfile, startPregnancyMode, updateDueDate, cycles } =
    useHealthData();
  const [method, setMethod] = useState<Method>('due');
  const [value, setValue] = useState('');
  const [editDue, setEditDue] = useState('');

  const lastPeriodStart = cycles.at(-1)?.startDate ?? null;

  function start() {
    if (method === 'due') {
      if (!value) return;
      startPregnancyMode({ dueDate: value });
    } else if (method === 'lmp') {
      if (!value) return;
      startPregnancyMode({ lmp: value });
    } else {
      if (!lastPeriodStart) return;
      startPregnancyMode({ lmp: lastPeriodStart, source: 'cycle', useCycleLength: true });
    }
  }

  if (isPregnant && pregnancyProfile) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-neutral-700">
          Pregnancy mode is on. Due date: <span className="font-medium">{pregnancyProfile.dueDate}</span>.
        </p>
        <div className="flex items-end gap-2">
          <label className="flex-1 text-sm">
            Edit due date
            <input
              type="date"
              aria-label="edit due date"
              value={editDue}
              onChange={(e) => setEditDue(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={() => editDue && updateDueDate(editDue, 'manual')}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <fieldset className="space-y-2 text-sm">
        <legend className="text-neutral-700">How would you like to start?</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="preg-method" checked={method === 'due'} onChange={() => setMethod('due')} />
          Enter my due date
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="preg-method" checked={method === 'lmp'} onChange={() => setMethod('lmp')} />
          Enter my last period date (LMP)
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="preg-method" checked={method === 'cycle'} onChange={() => setMethod('cycle')} disabled={!lastPeriodStart} />
          Use my last logged period{lastPeriodStart ? ` (${lastPeriodStart})` : ' (none yet)'}
        </label>
      </fieldset>

      {method !== 'cycle' && (
        <label className="block text-sm">
          {method === 'due' ? 'Due date' : 'Last period start'}
          <input
            type="date"
            aria-label={method === 'due' ? 'due date' : 'last period start'}
            max={method === 'lmp' ? todayISO() : undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
      )}

      <button type="button" onClick={start} className="w-full rounded-md bg-rose-600 px-4 py-2 text-white">
        Start pregnancy mode
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Wire into settings**

In `app/settings/page.tsx`, add the import:

```tsx
import { PregnancyControls } from '@/src/components/PregnancyControls';
```

Add a section before the "Your data" section:

```tsx
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600">Pregnancy</h2>
        <p className="text-xs text-neutral-500">
          Switch on pregnancy mode for week-by-week tracking, a kick counter, and a
          contraction timer. Educational only — not a substitute for medical care.
        </p>
        <PregnancyControls />
      </section>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/PregnancyControls.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/PregnancyControls.tsx src/components/PregnancyControls.test.tsx app/settings/page.tsx
git commit -m "feat(pregnancy): add PregnancyControls and settings section"
```

---

## Task 18: PregnancyEndFlow (birth + compassionate loss)

**Files:**
- Create: `src/components/PregnancyEndFlow.tsx`
- Modify: `src/components/PregnancyControls.tsx` (render `<PregnancyEndFlow />` when pregnant)
- Test: `src/components/PregnancyEndFlow.test.tsx`

**Interfaces:**
- Consumes: `useHealthData` (`endPregnancyBirth`, `endPregnancyLoss`).
- Produces: `PregnancyEndFlow()` — a "Manage pregnancy" disclosure offering two paths: "Baby arrived" (birth) and "My pregnancy has ended" (loss). The loss path shows a compassionate screen with supportive resources and NO celebratory or period/prediction copy, then calls `endPregnancyLoss`.

- [ ] **Step 1: Write the failing test**

Create `src/components/PregnancyEndFlow.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PregnancyEndFlow } from './PregnancyEndFlow';

const endPregnancyBirth = vi.fn().mockResolvedValue(undefined);
const endPregnancyLoss = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({ endPregnancyBirth, endPregnancyLoss }),
}));

beforeEach(() => {
  endPregnancyBirth.mockClear();
  endPregnancyLoss.mockClear();
});

describe('PregnancyEndFlow', () => {
  it('records a birth', () => {
    render(<PregnancyEndFlow />);
    fireEvent.click(screen.getByRole('button', { name: /manage pregnancy/i }));
    fireEvent.click(screen.getByRole('button', { name: /baby arrived/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(endPregnancyBirth).toHaveBeenCalledTimes(1);
  });

  it('handles loss compassionately without celebratory or period prompts', () => {
    render(<PregnancyEndFlow />);
    fireEvent.click(screen.getByRole('button', { name: /manage pregnancy/i }));
    fireEvent.click(screen.getByRole('button', { name: /my pregnancy has ended/i }));

    // Compassionate copy present; no celebratory or period-logging prompts.
    expect(screen.getByText(/so sorry/i)).toBeTruthy();
    expect(screen.queryByText(/congratulations/i)).toBeNull();
    expect(screen.queryByText(/log your period/i)).toBeNull();
    expect(screen.queryByText(/last period/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /return to cycle mode/i }));
    expect(endPregnancyLoss).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PregnancyEndFlow.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/PregnancyEndFlow.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { todayISO } from '@/src/domain/dates';

type Screen = 'closed' | 'choose' | 'birth' | 'loss';

export function PregnancyEndFlow() {
  const { endPregnancyBirth, endPregnancyLoss } = useHealthData();
  const [screen, setScreen] = useState<Screen>('closed');

  if (screen === 'closed') {
    return (
      <button
        type="button"
        onClick={() => setScreen('choose')}
        className="w-full rounded-md border px-4 py-2 text-sm text-neutral-700"
      >
        Manage pregnancy
      </button>
    );
  }

  if (screen === 'choose') {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm text-neutral-700">Has your pregnancy ended?</p>
        <button type="button" onClick={() => setScreen('birth')} className="w-full rounded-md border px-4 py-2 text-sm">
          Baby arrived
        </button>
        <button type="button" onClick={() => setScreen('loss')} className="w-full rounded-md border px-4 py-2 text-sm">
          My pregnancy has ended
        </button>
        <button type="button" onClick={() => setScreen('closed')} className="w-full rounded-md px-4 py-2 text-sm text-neutral-500">
          Cancel
        </button>
      </div>
    );
  }

  if (screen === 'birth') {
    return (
      <div className="space-y-2 rounded-md border border-rose-200 bg-rose-50 p-3">
        <p className="text-sm text-neutral-700">
          Wonderful news. We&apos;ll switch you back to cycle tracking whenever you&apos;re ready.
        </p>
        <button
          type="button"
          onClick={() => endPregnancyBirth(todayISO())}
          className="w-full rounded-md bg-rose-600 px-4 py-2 text-sm text-white"
        >
          Confirm
        </button>
        <button type="button" onClick={() => setScreen('choose')} className="w-full rounded-md px-4 py-2 text-sm text-neutral-500">
          Back
        </button>
      </div>
    );
  }

  // screen === 'loss' — compassionate, no celebratory or period prompts.
  return (
    <div className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm text-neutral-700">
        We&apos;re so sorry for your loss. Take all the time you need — there&apos;s nothing you
        have to do here right now.
      </p>
      <p className="text-sm text-neutral-700">
        If it would help, support is available. You don&apos;t have to go through this alone.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
        <li>Reach out to your healthcare provider for care and guidance.</li>
        <li>Consider a pregnancy-loss support line or counseling service in your area.</li>
      </ul>
      <button
        type="button"
        onClick={() => endPregnancyLoss(todayISO())}
        className="w-full rounded-md border px-4 py-2 text-sm"
      >
        Return to cycle mode
      </button>
      <button type="button" onClick={() => setScreen('choose')} className="w-full rounded-md px-4 py-2 text-sm text-neutral-500">
        Back
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Render it inside PregnancyControls (pregnant branch)**

In `src/components/PregnancyControls.tsx`, add the import:

```tsx
import { PregnancyEndFlow } from '@/src/components/PregnancyEndFlow';
```

In the `if (isPregnant && pregnancyProfile)` return block, add `<PregnancyEndFlow />` after the edit-due-date `<div>`:

```tsx
        <PregnancyEndFlow />
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/PregnancyEndFlow.test.tsx src/components/PregnancyControls.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/PregnancyEndFlow.tsx src/components/PregnancyControls.tsx
git commit -m "feat(pregnancy): add compassionate birth/loss exit flow"
```

---

## Task 19: Onboarding — "I'm pregnant" goal

**Files:**
- Modify: `src/components/OnboardingForm.tsx`
- Test: `src/components/OnboardingForm.test.tsx` (create if absent; otherwise extend)

**Interfaces:**
- Consumes: `useHealthData` (`startPeriod`, `startPregnancyMode`).
- Produces: onboarding offers two goals — "Track my cycle" (existing: enters a period start) and "I'm pregnant" (captures a due date and calls `startPregnancyMode`, then `onComplete`).

- [ ] **Step 1: Write the failing test**

Create/extend `src/components/OnboardingForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingForm } from './OnboardingForm';

const startPeriod = vi.fn().mockResolvedValue(undefined);
const startPregnancyMode = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({ startPeriod, startPregnancyMode }),
}));

beforeEach(() => {
  startPeriod.mockClear();
  startPregnancyMode.mockClear();
});

describe('OnboardingForm', () => {
  it('starts cycle tracking by default', async () => {
    const onComplete = vi.fn();
    render(<OnboardingForm onComplete={onComplete} />);
    fireEvent.submit(screen.getByRole('button', { name: /get started/i }).closest('form')!);
    expect(startPeriod).toHaveBeenCalled();
  });

  it('starts pregnancy mode when the pregnant goal is chosen', () => {
    const onComplete = vi.fn();
    render(<OnboardingForm onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /i'm pregnant/i }));
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-10-08' } });
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(startPregnancyMode).toHaveBeenCalledWith(expect.objectContaining({ dueDate: '2026-10-08' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/OnboardingForm.test.tsx`
Expected: FAIL — no pregnant goal / `startPregnancyMode` not called.

- [ ] **Step 3: Implement**

Replace `src/components/OnboardingForm.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { todayISO } from '@/src/domain/dates';

type Goal = 'cycle' | 'pregnant';

export function OnboardingForm({ onComplete }: { onComplete: () => void }) {
  const { startPeriod, startPregnancyMode } = useHealthData();
  const [goal, setGoal] = useState<Goal>('cycle');
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (goal === 'pregnant') {
      if (dueDate) await startPregnancyMode({ dueDate });
    } else {
      await startPeriod(date);
    }
    setSaving(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Let&apos;s set things up. This stays private on your device.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <button
          type="button"
          aria-pressed={goal === 'cycle'}
          onClick={() => setGoal('cycle')}
          className={`rounded-md border px-4 py-2 ${goal === 'cycle' ? 'border-rose-600 bg-rose-600 text-white' : 'border-neutral-300'}`}
        >
          Track my cycle
        </button>
        <button
          type="button"
          aria-pressed={goal === 'pregnant'}
          onClick={() => setGoal('pregnant')}
          className={`rounded-md border px-4 py-2 ${goal === 'pregnant' ? 'border-rose-600 bg-rose-600 text-white' : 'border-neutral-300'}`}
        >
          I&apos;m pregnant
        </button>
      </div>

      {goal === 'cycle' ? (
        <div className="space-y-2">
          <label htmlFor="last-period" className="block text-sm font-medium">
            When did your last period start?
          </label>
          <input
            id="last-period"
            aria-label="last period start"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <label htmlFor="due-date" className="block text-sm font-medium">
            What is your due date?
          </label>
          <input
            id="due-date"
            aria-label="due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-rose-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        Get started
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/OnboardingForm.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/OnboardingForm.tsx src/components/OnboardingForm.test.tsx
git commit -m "feat(pregnancy): add I'm-pregnant onboarding goal"
```

---

## Task 20: DailyLogForm — pregnancy symptom group

**Files:**
- Modify: `src/components/DailyLogForm.tsx`
- Test: `src/components/DailyLogForm.pregnancy.test.tsx` (create)

**Interfaces:**
- Consumes: `useHealthData` (`isPregnant`); `PREGNANCY_SYMPTOM_OPTIONS` (Task 1); existing `SYMPTOM_OPTIONS`.
- Produces: when `isPregnant`, the symptom chooser also offers `PREGNANCY_SYMPTOM_OPTIONS` (deduped with the base set).

- [ ] **Step 1: Read the current form**

Read `src/components/DailyLogForm.tsx` to locate where `SYMPTOM_OPTIONS` is mapped into selectable chips and how `useHealthData` is consumed.

- [ ] **Step 2: Write the failing test**

Create `src/components/DailyLogForm.pregnancy.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyLogForm } from './DailyLogForm';

let isPregnant = false;
const saveLog = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({
    isPregnant,
    saveLog,
    dailyLogs: [],
    lifeStage: isPregnant ? 'pregnancy' : 'cycle',
    bbtUnit: 'C',
  }),
}));

beforeEach(() => {
  isPregnant = false;
});

describe('DailyLogForm pregnancy symptoms', () => {
  it('does not show pregnancy symptoms in cycle mode', () => {
    render(<DailyLogForm date="2026-06-21" />);
    expect(screen.queryByText('Braxton Hicks')).toBeNull();
  });

  it('shows pregnancy symptoms in pregnancy mode', () => {
    isPregnant = true;
    render(<DailyLogForm date="2026-06-21" />);
    expect(screen.getByText('Braxton Hicks')).toBeTruthy();
  });
});
```

(If `DailyLogForm` requires different props than `date`, adjust the render call to match its actual signature discovered in Step 1.)

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/DailyLogForm.pregnancy.test.tsx`
Expected: FAIL — pregnancy symptoms not rendered.

- [ ] **Step 4: Implement**

In `src/components/DailyLogForm.tsx`:
- Import the pregnancy options and read `isPregnant`:

```tsx
import { SYMPTOM_OPTIONS, PREGNANCY_SYMPTOM_OPTIONS } from '@/src/domain/log-options';
```

- Where the component reads from `useHealthData()`, also destructure `isPregnant`.
- Compute the symptom list used by the chip map (place near the top of the component body, before the JSX):

```tsx
  const symptomChoices = isPregnant
    ? Array.from(new Set([...SYMPTOM_OPTIONS, ...PREGNANCY_SYMPTOM_OPTIONS]))
    : SYMPTOM_OPTIONS;
```

- Replace the existing `SYMPTOM_OPTIONS.map(...)` in the JSX with `symptomChoices.map(...)` (keep the same chip markup and toggle handler).

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/DailyLogForm.pregnancy.test.tsx`
Expected: PASS. Also run the existing form test to confirm no regression:
Run: `npx vitest run src/components/DailyLogForm.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/DailyLogForm.tsx src/components/DailyLogForm.pregnancy.test.tsx
git commit -m "feat(pregnancy): add pregnancy symptom group to the daily log"
```

---

## Task 21: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the entire test suite**

Run: `npm test`
Expected: ALL tests pass (existing + new pregnancy tests).

- [ ] **Step 2: Type-check + production build**

Run: `npm run build`
Expected: build succeeds; `/pregnancy`, `/pregnancy/kicks`, `/pregnancy/contractions` are emitted; no TypeScript errors.

- [ ] **Step 3: Lint (informational)**

Run: `npm run lint`
Expected: no NEW errors beyond the documented house-pattern baseline (mount-time `set-state-in-effect` hydration sites carry the existing eslint-disable comment). Fix any genuinely new lint errors introduced by pregnancy code; do not "fix" pre-existing baseline issues here.

- [ ] **Step 4: Record verification in the ledger**

Update `.git/sdd/progress.md` (or the active progress ledger) with the test/build results.

- [ ] **Step 5: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "chore(pregnancy): final verification fixes"
```

(If no fixes were needed, skip this commit.)

---

## Self-Review

**Spec coverage** (spec §2 in-scope items → tasks):
- Mode toggle / enter mode → Tasks 1 (types), 10 (mutator), 17 (settings UI), 19 (onboarding). ✓
- Due-date calc (LMP / manual / cycle import, editable) → Tasks 2, 7, 10, 17. ✓
- Week-by-week tracker (week/trimester/countdown/progress) → Tasks 3, 12, 14. ✓
- Weekly baby-development + maternal content → Tasks 4, 14. ✓
- Pregnancy-tuned symptom logging → Tasks 1, 20. ✓
- Kick counter → Tasks 5, 11, 15. ✓
- Contraction timer (+ 5-1-1) → Tasks 6, 11, 16. ✓
- Compassionate birth/loss exit → Tasks 7, 10, 18. ✓
- Export + hard-delete coverage → Tasks 8, 9. ✓
- Deferred items (weight, appointments, safety-triage prompts) → intentionally absent. ✓

**Type consistency:** `PregnancyProfile`/`KickSession`/`ContractionSession`/`Contraction` defined in Task 1 are used unchanged in Tasks 8–18. `GestationalAge`/`Trimester` from Task 3 flow into Tasks 10/12/14. `WeekContent` from Task 4 flows into Tasks 10/12/14. Hook return names (`isPregnant`, `gestation`, `currentTrimester`, `daysToDue`, `weekContentToday`, `startPregnancyMode`, `updateDueDate`, `endPregnancyBirth`, `endPregnancyLoss`, `saveKickSession`, `saveContractionSession`, `kickSessions`, `contractionSessions`) are introduced in Tasks 10/11 and consumed consistently in Tasks 13–20.

**Placeholder scan:** No "TBD"/"implement later"; all code steps include full code. Task 20 intentionally instructs reading the current `DailyLogForm` first (its exact chip markup is local), but provides the complete edit (imports, computed list, map swap) — no vague "wire it up".

**Note for executors:** Task 13 has no new unit test (pure wiring of already-tested units, verified via `npm run build`); this is deliberate, not an omission.

