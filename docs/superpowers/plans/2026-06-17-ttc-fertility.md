# Fertility / TTC Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in Trying-to-Conceive (TTC) mode: advanced fertility-signal logging, a deterministic ovulation-confirmation engine, qualitative conception guidance, and prediction refinement from confirmed ovulation.

**Architecture:** A new pure-TS observation module `src/domain/fertility/` (BBT thermal-shift detection, ovulation confirmation, conception guidance, luteal-length estimation, TTC-journey counting) feeds the existing `src/domain/prediction.ts` via an optional `observed` input. Mode/unit preferences live in `localStorage` (`lumen.*` keys, mirroring `src/security/passcode.ts`). UI surfaces (logging section, settings toggle, home card, `/fertility` view) are gated on TTC mode. All new health data stays in IndexedDB.

**Tech Stack:** Next.js 16 (App Router) + React 19, TypeScript strict, Tailwind v4, Dexie/IndexedDB, date-fns, Vitest + Testing Library + fake-indexeddb, Node 24.

## Global Constraints

- Local-first: no backend; new health signals in IndexedDB (`DailyLog`), preferences in `localStorage`.
- Deterministic & explainable: no LLM in any prediction/confirmation/guidance path; every confirmation and guidance result carries a human-readable string.
- Conception guidance is **qualitative only** (`high | medium | low`) — never a numeric probability or guarantee.
- Reuse existing types/vocab: `ISODate`, `Cycle`, `DailyLog`, `CyclePhase`, `Confidence`, `LifeStage`; date helpers `addDays`, `daysBetween`, `todayISO` from `@/src/domain/dates`.
- BBT stored canonical **°C**; unit preference (`'C' | 'F'`) governs entry/display only, converted at the UI edge. Default `'C'`.
- TTC supportive-resources threshold: **6** cycles (constant `TTC_RESOURCE_THRESHOLD`).
- Persistent non-medical disclaimer on TTC surfaces: "Lumen is not a contraceptive and not a substitute for fertility treatment or medical advice."
- TDD: failing test first, minimal impl, one commit per task. Domain core (`src/domain/fertility/`) is pure and test-first.
- This Next.js has breaking changes vs. training data — consult `node_modules/next/dist/docs/` before writing App Router code.
- Verify before "done": `npm test` + `npm run build` pass.

## File Structure

| File | Responsibility |
|---|---|
| `src/domain/types.ts` (modify) | Add `LHResult`, `MucusType`; extend `DailyLog` with optional TTC fields |
| `src/domain/fertility/types.ts` (create) | `OvulationMethod`, `OvulationConfirmation`, `ConceptionLevel`, `ConceptionGuidance` |
| `src/domain/fertility/units.ts` (create) | `cToF`, `fToC` temperature conversion |
| `src/domain/fertility/bbt.ts` (create) | `detectThermalShift` (3-over-6 rule) |
| `src/domain/fertility/confirmation.ts` (create) | `confirmOvulation` (combine BBT + LH + mucus) |
| `src/domain/fertility/luteal.ts` (create) | `estimateLutealLength` |
| `src/domain/fertility/guidance.ts` (create) | `conceptionGuidance` |
| `src/domain/fertility/journey.ts` (create) | `countTtcCycles`, `shouldShowResourceNote`, `TTC_RESOURCE_THRESHOLD` |
| `src/domain/prediction.ts` (modify) | Accept optional `observed: ObservedFertility` |
| `src/domain/log-options.ts` (modify) | Add `MUCUS_OPTIONS`, `LH_OPTIONS` |
| `src/settings/preferences.ts` (create) | `localStorage` get/set for lifeStage, bbtUnit, ttcStartDate |
| `src/state/useHealthData.ts` (modify) | Read prefs, compute confirmation/guidance/luteal, thread `observed`, expose |
| `src/components/DailyLogForm.tsx` (modify) | TTC signal section (TTC mode only) |
| `src/components/TtcControls.tsx` (create) | Settings toggle: TTC mode + BBT unit |
| `src/components/ConceptionCard.tsx` (create) | Home conception card |
| `src/components/BbtChart.tsx` (create) | Inline SVG BBT chart with coverline + ovulation marker |
| `src/components/FertilityView.tsx` (create) | `/fertility` assembly: chart, timeline, confirmation, guidance, disclaimer, resource note |
| `app/fertility/page.tsx` (create) | Route for the fertility view |
| `app/settings/page.tsx` (modify) | Mount `TtcControls` |
| `app/page.tsx` (modify) | Mount `ConceptionCard` in TTC mode + Fertility nav link |

---

### Task 1: Data model — extend `DailyLog` + fertility types

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/domain/fertility/types.ts`
- Test: `src/domain/fertility/types.test.ts`

**Interfaces:**
- Produces: `LHResult = 'negative' | 'positive'`; `MucusType = 'dry' | 'sticky' | 'creamy' | 'watery' | 'egg-white'`; `DailyLog` gains optional `bbt?: number` (°C), `lh?: LHResult`, `mucus?: MucusType`, `intercourse?: boolean`, `intercourseProtected?: boolean`. `OvulationMethod = 'bbt' | 'lh' | 'mucus'`; `OvulationConfirmation { cycleId: string; ovulationDate: ISODate; status: 'confirmed' | 'likely'; methods: OvulationMethod[]; confidence: Confidence; explanation: string }`; `ConceptionLevel = 'high' | 'medium' | 'low'`; `ConceptionGuidance { date: ISODate; level: ConceptionLevel; label: string; reason: string }`.

- [ ] **Step 1: Write the failing test**

`src/domain/fertility/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import type { DailyLog } from '@/src/domain/types';
import type {
  OvulationConfirmation,
  ConceptionGuidance,
} from '@/src/domain/fertility/types';

describe('fertility types', () => {
  it('DailyLog accepts optional TTC signal fields', () => {
    const log: DailyLog = {
      date: '2026-06-10',
      symptoms: [],
      moods: [],
      bbt: 36.55,
      lh: 'positive',
      mucus: 'egg-white',
      intercourse: true,
      intercourseProtected: false,
    };
    expect(log.bbt).toBe(36.55);
    expect(log.lh).toBe('positive');
  });

  it('OvulationConfirmation and ConceptionGuidance shapes compile', () => {
    const conf: OvulationConfirmation = {
      cycleId: 'c1',
      ovulationDate: '2026-06-12',
      status: 'confirmed',
      methods: ['bbt', 'lh'],
      confidence: 'high',
      explanation: 'x',
    };
    const g: ConceptionGuidance = {
      date: '2026-06-12',
      level: 'high',
      label: 'High chance to conceive',
      reason: 'x',
    };
    expect(conf.methods).toContain('bbt');
    expect(g.level).toBe('high');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/fertility/types.test.ts`
Expected: FAIL — cannot find module `@/src/domain/fertility/types` / properties missing on `DailyLog`.

- [ ] **Step 3: Implement**

In `src/domain/types.ts`, add after `FlowIntensity`:
```ts
export type LHResult = 'negative' | 'positive';
export type MucusType = 'dry' | 'sticky' | 'creamy' | 'watery' | 'egg-white';
```
Extend `DailyLog`:
```ts
export interface DailyLog {
  date: ISODate;
  flow?: FlowIntensity;
  symptoms: string[];
  moods: string[];
  notes?: string;
  // TTC signals (Phase 3) — optional, only set in TTC mode
  bbt?: number; // canonical °C
  lh?: LHResult;
  mucus?: MucusType;
  intercourse?: boolean;
  intercourseProtected?: boolean;
}
```
Create `src/domain/fertility/types.ts`:
```ts
import type { Confidence, ISODate } from '@/src/domain/types';

export type OvulationMethod = 'bbt' | 'lh' | 'mucus';

export interface OvulationConfirmation {
  cycleId: string;
  ovulationDate: ISODate;
  status: 'confirmed' | 'likely';
  methods: OvulationMethod[];
  confidence: Confidence;
  explanation: string;
}

export type ConceptionLevel = 'high' | 'medium' | 'low';

export interface ConceptionGuidance {
  date: ISODate;
  level: ConceptionLevel;
  label: string;
  reason: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/fertility/types.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/domain/fertility/types.ts src/domain/fertility/types.test.ts
git commit -m "feat(ttc): extend DailyLog with fertility signals + add fertility types"
```

---

### Task 2: Temperature unit conversion — `units.ts`

**Files:**
- Create: `src/domain/fertility/units.ts`
- Test: `src/domain/fertility/units.test.ts`

**Interfaces:**
- Produces: `cToF(c: number): number`, `fToC(f: number): number` (both rounded to 2 decimals).

- [ ] **Step 1: Write the failing test**

`src/domain/fertility/units.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { cToF, fToC } from '@/src/domain/fertility/units';

describe('temperature units', () => {
  it('converts °C to °F', () => {
    expect(cToF(36.5)).toBe(97.7);
    expect(cToF(37)).toBe(98.6);
  });
  it('converts °F to °C', () => {
    expect(fToC(98.6)).toBe(37);
    expect(fToC(97.7)).toBe(36.5);
  });
  it('round-trips within rounding', () => {
    expect(fToC(cToF(36.55))).toBeCloseTo(36.55, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/fertility/units.test.ts`
Expected: FAIL — cannot find module `units`.

- [ ] **Step 3: Implement**

`src/domain/fertility/units.ts`:
```ts
export function cToF(c: number): number {
  return Math.round((c * (9 / 5) + 32) * 100) / 100;
}

export function fToC(f: number): number {
  return Math.round(((f - 32) * (5 / 9)) * 100) / 100;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/fertility/units.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/fertility/units.ts src/domain/fertility/units.test.ts
git commit -m "feat(ttc): BBT °C/°F conversion helpers"
```

---

### Task 3: BBT thermal-shift detection — `bbt.ts`

**Files:**
- Create: `src/domain/fertility/bbt.ts`
- Test: `src/domain/fertility/bbt.test.ts`

**Interfaces:**
- Consumes: `addDays` from `@/src/domain/dates`.
- Produces: `interface BbtReading { date: ISODate; bbt: number }`; `interface ThermalShift { shiftDetected: boolean; coverline?: number; ovulationDate?: ISODate; firstHighDate?: ISODate; sustainedRise?: boolean }`; `detectThermalShift(readings: BbtReading[]): ThermalShift`.

Rule: needs ≥6 readings before a candidate rise. Coverline = max of the 6 preceding readings. Shift = 3 consecutive readings strictly above the coverline. Ovulation day = day before the first high reading. `sustainedRise` = all 3 highs ≥ coverline + 0.2. Returns the earliest qualifying shift; `{ shiftDetected: false }` otherwise.

- [ ] **Step 1: Write the failing test**

`src/domain/fertility/bbt.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { detectThermalShift } from '@/src/domain/fertility/bbt';

function series(temps: number[], start = '2026-06-01') {
  // sequential daily readings from `start`
  const base = new Date(`${start}T00:00:00Z`);
  return temps.map((bbt, i) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), bbt };
  });
}

describe('detectThermalShift', () => {
  it('detects a clear biphasic shift', () => {
    // 6 lows (36.4) then 3 highs (36.7)
    const r = series([36.4, 36.4, 36.4, 36.4, 36.4, 36.4, 36.7, 36.7, 36.7]);
    const out = detectThermalShift(r);
    expect(out.shiftDetected).toBe(true);
    expect(out.coverline).toBe(36.4);
    expect(out.firstHighDate).toBe('2026-06-07'); // 7th reading
    expect(out.ovulationDate).toBe('2026-06-06'); // day before first high
    expect(out.sustainedRise).toBe(true);
  });

  it('returns no shift for a flat series', () => {
    const r = series([36.5, 36.5, 36.5, 36.5, 36.5, 36.5, 36.5, 36.5, 36.5]);
    expect(detectThermalShift(r).shiftDetected).toBe(false);
  });

  it('returns no shift with fewer than 9 readings', () => {
    const r = series([36.4, 36.4, 36.4, 36.4, 36.4, 36.4, 36.7, 36.7]);
    expect(detectThermalShift(r).shiftDetected).toBe(false);
  });

  it('flags a small rise as not sustained', () => {
    const r = series([36.4, 36.4, 36.4, 36.4, 36.4, 36.4, 36.5, 36.5, 36.5]);
    const out = detectThermalShift(r);
    expect(out.shiftDetected).toBe(true);
    expect(out.sustainedRise).toBe(false); // only +0.1
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/fertility/bbt.test.ts`
Expected: FAIL — cannot find module `bbt`.

- [ ] **Step 3: Implement**

`src/domain/fertility/bbt.ts`:
```ts
import type { ISODate } from '@/src/domain/types';
import { addDays } from '@/src/domain/dates';

export interface BbtReading {
  date: ISODate;
  bbt: number; // °C
}

export interface ThermalShift {
  shiftDetected: boolean;
  coverline?: number;
  ovulationDate?: ISODate;
  firstHighDate?: ISODate;
  sustainedRise?: boolean;
}

export function detectThermalShift(readings: BbtReading[]): ThermalShift {
  const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 6; i + 2 < sorted.length; i++) {
    const prev6 = sorted.slice(i - 6, i).map((r) => r.bbt);
    const coverline = Math.max(...prev6);
    const highs = [sorted[i], sorted[i + 1], sorted[i + 2]];
    if (highs.every((r) => r.bbt > coverline)) {
      return {
        shiftDetected: true,
        coverline,
        firstHighDate: sorted[i].date,
        ovulationDate: addDays(sorted[i].date, -1),
        sustainedRise: highs.every((r) => r.bbt >= coverline + 0.2),
      };
    }
  }
  return { shiftDetected: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/fertility/bbt.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/fertility/bbt.ts src/domain/fertility/bbt.test.ts
git commit -m "feat(ttc): BBT thermal-shift detection (3-over-6 rule)"
```

---

### Task 4: Ovulation confirmation — `confirmation.ts`

**Files:**
- Create: `src/domain/fertility/confirmation.ts`
- Test: `src/domain/fertility/confirmation.test.ts`

**Interfaces:**
- Consumes: `detectThermalShift`, `BbtReading` from `./bbt`; `OvulationConfirmation`, `OvulationMethod` from `./types`; `addDays`, `daysBetween` from `@/src/domain/dates`; `Cycle`, `DailyLog`, `ISODate`, `Confidence` from `@/src/domain/types`.
- Produces: `confirmOvulation(logs: DailyLog[], cycle: Cycle, nextStart?: ISODate): OvulationConfirmation | null`. `nextStart` bounds the cycle window (logs with `date < nextStart`); omit for the current (latest) cycle.

Combination rules:
- BBT shift present → `confirmed` at the BBT ovulation day. `confidence: 'high'` if LH+ (expected ovulation = day after first positive) or mucus peak (last egg-white/watery day) falls within ±2 days of the BBT estimate; else `'medium'`. `methods` includes `'bbt'` always, and `'lh'`/`'mucus'` only when they corroborate within ±2 days.
- No BBT shift, but LH+ and mucus peak within ±2 days → `likely`, `'medium'`, methods `['lh','mucus']`, ovulation = day after first LH+.
- LH+ only → `likely`, `'low'`, ovulation = day after first LH+.
- Mucus peak only → `likely`, `'low'`, ovulation = peak day.
- Nothing usable → `null`.

- [ ] **Step 1: Write the failing test**

`src/domain/fertility/confirmation.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { confirmOvulation } from '@/src/domain/fertility/confirmation';
import type { Cycle, DailyLog } from '@/src/domain/types';

const cycle: Cycle = { id: 'c1', startDate: '2026-06-01' };

function log(date: string, extra: Partial<DailyLog>): DailyLog {
  return { date, symptoms: [], moods: [], ...extra };
}

// 6 lows from 06-01..06-06, 3 highs 06-07..06-09 → BBT ovulation 06-06
const bbtLogs: DailyLog[] = [
  ...[36.4, 36.4, 36.4, 36.4, 36.4, 36.4].map((t, i) =>
    log(`2026-06-0${i + 1}`, { bbt: t }),
  ),
  log('2026-06-07', { bbt: 36.7 }),
  log('2026-06-08', { bbt: 36.7 }),
  log('2026-06-09', { bbt: 36.7 }),
];

describe('confirmOvulation', () => {
  it('confirms from BBT alone at medium confidence', () => {
    const out = confirmOvulation(bbtLogs, cycle);
    expect(out?.status).toBe('confirmed');
    expect(out?.ovulationDate).toBe('2026-06-06');
    expect(out?.confidence).toBe('medium');
    expect(out?.methods).toEqual(['bbt']);
  });

  it('upgrades to high when LH+ corroborates within 2 days', () => {
    const logs = bbtLogs.map((l) =>
      l.date === '2026-06-05' ? { ...l, lh: 'positive' as const } : l,
    );
    const out = confirmOvulation(logs, cycle);
    expect(out?.confidence).toBe('high');
    expect(out?.methods).toContain('lh');
  });

  it('marks likely (medium) from LH+ and mucus peak with no BBT', () => {
    const logs = [
      log('2026-06-05', { lh: 'positive' }),
      log('2026-06-06', { mucus: 'egg-white' }),
    ];
    const out = confirmOvulation(logs, cycle);
    expect(out?.status).toBe('likely');
    expect(out?.confidence).toBe('medium');
    expect(out?.ovulationDate).toBe('2026-06-06'); // day after LH+
  });

  it('marks likely (low) from LH+ only', () => {
    const out = confirmOvulation([log('2026-06-05', { lh: 'positive' })], cycle);
    expect(out?.status).toBe('likely');
    expect(out?.confidence).toBe('low');
    expect(out?.methods).toEqual(['lh']);
  });

  it('returns null with no usable signals', () => {
    expect(confirmOvulation([log('2026-06-05', { flow: 'light' })], cycle)).toBeNull();
  });

  it('excludes logs at/after nextStart', () => {
    const logs = [...bbtLogs, log('2026-07-02', { lh: 'positive' })];
    const out = confirmOvulation(logs, cycle, '2026-07-01');
    expect(out?.methods).toEqual(['bbt']); // the July LH+ is in the next cycle
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/fertility/confirmation.test.ts`
Expected: FAIL — cannot find module `confirmation`.

- [ ] **Step 3: Implement**

`src/domain/fertility/confirmation.ts`:
```ts
import type { Cycle, Confidence, DailyLog, ISODate } from '@/src/domain/types';
import type { OvulationConfirmation, OvulationMethod } from './types';
import { detectThermalShift, type BbtReading } from './bbt';
import { addDays, daysBetween } from '@/src/domain/dates';

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function buildExplanation(
  status: 'confirmed' | 'likely',
  methods: OvulationMethod[],
  ov: ISODate,
): string {
  const phrase: Record<OvulationMethod, string> = {
    bbt: 'a sustained temperature rise',
    lh: 'a positive LH test',
    mucus: 'fertile (egg-white) cervical mucus',
  };
  const verb = status === 'confirmed' ? 'confirmed' : 'estimated';
  return `Ovulation ${verb} around ${ov}, based on ${joinList(
    methods.map((m) => phrase[m]),
  )}.`;
}

export function confirmOvulation(
  logs: DailyLog[],
  cycle: Cycle,
  nextStart?: ISODate,
): OvulationConfirmation | null {
  const cycleLogs = logs
    .filter((l) => l.date >= cycle.startDate && (!nextStart || l.date < nextStart))
    .sort((a, b) => a.date.localeCompare(b.date));

  const bbtReadings: BbtReading[] = cycleLogs
    .filter((l) => typeof l.bbt === 'number')
    .map((l) => ({ date: l.date, bbt: l.bbt as number }));
  const shift = detectThermalShift(bbtReadings);

  const firstLhPos = cycleLogs.find((l) => l.lh === 'positive')?.date ?? null;
  const lhOv = firstLhPos ? addDays(firstLhPos, 1) : null;

  const mucusPeak =
    cycleLogs
      .filter((l) => l.mucus === 'egg-white' || l.mucus === 'watery')
      .map((l) => l.date)
      .sort((a, b) => a.localeCompare(b))
      .at(-1) ?? null;

  const within2 = (a: ISODate, b: ISODate) => Math.abs(daysBetween(a, b)) <= 2;
  const mk = (
    ovulationDate: ISODate,
    status: 'confirmed' | 'likely',
    methods: OvulationMethod[],
    confidence: Confidence,
  ): OvulationConfirmation => ({
    cycleId: cycle.id,
    ovulationDate,
    status,
    methods,
    confidence,
    explanation: buildExplanation(status, methods, ovulationDate),
  });

  if (shift.shiftDetected && shift.ovulationDate) {
    const ov = shift.ovulationDate;
    const methods: OvulationMethod[] = ['bbt'];
    let corroborated = false;
    if (lhOv && within2(lhOv, ov)) {
      methods.push('lh');
      corroborated = true;
    }
    if (mucusPeak && within2(mucusPeak, ov)) {
      methods.push('mucus');
      corroborated = true;
    }
    return mk(ov, 'confirmed', methods, corroborated ? 'high' : 'medium');
  }

  if (lhOv && mucusPeak && within2(lhOv, mucusPeak)) {
    return mk(lhOv, 'likely', ['lh', 'mucus'], 'medium');
  }
  if (lhOv) return mk(lhOv, 'likely', ['lh'], 'low');
  if (mucusPeak) return mk(mucusPeak, 'likely', ['mucus'], 'low');
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/fertility/confirmation.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/fertility/confirmation.ts src/domain/fertility/confirmation.test.ts
git commit -m "feat(ttc): ovulation confirmation from BBT + LH + mucus"
```

---

### Task 5: Luteal-length estimation — `luteal.ts`

**Files:**
- Create: `src/domain/fertility/luteal.ts`
- Test: `src/domain/fertility/luteal.test.ts`

**Interfaces:**
- Consumes: `OvulationConfirmation` from `./types`; `Cycle` from `@/src/domain/types`; `daysBetween` from `@/src/domain/dates`.
- Produces: `estimateLutealLength(confirmations: OvulationConfirmation[], cycles: Cycle[]): number | null`. Median (rounded) of confirmed-ovulation→next-period intervals; `null` with < 2 intervals.

- [ ] **Step 1: Write the failing test**

`src/domain/fertility/luteal.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { estimateLutealLength } from '@/src/domain/fertility/luteal';
import type { Cycle } from '@/src/domain/types';
import type { OvulationConfirmation } from '@/src/domain/fertility/types';

const cycles: Cycle[] = [
  { id: 'c1', startDate: '2026-01-01' },
  { id: 'c2', startDate: '2026-01-29' }, // c1 luteal: ov 2026-01-15 → 14
  { id: 'c3', startDate: '2026-02-26' }, // c2 luteal: ov 2026-02-13 → 13
];

function conf(cycleId: string, ovulationDate: string): OvulationConfirmation {
  return { cycleId, ovulationDate, status: 'confirmed', methods: ['bbt'], confidence: 'medium', explanation: '' };
}

describe('estimateLutealLength', () => {
  it('returns the median interval (rounded)', () => {
    const out = estimateLutealLength(
      [conf('c1', '2026-01-15'), conf('c2', '2026-02-13')],
      cycles,
    );
    expect(out).toBe(14); // median(14, 13) = 13.5 → 14
  });

  it('returns null with fewer than 2 confirmed intervals', () => {
    expect(estimateLutealLength([conf('c1', '2026-01-15')], cycles)).toBeNull();
  });

  it('ignores likely (non-confirmed) and last-cycle confirmations', () => {
    const likely: OvulationConfirmation = { ...conf('c1', '2026-01-15'), status: 'likely' };
    expect(estimateLutealLength([likely, conf('c3', '2026-03-12')], cycles)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/fertility/luteal.test.ts`
Expected: FAIL — cannot find module `luteal`.

- [ ] **Step 3: Implement**

`src/domain/fertility/luteal.ts`:
```ts
import type { Cycle } from '@/src/domain/types';
import type { OvulationConfirmation } from './types';
import { daysBetween } from '@/src/domain/dates';

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const m =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Math.round(m);
}

export function estimateLutealLength(
  confirmations: OvulationConfirmation[],
  cycles: Cycle[],
): number | null {
  const sorted = [...cycles].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
  const intervals: number[] = [];
  for (const conf of confirmations) {
    if (conf.status !== 'confirmed') continue;
    const idx = sorted.findIndex((c) => c.id === conf.cycleId);
    const next = idx >= 0 ? sorted[idx + 1] : undefined;
    if (!next) continue;
    const days = daysBetween(conf.ovulationDate, next.startDate);
    if (days > 0) intervals.push(days);
  }
  if (intervals.length < 2) return null;
  return median(intervals);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/fertility/luteal.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/fertility/luteal.ts src/domain/fertility/luteal.test.ts
git commit -m "feat(ttc): estimate real luteal length from confirmed ovulations"
```

---

### Task 6: Conception guidance — `guidance.ts`

**Files:**
- Create: `src/domain/fertility/guidance.ts`
- Test: `src/domain/fertility/guidance.test.ts`

**Interfaces:**
- Consumes: `ConceptionGuidance`, `ConceptionLevel`, `OvulationConfirmation` from `./types`; `DailyLog`, `ISODate`, `Prediction` from `@/src/domain/types`; `daysBetween` from `@/src/domain/dates`.
- Produces: `conceptionGuidance(date: ISODate, prediction: Prediction | null, confirmation: OvulationConfirmation | null, todaysLog: DailyLog | undefined): ConceptionGuidance`.

Levels (offset = `date − ovulationDay`): direct-signal override first (LH+ today or egg-white today → high); confirmed ovulation already passed → low ("Ovulation has passed this cycle."); offset 0/−1/−2 → high; offset −3..−5 or +1 → medium; else low. No ovulation estimate at all → low ("Not enough data yet…").

- [ ] **Step 1: Write the failing test**

`src/domain/fertility/guidance.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { conceptionGuidance } from '@/src/domain/fertility/guidance';
import type { Prediction, DailyLog } from '@/src/domain/types';
import type { OvulationConfirmation } from '@/src/domain/fertility/types';

const prediction: Prediction = {
  nextPeriodStart: '2026-06-26',
  nextPeriodStartRange: { earliest: '2026-06-25', latest: '2026-06-27' },
  predictedPeriodLength: 5,
  fertileWindow: { start: '2026-06-07', end: '2026-06-13' },
  ovulationDate: '2026-06-12',
  confidence: 'high',
  explanation: '',
};
const log = (extra: Partial<DailyLog>): DailyLog => ({ date: '2026-06-12', symptoms: [], moods: [], ...extra });

describe('conceptionGuidance', () => {
  it('high on ovulation day', () => {
    expect(conceptionGuidance('2026-06-12', prediction, null, undefined).level).toBe('high');
  });
  it('high two days before ovulation', () => {
    expect(conceptionGuidance('2026-06-10', prediction, null, undefined).level).toBe('high');
  });
  it('medium at the window edge', () => {
    expect(conceptionGuidance('2026-06-08', prediction, null, undefined).level).toBe('medium');
  });
  it('low well outside the window', () => {
    expect(conceptionGuidance('2026-06-20', prediction, null, undefined).level).toBe('low');
  });
  it('LH+ today overrides to high', () => {
    expect(conceptionGuidance('2026-06-20', prediction, null, log({ lh: 'positive', date: '2026-06-20' })).level).toBe('high');
  });
  it('confirmed past ovulation closes the window', () => {
    const conf: OvulationConfirmation = { cycleId: 'c1', ovulationDate: '2026-06-12', status: 'confirmed', methods: ['bbt'], confidence: 'high', explanation: '' };
    const g = conceptionGuidance('2026-06-15', prediction, conf, undefined);
    expect(g.level).toBe('low');
    expect(g.reason).toMatch(/passed/i);
  });
  it('low with no ovulation estimate', () => {
    expect(conceptionGuidance('2026-06-12', null, null, undefined).level).toBe('low');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/fertility/guidance.test.ts`
Expected: FAIL — cannot find module `guidance`.

- [ ] **Step 3: Implement**

`src/domain/fertility/guidance.ts`:
```ts
import type { DailyLog, ISODate, Prediction } from '@/src/domain/types';
import type {
  ConceptionGuidance,
  ConceptionLevel,
  OvulationConfirmation,
} from './types';
import { daysBetween } from '@/src/domain/dates';

const LABEL: Record<ConceptionLevel, string> = {
  high: 'High chance to conceive',
  medium: 'Medium chance to conceive',
  low: 'Low chance to conceive',
};

function mk(date: ISODate, level: ConceptionLevel, reason: string): ConceptionGuidance {
  return { date, level, label: LABEL[level], reason };
}

export function conceptionGuidance(
  date: ISODate,
  prediction: Prediction | null,
  confirmation: OvulationConfirmation | null,
  todaysLog: DailyLog | undefined,
): ConceptionGuidance {
  if (todaysLog?.lh === 'positive') {
    return mk(date, 'high', 'Positive LH test today — ovulation is likely imminent.');
  }
  if (todaysLog?.mucus === 'egg-white') {
    return mk(date, 'high', 'Fertile egg-white mucus today — a peak-fertility sign.');
  }

  const ovDate = confirmation?.ovulationDate ?? prediction?.ovulationDate ?? null;
  if (!ovDate) {
    return mk(date, 'low', 'Not enough data yet to estimate your fertile window.');
  }

  if (confirmation?.status === 'confirmed' && date > confirmation.ovulationDate) {
    return mk(date, 'low', 'Ovulation has passed this cycle.');
  }

  const offset = daysBetween(ovDate, date); // negative = before ovulation
  if (offset === 0 || offset === -1 || offset === -2) {
    return mk(date, 'high', 'You are in your most fertile days.');
  }
  if ((offset <= -3 && offset >= -5) || offset === 1) {
    return mk(date, 'medium', 'You are near your fertile window.');
  }
  return mk(date, 'low', 'You are outside your fertile window today.');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/fertility/guidance.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/fertility/guidance.ts src/domain/fertility/guidance.test.ts
git commit -m "feat(ttc): qualitative daily conception guidance"
```

---

### Task 7: TTC journey counting — `journey.ts`

**Files:**
- Create: `src/domain/fertility/journey.ts`
- Test: `src/domain/fertility/journey.test.ts`

**Interfaces:**
- Consumes: `Cycle`, `ISODate` from `@/src/domain/types`.
- Produces: `TTC_RESOURCE_THRESHOLD = 6`; `countTtcCycles(cycles: Cycle[], ttcStartDate: ISODate | null): number` (cycles with `startDate >= ttcStartDate`); `shouldShowResourceNote(cycles: Cycle[], ttcStartDate: ISODate | null): boolean`.

- [ ] **Step 1: Write the failing test**

`src/domain/fertility/journey.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  countTtcCycles,
  shouldShowResourceNote,
  TTC_RESOURCE_THRESHOLD,
} from '@/src/domain/fertility/journey';
import type { Cycle } from '@/src/domain/types';

const cycles: Cycle[] = Array.from({ length: 8 }, (_, i) => ({
  id: `c${i}`,
  startDate: `2026-0${i + 1}-01`.replace(/0(\d\d)-/, '$1-'),
})) as Cycle[];

describe('TTC journey', () => {
  it('counts only cycles on/after the TTC start date', () => {
    expect(countTtcCycles(cycles, '2026-03-01')).toBe(6); // months 3..8
  });
  it('returns 0 when TTC start is unset', () => {
    expect(countTtcCycles(cycles, null)).toBe(0);
  });
  it('shows the resource note at the threshold', () => {
    expect(TTC_RESOURCE_THRESHOLD).toBe(6);
    expect(shouldShowResourceNote(cycles, '2026-03-01')).toBe(true);
    expect(shouldShowResourceNote(cycles, '2026-04-01')).toBe(false); // only 5
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/fertility/journey.test.ts`
Expected: FAIL — cannot find module `journey`.

- [ ] **Step 3: Implement**

`src/domain/fertility/journey.ts`:
```ts
import type { Cycle, ISODate } from '@/src/domain/types';

export const TTC_RESOURCE_THRESHOLD = 6;

export function countTtcCycles(
  cycles: Cycle[],
  ttcStartDate: ISODate | null,
): number {
  if (!ttcStartDate) return 0;
  return cycles.filter((c) => c.startDate >= ttcStartDate).length;
}

export function shouldShowResourceNote(
  cycles: Cycle[],
  ttcStartDate: ISODate | null,
): boolean {
  return countTtcCycles(cycles, ttcStartDate) >= TTC_RESOURCE_THRESHOLD;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/fertility/journey.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/fertility/journey.ts src/domain/fertility/journey.test.ts
git commit -m "feat(ttc): count TTC cycles + resource-note threshold"
```

---

### Task 8: Prediction refinement — extend `prediction.ts`

**Files:**
- Modify: `src/domain/prediction.ts`
- Test: `src/domain/prediction.ttc.test.ts`

**Interfaces:**
- Consumes: `OvulationConfirmation` from `./fertility/types`.
- Produces: `interface ObservedFertility { lutealLength?: number; currentCycleOvulation?: OvulationConfirmation }`; extended `generatePrediction(cycles: Cycle[], today: ISODate, observed?: ObservedFertility): Prediction | null`. When `observed.lutealLength` is set it replaces `LUTEAL_PHASE_LENGTH`; when `observed.currentCycleOvulation` is set its `ovulationDate` overrides the computed one (and the fertile window is recomputed around it); the explanation notes the refinement. Default (no `observed`) is byte-for-byte identical to current behavior.

- [ ] **Step 1: Write the failing test**

`src/domain/prediction.ttc.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generatePrediction } from '@/src/domain/prediction';
import type { Cycle } from '@/src/domain/types';
import type { OvulationConfirmation } from '@/src/domain/fertility/types';

const cycles: Cycle[] = [
  { id: 'c1', startDate: '2026-05-01' },
  { id: 'c2', startDate: '2026-05-29' }, // 28-day cycle
];

describe('generatePrediction with observed fertility', () => {
  it('is unchanged when no observed input is passed', () => {
    const base = generatePrediction(cycles, '2026-06-01');
    // nextPeriodStart = last start + 28 = 2026-06-26; ovulation = -14 = 2026-06-12
    expect(base?.ovulationDate).toBe('2026-06-12');
  });

  it('uses an observed luteal length instead of 14', () => {
    const out = generatePrediction(cycles, '2026-06-01', { lutealLength: 12 });
    expect(out?.ovulationDate).toBe('2026-06-14'); // nextPeriod - 12
  });

  it('overrides ovulation + fertile window with a confirmed ovulation', () => {
    const conf: OvulationConfirmation = {
      cycleId: 'c2',
      ovulationDate: '2026-06-10',
      status: 'confirmed',
      methods: ['bbt'],
      confidence: 'high',
      explanation: '',
    };
    const out = generatePrediction(cycles, '2026-06-01', { currentCycleOvulation: conf });
    expect(out?.ovulationDate).toBe('2026-06-10');
    expect(out?.fertileWindow).toEqual({ start: '2026-06-05', end: '2026-06-11' });
    expect(out?.explanation).toMatch(/logged signals|confirmed/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/prediction.ttc.test.ts`
Expected: FAIL — `generatePrediction` ignores the third argument.

- [ ] **Step 3: Implement**

In `src/domain/prediction.ts`, add the import and type near the top:
```ts
import type { OvulationConfirmation } from './fertility/types';

export interface ObservedFertility {
  lutealLength?: number;
  currentCycleOvulation?: OvulationConfirmation;
}
```
Replace `generatePrediction` with:
```ts
export function generatePrediction(
  cycles: Cycle[],
  _today: ISODate,
  observed?: ObservedFertility,
): Prediction | null {
  if (cycles.length === 0) return null;

  const stats = computeCycleStats(cycles);
  const confidence = predictionConfidence(stats);
  const start = lastStart(cycles);

  const luteal = observed?.lutealLength ?? LUTEAL_PHASE_LENGTH;
  const nextPeriodStart = addDays(start, stats.averageCycleLength);
  const margin = Math.max(1, Math.round(stats.cycleLengthStdDev));

  const refinedOvulation = observed?.currentCycleOvulation?.ovulationDate;
  const ovulationDate = refinedOvulation ?? addDays(nextPeriodStart, -luteal);
  const refined = Boolean(refinedOvulation || observed?.lutealLength);

  return {
    nextPeriodStart,
    nextPeriodStartRange: {
      earliest: addDays(nextPeriodStart, -margin),
      latest: addDays(nextPeriodStart, margin),
    },
    predictedPeriodLength: stats.averagePeriodLength,
    fertileWindow: {
      start: addDays(ovulationDate, -5),
      end: addDays(ovulationDate, 1),
    },
    ovulationDate,
    confidence,
    explanation: refined
      ? `${buildExplanation(stats, confidence)} Refined using your logged ovulation signals.`
      : buildExplanation(stats, confidence),
  };
}
```

- [ ] **Step 4: Run tests to verify pass (new + existing prediction suite)**

Run: `npx vitest run src/domain/prediction.ttc.test.ts src/domain/prediction.test.ts`
Expected: PASS (new file 3 tests; existing `prediction.test.ts` still green — default path unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/domain/prediction.ts src/domain/prediction.ttc.test.ts
git commit -m "feat(ttc): refine predictions from observed ovulation + luteal length"
```

---

### Task 9: Preferences store — `src/settings/preferences.ts`

**Files:**
- Create: `src/settings/preferences.ts`
- Test: `src/settings/preferences.test.ts`

**Interfaces:**
- Consumes: `LifeStage`, `ISODate` from `@/src/domain/types`.
- Produces: `type BbtUnit = 'C' | 'F'`; `getLifeStage(): LifeStage` (default `'cycle'`); `setLifeStage(stage: LifeStage, today: ISODate): void` (sets `ttcStartDate = today` the first time `'ttc'` is selected; clears it when leaving `'ttc'`); `getBbtUnit(): BbtUnit` (default `'C'`); `setBbtUnit(unit: BbtUnit): void`; `getTtcStartDate(): ISODate | null`. All SSR-safe.

- [ ] **Step 1: Write the failing test**

`src/settings/preferences.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLifeStage,
  setLifeStage,
  getBbtUnit,
  setBbtUnit,
  getTtcStartDate,
} from '@/src/settings/preferences';

describe('preferences', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to cycle mode and °C', () => {
    expect(getLifeStage()).toBe('cycle');
    expect(getBbtUnit()).toBe('C');
    expect(getTtcStartDate()).toBeNull();
  });

  it('stamps the TTC start date when entering TTC mode', () => {
    setLifeStage('ttc', '2026-06-17');
    expect(getLifeStage()).toBe('ttc');
    expect(getTtcStartDate()).toBe('2026-06-17');
  });

  it('does not overwrite an existing TTC start date', () => {
    setLifeStage('ttc', '2026-06-17');
    setLifeStage('ttc', '2026-07-01');
    expect(getTtcStartDate()).toBe('2026-06-17');
  });

  it('clears the TTC start date when leaving TTC mode', () => {
    setLifeStage('ttc', '2026-06-17');
    setLifeStage('cycle', '2026-08-01');
    expect(getTtcStartDate()).toBeNull();
  });

  it('persists the BBT unit', () => {
    setBbtUnit('F');
    expect(getBbtUnit()).toBe('F');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/settings/preferences.test.ts`
Expected: FAIL — cannot find module `preferences`.

- [ ] **Step 3: Implement**

`src/settings/preferences.ts`:
```ts
import type { ISODate, LifeStage } from '@/src/domain/types';

export type BbtUnit = 'C' | 'F';

const LIFESTAGE_KEY = 'lumen.settings.lifeStage';
const BBTUNIT_KEY = 'lumen.settings.bbtUnit';
const TTCSTART_KEY = 'lumen.settings.ttcStartDate';

function ls(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function getLifeStage(): LifeStage {
  return (ls()?.getItem(LIFESTAGE_KEY) as LifeStage | null) ?? 'cycle';
}

export function getTtcStartDate(): ISODate | null {
  return ls()?.getItem(TTCSTART_KEY) ?? null;
}

export function setLifeStage(stage: LifeStage, today: ISODate): void {
  const store = ls();
  if (!store) return;
  store.setItem(LIFESTAGE_KEY, stage);
  if (stage === 'ttc') {
    if (!store.getItem(TTCSTART_KEY)) store.setItem(TTCSTART_KEY, today);
  } else {
    store.removeItem(TTCSTART_KEY);
  }
}

export function getBbtUnit(): BbtUnit {
  return (ls()?.getItem(BBTUNIT_KEY) as BbtUnit | null) ?? 'C';
}

export function setBbtUnit(unit: BbtUnit): void {
  ls()?.setItem(BBTUNIT_KEY, unit);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/settings/preferences.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/settings/preferences.ts src/settings/preferences.test.ts
git commit -m "feat(ttc): localStorage preferences for life stage + BBT unit"
```

---

### Task 10: Wire `useHealthData`

**Files:**
- Modify: `src/state/useHealthData.ts`
- Test: `src/state/useHealthData.ttc.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 4–9.
- Produces (added to the hook's return): `lifeStage: LifeStage`, `bbtUnit: BbtUnit`, `ovulationConfirmation: OvulationConfirmation | null` (current cycle), `conceptionToday: ConceptionGuidance | null`, `ttcStartDate: ISODate | null`, `refreshSettings(): void`. When `lifeStage !== 'ttc'`, the TTC outputs are `null` and `prediction` is unaffected.

- [ ] **Step 1: Write the failing test**

`src/state/useHealthData.ttc.test.tsx`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { useHealthData } from '@/src/state/useHealthData';
import { db } from '@/src/data/db';
import { setLifeStage } from '@/src/settings/preferences';

describe('useHealthData TTC mode', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.cycles.clear();
    await db.dailyLogs.clear();
  });

  it('exposes null TTC outputs in cycle mode', async () => {
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.lifeStage).toBe('cycle');
    expect(result.current.conceptionToday).toBeNull();
    expect(result.current.ovulationConfirmation).toBeNull();
  });

  it('computes conception guidance in TTC mode', async () => {
    setLifeStage('ttc', '2026-06-01');
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      result.current.refreshSettings();
    });
    expect(result.current.lifeStage).toBe('ttc');
    expect(result.current.conceptionToday).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/useHealthData.ttc.test.tsx`
Expected: FAIL — `lifeStage`/`conceptionToday`/`refreshSettings` undefined.

- [ ] **Step 3: Implement**

In `src/state/useHealthData.ts` add imports:
```ts
import type { LifeStage } from '@/src/domain/types';
import { confirmOvulation } from '@/src/domain/fertility/confirmation';
import { estimateLutealLength } from '@/src/domain/fertility/luteal';
import { conceptionGuidance } from '@/src/domain/fertility/guidance';
import type { OvulationConfirmation, ConceptionGuidance } from '@/src/domain/fertility/types';
import type { ObservedFertility } from '@/src/domain/prediction';
import {
  getLifeStage,
  getBbtUnit,
  getTtcStartDate,
  type BbtUnit,
} from '@/src/settings/preferences';
```
Add settings state + loader inside `useHealthData` (after the existing `useState` calls):
```ts
const [lifeStage, setLifeStage] = useState<LifeStage>('cycle');
const [bbtUnit, setBbtUnit] = useState<BbtUnit>('C');
const [ttcStartDate, setTtcStartDate] = useState<string | null>(null);

const refreshSettings = useCallback(() => {
  setLifeStage(getLifeStage());
  setBbtUnit(getBbtUnit());
  setTtcStartDate(getTtcStartDate());
}, []);

useEffect(() => {
  refreshSettings();
}, [refreshSettings]);
```
Replace the `prediction` memo and add TTC memos (place after `stats`):
```ts
const isTtc = lifeStage === 'ttc';

const sortedCycles = useMemo(
  () => [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate)),
  [cycles],
);

const confirmations: OvulationConfirmation[] = useMemo(() => {
  if (!isTtc) return [];
  return sortedCycles
    .map((c, i) =>
      confirmOvulation(dailyLogs, c, sortedCycles[i + 1]?.startDate),
    )
    .filter((x): x is OvulationConfirmation => x !== null);
}, [isTtc, sortedCycles, dailyLogs]);

const currentCycle = sortedCycles.at(-1) ?? null;
const ovulationConfirmation: OvulationConfirmation | null = useMemo(() => {
  if (!isTtc || !currentCycle) return null;
  return confirmOvulation(dailyLogs, currentCycle);
}, [isTtc, currentCycle, dailyLogs]);

const observed: ObservedFertility | undefined = useMemo(() => {
  if (!isTtc) return undefined;
  return {
    lutealLength: estimateLutealLength(confirmations, cycles) ?? undefined,
    currentCycleOvulation: ovulationConfirmation ?? undefined,
  };
}, [isTtc, confirmations, cycles, ovulationConfirmation]);

const prediction: Prediction | null = useMemo(
  () => generatePrediction(cycles, todayISO(), observed),
  [cycles, observed],
);

const conceptionToday: ConceptionGuidance | null = useMemo(() => {
  if (!isTtc) return null;
  return conceptionGuidance(
    todayISO(),
    prediction,
    ovulationConfirmation,
    dailyLogs.find((l) => l.date === todayISO()),
  );
}, [isTtc, prediction, ovulationConfirmation, dailyLogs]);
```
(Remove the original `const prediction = useMemo(() => generatePrediction(cycles, todayISO()), [cycles]);` line — it's replaced above. Keep the insights/content memos as-is; they consume `prediction`.)
Add to the returned object:
```ts
    lifeStage,
    bbtUnit,
    ttcStartDate,
    ovulationConfirmation,
    conceptionToday,
    refreshSettings,
```

- [ ] **Step 4: Run tests to verify pass (new + existing hook suites)**

Run: `npx vitest run src/state/useHealthData.ttc.test.tsx src/state/useHealthData.test.tsx src/state/useHealthData.insights.test.tsx src/state/useHealthData.content.test.tsx`
Expected: PASS (new file 2 tests; existing hook suites still green).

- [ ] **Step 5: Commit**

```bash
git add src/state/useHealthData.ts src/state/useHealthData.ttc.test.tsx
git commit -m "feat(ttc): thread fertility signals through useHealthData"
```

---

### Task 11: Logging — TTC signal section in `DailyLogForm`

**Files:**
- Modify: `src/domain/log-options.ts`
- Modify: `src/components/DailyLogForm.tsx`
- Test: `src/components/DailyLogForm.ttc.test.tsx`

**Interfaces:**
- Consumes: `lifeStage`, `bbtUnit` from `useHealthData`; `MucusType`, `LHResult` from types; `cToF`, `fToC` from `./fertility/units`.
- Produces: `MUCUS_OPTIONS: MucusType[]`, `LH_OPTIONS: LHResult[]` in `log-options.ts`. The form, in TTC mode only, renders BBT (numeric, in `bbtUnit`), LH (negative/positive chips), mucus (chips), and intercourse (+ protection) controls, and includes them in the saved `DailyLog` (BBT converted to °C).

- [ ] **Step 1: Write the failing test**

`src/components/DailyLogForm.ttc.test.tsx`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { DailyLogForm } from '@/src/components/DailyLogForm';
import { db } from '@/src/data/db';
import { setLifeStage } from '@/src/settings/preferences';

describe('DailyLogForm TTC section', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.cycles.clear();
    await db.dailyLogs.clear();
  });

  it('hides fertility fields in cycle mode', async () => {
    render(<DailyLogForm date="2026-06-12" />);
    await waitFor(() => expect(screen.getByText('Flow')).toBeTruthy());
    expect(screen.queryByText(/Basal body temperature/i)).toBeNull();
  });

  it('shows fertility fields in TTC mode', async () => {
    setLifeStage('ttc', '2026-06-01');
    render(<DailyLogForm date="2026-06-12" />);
    await waitFor(() =>
      expect(screen.getByText(/Basal body temperature/i)).toBeTruthy(),
    );
    expect(screen.getByText(/Cervical mucus/i)).toBeTruthy();
    expect(screen.getByText(/Ovulation test/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/DailyLogForm.ttc.test.tsx`
Expected: FAIL — fertility fields not rendered.

- [ ] **Step 3: Implement**

Append to `src/domain/log-options.ts`:
```ts
import type { MucusType, LHResult } from './types';

export const MUCUS_OPTIONS: MucusType[] = [
  'dry',
  'sticky',
  'creamy',
  'watery',
  'egg-white',
];

export const LH_OPTIONS: LHResult[] = ['negative', 'positive'];
```
In `src/components/DailyLogForm.tsx`:
- Extend the type imports: `import type { FlowIntensity, ISODate, LHResult, MucusType } from '@/src/domain/types';`
- Add option imports: `import { FLOW_OPTIONS, MOOD_OPTIONS, SYMPTOM_OPTIONS, MUCUS_OPTIONS, LH_OPTIONS } from '@/src/domain/log-options';` and `import { cToF, fToC } from '@/src/domain/fertility/units';`
- Read mode/unit: change `const { dailyLogs, saveLog, startPeriod, cycles } = useHealthData();` to also destructure `lifeStage, bbtUnit`.
- Add state:
```ts
const [bbt, setBbt] = useState('');
const [lh, setLh] = useState<LHResult | undefined>(undefined);
const [mucus, setMucus] = useState<MucusType | undefined>(undefined);
const [intercourse, setIntercourse] = useState(false);
const [protectedSex, setProtectedSex] = useState(false);
```
- In the `useEffect` that hydrates `existing`, add:
```ts
setBbt(
  existing.bbt === undefined
    ? ''
    : String(bbtUnit === 'F' ? cToF(existing.bbt) : existing.bbt),
);
setLh(existing.lh);
setMucus(existing.mucus);
setIntercourse(existing.intercourse ?? false);
setProtectedSex(existing.intercourseProtected ?? false);
```
(add `bbtUnit` to that effect's dependency array)
- In `handleSave`, build the log with TTC fields when in TTC mode:
```ts
async function handleSave() {
  const parsedBbt = bbt.trim() === '' ? undefined : Number(bbt);
  const bbtC =
    parsedBbt === undefined
      ? undefined
      : bbtUnit === 'F'
        ? fToC(parsedBbt)
        : parsedBbt;
  await saveLog({
    date,
    flow,
    symptoms,
    moods,
    notes: notes || undefined,
    ...(lifeStage === 'ttc'
      ? {
          bbt: bbtC,
          lh,
          mucus,
          intercourse: intercourse || undefined,
          intercourseProtected: intercourse ? protectedSex : undefined,
        }
      : {}),
  });
  const hasFlow = flow !== 'none';
  const cycleExists = cycles.some((c) => c.startDate === date);
  if (hasFlow && !cycleExists) await startPeriod(date);
  setSaved(true);
}
```
- Add a TTC section before the Save button, rendered only in TTC mode (reuse the existing `Chip` component):
```tsx
{lifeStage === 'ttc' && (
  <section className="space-y-4 rounded-md border border-neutral-200 p-3">
    <div>
      <label htmlFor="bbt" className="mb-2 block text-sm font-medium">
        Basal body temperature (°{bbtUnit})
      </label>
      <input
        id="bbt"
        type="number"
        step="0.01"
        inputMode="decimal"
        value={bbt}
        onChange={(e) => setBbt(e.target.value)}
        className="w-full rounded-md border border-neutral-300 p-2"
      />
    </div>
    <div>
      <h2 className="mb-2 text-sm font-medium">Ovulation test (LH)</h2>
      <div className="flex flex-wrap gap-2">
        {LH_OPTIONS.map((o) => (
          <Chip
            key={o}
            label={o}
            active={lh === o}
            onClick={() => setLh(lh === o ? undefined : o)}
          />
        ))}
      </div>
    </div>
    <div>
      <h2 className="mb-2 text-sm font-medium">Cervical mucus</h2>
      <div className="flex flex-wrap gap-2">
        {MUCUS_OPTIONS.map((o) => (
          <Chip
            key={o}
            label={o}
            active={mucus === o}
            onClick={() => setMucus(mucus === o ? undefined : o)}
          />
        ))}
      </div>
    </div>
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={intercourse}
          onChange={(e) => setIntercourse(e.target.checked)}
        />
        Intercourse
      </label>
      {intercourse && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={protectedSex}
            onChange={(e) => setProtectedSex(e.target.checked)}
          />
          Protected
        </label>
      )}
    </div>
  </section>
)}
```

- [ ] **Step 4: Run tests to verify pass (new + existing form suite)**

Run: `npx vitest run src/components/DailyLogForm.ttc.test.tsx src/components/DailyLogForm.test.tsx`
Expected: PASS (new file 2 tests; existing form suite still green).

- [ ] **Step 5: Commit**

```bash
git add src/domain/log-options.ts src/components/DailyLogForm.tsx src/components/DailyLogForm.ttc.test.tsx
git commit -m "feat(ttc): fertility-signal logging section in DailyLogForm"
```

---

### Task 12: Settings — `TtcControls`

**Files:**
- Create: `src/components/TtcControls.tsx`
- Modify: `app/settings/page.tsx`
- Test: `src/components/TtcControls.test.tsx`

**Interfaces:**
- Consumes: `getLifeStage`, `setLifeStage`, `getBbtUnit`, `setBbtUnit` from `@/src/settings/preferences`; `todayISO` from `@/src/domain/dates`.
- Produces: `<TtcControls />` — a self-contained client component (pattern from `PasscodeControls`) that toggles TTC mode and BBT unit, persisting via `preferences`.

- [ ] **Step 1: Write the failing test**

`src/components/TtcControls.test.tsx`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TtcControls } from '@/src/components/TtcControls';
import { getLifeStage } from '@/src/settings/preferences';

describe('TtcControls', () => {
  beforeEach(() => localStorage.clear());

  it('enables TTC mode when toggled on', () => {
    render(<TtcControls />);
    fireEvent.click(screen.getByRole('button', { name: /turn on ttc mode/i }));
    expect(getLifeStage()).toBe('ttc');
    expect(screen.getByText(/TTC mode is/i).textContent).toMatch(/on/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/TtcControls.test.tsx`
Expected: FAIL — cannot find module `TtcControls`.

- [ ] **Step 3: Implement**

`src/components/TtcControls.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import {
  getLifeStage,
  setLifeStage,
  getBbtUnit,
  setBbtUnit,
  type BbtUnit,
} from '@/src/settings/preferences';
import { todayISO } from '@/src/domain/dates';

export function TtcControls() {
  const [ready, setReady] = useState(false);
  const [ttc, setTtc] = useState(false);
  const [unit, setUnit] = useState<BbtUnit>('C');

  useEffect(() => {
    setTtc(getLifeStage() === 'ttc');
    setUnit(getBbtUnit());
    setReady(true);
  }, []);

  function toggleTtc() {
    const next = !ttc;
    setLifeStage(next ? 'ttc' : 'cycle', todayISO());
    setTtc(next);
  }

  function chooseUnit(u: BbtUnit) {
    setBbtUnit(u);
    setUnit(u);
  }

  if (!ready) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-700">
        TTC mode is <span className="font-medium">{ttc ? 'on' : 'off'}</span>.
      </p>
      <button
        type="button"
        onClick={toggleTtc}
        className={`w-full rounded-md px-4 py-2 text-white ${ttc ? 'bg-neutral-600' : 'bg-rose-600'}`}
      >
        {ttc ? 'Turn off TTC mode' : 'Turn on TTC mode'}
      </button>
      {ttc && (
        <div className="flex items-center gap-2 text-sm">
          <span>Temperature unit:</span>
          {(['C', 'F'] as BbtUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => chooseUnit(u)}
              className={`rounded-full border px-3 py-1 ${unit === u ? 'border-rose-600 bg-rose-600 text-white' : 'border-neutral-300'}`}
            >
              °{u}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```
In `app/settings/page.tsx`, import and add a section above "Your data":
```tsx
import { TtcControls } from '@/src/components/TtcControls';
```
```tsx
<section className="space-y-3">
  <h2 className="text-sm font-medium text-neutral-600">Trying to conceive</h2>
  <p className="text-xs text-neutral-500">
    Turn on TTC mode to log BBT, LH tests, and cervical mucus, and get daily
    conception guidance. Lumen is not a contraceptive and not a substitute for
    fertility treatment or medical advice.
  </p>
  <TtcControls />
</section>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/TtcControls.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/TtcControls.tsx app/settings/page.tsx src/components/TtcControls.test.tsx
git commit -m "feat(ttc): settings controls for TTC mode + BBT unit"
```

---

### Task 13: Home — `ConceptionCard` + nav link

**Files:**
- Create: `src/components/ConceptionCard.tsx`
- Modify: `app/page.tsx`
- Test: `src/components/ConceptionCard.test.tsx`

**Interfaces:**
- Consumes: `ConceptionGuidance`, `OvulationConfirmation` from `@/src/domain/fertility/types`.
- Produces: `<ConceptionCard guidance={ConceptionGuidance | null} confirmation={OvulationConfirmation | null} />`. Renders today's level/label/reason, ovulation status (confirmed vs predicted), and the non-medical disclaimer. Renders nothing when `guidance` is null.

- [ ] **Step 1: Write the failing test**

`src/components/ConceptionCard.test.tsx`:
```ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConceptionCard } from '@/src/components/ConceptionCard';

describe('ConceptionCard', () => {
  it('renders nothing without guidance', () => {
    const { container } = render(<ConceptionCard guidance={null} confirmation={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the conception level, reason, and disclaimer', () => {
    render(
      <ConceptionCard
        guidance={{ date: '2026-06-12', level: 'high', label: 'High chance to conceive', reason: 'You are in your most fertile days.' }}
        confirmation={null}
      />,
    );
    expect(screen.getByText('High chance to conceive')).toBeTruthy();
    expect(screen.getByText(/most fertile days/i)).toBeTruthy();
    expect(screen.getByText(/not a contraceptive/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ConceptionCard.test.tsx`
Expected: FAIL — cannot find module `ConceptionCard`.

- [ ] **Step 3: Implement**

`src/components/ConceptionCard.tsx`:
```tsx
import type {
  ConceptionGuidance,
  OvulationConfirmation,
} from '@/src/domain/fertility/types';

const LEVEL_STYLE: Record<ConceptionGuidance['level'], string> = {
  high: 'border-rose-300 bg-rose-50',
  medium: 'border-amber-300 bg-amber-50',
  low: 'border-neutral-200 bg-neutral-50',
};

export function ConceptionCard({
  guidance,
  confirmation,
}: {
  guidance: ConceptionGuidance | null;
  confirmation: OvulationConfirmation | null;
}) {
  if (!guidance) return null;
  return (
    <section className={`space-y-2 rounded-lg border p-4 ${LEVEL_STYLE[guidance.level]}`}>
      <h2 className="text-base font-semibold">{guidance.label}</h2>
      <p className="text-sm text-neutral-700">{guidance.reason}</p>
      <p className="text-xs text-neutral-600">
        {confirmation
          ? `Ovulation ${confirmation.status === 'confirmed' ? 'confirmed' : 'estimated'} around ${confirmation.ovulationDate}.`
          : 'Ovulation estimated from your cycle history.'}
      </p>
      <p className="text-[11px] text-neutral-500">
        Lumen is not a contraceptive and not a substitute for fertility
        treatment or medical advice.
      </p>
    </section>
  );
}
```
In `app/page.tsx`:
- Destructure the new fields: `const { cycles, stats, prediction, insights, dailyContent, lifeStage, conceptionToday, ovulationConfirmation, loading } = useHealthData();`
- Import: `import { ConceptionCard } from '@/src/components/ConceptionCard';`
- Render the card above `<DailyContentCard />` when in TTC mode:
```tsx
{lifeStage === 'ttc' && (
  <ConceptionCard guidance={conceptionToday} confirmation={ovulationConfirmation} />
)}
```
- Add a Fertility nav link inside the `<nav>` grid (TTC mode only):
```tsx
{lifeStage === 'ttc' && (
  <Link href="/fertility" className="rounded-md border px-4 py-3">
    Fertility
  </Link>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ConceptionCard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ConceptionCard.tsx app/page.tsx src/components/ConceptionCard.test.tsx
git commit -m "feat(ttc): home conception card + fertility nav link"
```

---

### Task 14: BBT chart — `BbtChart`

**Files:**
- Create: `src/components/BbtChart.tsx`
- Test: `src/components/BbtChart.test.tsx`

**Interfaces:**
- Produces: `<BbtChart points={{ date: string; value: number }[]} coverline?: number ovulationDate?: string unit: 'C' | 'F' />`. Inline SVG: a polyline through `points`, a circle per point, a dashed horizontal coverline when provided, and a highlighted marker on `ovulationDate`. `value` is in display units (caller converts). Renders a "Log your temperature…" placeholder when `points` is empty.

- [ ] **Step 1: Write the failing test**

`src/components/BbtChart.test.tsx`:
```ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BbtChart } from '@/src/components/BbtChart';

describe('BbtChart', () => {
  it('shows a placeholder with no points', () => {
    render(<BbtChart points={[]} unit="C" />);
    expect(screen.getByText(/log your temperature/i)).toBeTruthy();
  });

  it('renders one marker per point', () => {
    const { container } = render(
      <BbtChart
        points={[
          { date: '2026-06-01', value: 36.4 },
          { date: '2026-06-02', value: 36.5 },
          { date: '2026-06-03', value: 36.7 },
        ]}
        coverline={36.5}
        ovulationDate="2026-06-02"
        unit="C"
      />,
    );
    expect(container.querySelectorAll('circle').length).toBe(3);
    expect(container.querySelector('line')).not.toBeNull(); // coverline
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/BbtChart.test.tsx`
Expected: FAIL — cannot find module `BbtChart`.

- [ ] **Step 3: Implement**

`src/components/BbtChart.tsx`:
```tsx
interface Point {
  date: string;
  value: number;
}

export function BbtChart({
  points,
  coverline,
  ovulationDate,
  unit,
}: {
  points: Point[];
  coverline?: number;
  ovulationDate?: string;
  unit: 'C' | 'F';
}) {
  if (points.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500">
        Log your temperature to see your BBT chart.
      </p>
    );
  }

  const W = 320;
  const H = 160;
  const pad = 24;
  const values = points.map((p) => p.value);
  const lo = Math.min(...values, coverline ?? Infinity) - 0.1;
  const hi = Math.max(...values, coverline ?? -Infinity) + 0.1;
  const x = (i: number) =>
    pad + (i * (W - 2 * pad)) / Math.max(1, points.length - 1);
  const y = (v: number) => H - pad - ((v - lo) / (hi - lo)) * (H - 2 * pad);

  const path = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`BBT chart in °${unit}`}>
      {coverline !== undefined && (
        <line
          x1={pad}
          x2={W - pad}
          y1={y(coverline)}
          y2={y(coverline)}
          stroke="#f43f5e"
          strokeDasharray="4 3"
        />
      )}
      <polyline points={path} fill="none" stroke="#525252" strokeWidth={1.5} />
      {points.map((p, i) => (
        <circle
          key={p.date}
          cx={x(i)}
          cy={y(p.value)}
          r={p.date === ovulationDate ? 5 : 3}
          fill={p.date === ovulationDate ? '#f43f5e' : '#525252'}
        />
      ))}
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/BbtChart.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/BbtChart.tsx src/components/BbtChart.test.tsx
git commit -m "feat(ttc): inline SVG BBT chart with coverline + ovulation marker"
```

---

### Task 15: `/fertility` view — `FertilityView` + route

**Files:**
- Create: `src/components/FertilityView.tsx`
- Create: `app/fertility/page.tsx`
- Test: `src/components/FertilityView.test.tsx`

**Interfaces:**
- Consumes: `useHealthData` (`dailyLogs`, `cycles`, `prediction`, `ovulationConfirmation`, `conceptionToday`, `bbtUnit`, `lifeStage`, `ttcStartDate`, `loading`); `BbtChart`; `ConceptionCard`; `shouldShowResourceNote` from `@/src/domain/fertility/journey`; `cToF` from `@/src/domain/fertility/units`.
- Produces: `<FertilityView />` client component assembling the BBT chart (current-cycle readings, converted to `bbtUnit`), the ovulation-confirmation status + explanation, today's conception card, and — when `shouldShowResourceNote` — a dismissible supportive resource note. `app/fertility/page.tsx` renders it.

- [ ] **Step 1: Write the failing test**

`src/components/FertilityView.test.tsx`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { FertilityView } from '@/src/components/FertilityView';
import { db } from '@/src/data/db';
import { setLifeStage } from '@/src/settings/preferences';

describe('FertilityView', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.cycles.clear();
    await db.dailyLogs.clear();
    setLifeStage('ttc', '2026-06-01');
    await db.cycles.put({ id: 'c1', startDate: '2026-06-01' });
  });

  it('renders the fertility heading and disclaimer', async () => {
    render(<FertilityView />);
    await waitFor(() => expect(screen.getByText(/Fertility/i)).toBeTruthy());
    expect(screen.getByText(/not a contraceptive/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/FertilityView.test.tsx`
Expected: FAIL — cannot find module `FertilityView`.

- [ ] **Step 3: Implement**

`src/components/FertilityView.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { BbtChart } from '@/src/components/BbtChart';
import { ConceptionCard } from '@/src/components/ConceptionCard';
import { shouldShowResourceNote } from '@/src/domain/fertility/journey';
import { cToF } from '@/src/domain/fertility/units';

export function FertilityView() {
  const {
    dailyLogs,
    cycles,
    ovulationConfirmation,
    conceptionToday,
    bbtUnit,
    ttcStartDate,
    loading,
  } = useHealthData();
  const [dismissed, setDismissed] = useState(false);

  if (loading) return <main className="p-6">Loading…</main>;

  const currentStart =
    [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate)).at(-1)
      ?.startDate ?? '';
  const points = dailyLogs
    .filter((l) => typeof l.bbt === 'number' && l.date >= currentStart)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => ({
      date: l.date,
      value: bbtUnit === 'F' ? cToF(l.bbt as number) : (l.bbt as number),
    }));

  const showNote = shouldShowResourceNote(cycles, ttcStartDate);

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-xl font-semibold">Fertility</h1>

      <ConceptionCard guidance={conceptionToday} confirmation={ovulationConfirmation} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-600">BBT chart</h2>
        <BbtChart points={points} ovulationDate={ovulationConfirmation?.ovulationDate} unit={bbtUnit} />
      </section>

      <section className="space-y-1">
        <h2 className="text-sm font-medium text-neutral-600">Ovulation status</h2>
        <p className="text-sm text-neutral-700">
          {ovulationConfirmation
            ? ovulationConfirmation.explanation
            : 'No ovulation signals logged for this cycle yet.'}
        </p>
      </section>

      {showNote && !dismissed && (
        <section className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm text-neutral-700">
            You&apos;ve been tracking for a while. If you have questions about
            conceiving, it can help to talk with a healthcare provider — this is
            common and there is support available.
          </p>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs text-neutral-500 underline"
          >
            Dismiss
          </button>
        </section>
      )}

      <p className="text-[11px] text-neutral-500">
        Lumen is not a contraceptive and not a substitute for fertility
        treatment or medical advice.
      </p>
    </main>
  );
}
```
`app/fertility/page.tsx`:
```tsx
import { FertilityView } from '@/src/components/FertilityView';

export default function FertilityPage() {
  return <FertilityView />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/FertilityView.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/FertilityView.tsx app/fertility/page.tsx src/components/FertilityView.test.tsx
git commit -m "feat(ttc): /fertility view with BBT chart, confirmation status, resource note"
```

---

### Task 16: Full-suite verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites PASS (existing + new fertility/TTC tests).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds with no type errors; `/fertility` route is emitted.

- [ ] **Step 3: Lint (if configured)**

Run: `npm run lint`
Expected: PASS. (If lint is not a script, skip.)

- [ ] **Step 4: Commit any fixups**

Only if Steps 1–3 required changes:
```bash
git add -A
git commit -m "chore(ttc): fixups from full-suite verification"
```

---

## Self-Review

**1. Spec coverage:**
- §4 data model → Task 1. ✓
- §5.1 BBT thermal shift → Task 3. ✓
- §5.2 confirmation combination → Task 4. ✓
- §5.3 luteal refinement → Task 5. ✓
- §6 conception guidance → Task 6. ✓
- §7 prediction integration (`ObservedFertility`) → Task 8. ✓
- §4.3 + unit conversion → Tasks 2 (units) + 9 (preferences). ✓
- §8.1 hook wiring → Task 10. ✓
- §8.2 logging section → Task 11; settings → Task 12; home card → Task 13; `/fertility` + chart → Tasks 14–15. ✓
- §9 sensitive handling (resource note + disclaimer) → Task 7 (logic) + Tasks 13/15 (UI). ✓
- §10 testing → each task is test-first + Task 16 full-suite. ✓

**2. Placeholder scan:** No TBD/TODO; every code step has complete code. ✓

**3. Type consistency:** `confirmOvulation(logs, cycle, nextStart?)`, `OvulationConfirmation`, `ConceptionGuidance`, `ObservedFertility { lutealLength?, currentCycleOvulation? }`, `BbtUnit`, `detectThermalShift`/`ThermalShift`, and the `preferences` getters/setters are used with identical signatures across Tasks 1–15. ✓
