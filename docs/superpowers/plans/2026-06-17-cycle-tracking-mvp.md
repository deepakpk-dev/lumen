# Cycle Tracking MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a web-first, offline-capable, privacy-first cycle-tracking MVP: log periods/symptoms/moods, see an explainable prediction (next period, fertile window, ovulation, confidence), a calendar, history/trends, and full data export/delete.

**Architecture:** A pure-TypeScript domain core (cycle statistics + deterministic prediction engine) with zero UI/storage dependencies, fully unit-tested via TDD. A local-first data layer (IndexedDB via Dexie) is the source of truth — the app works fully offline with no backend in this phase. A Next.js (App Router) PWA renders onboarding, home, logging, calendar, history, and settings on top of the domain + data layers.

**Tech Stack:** Next.js (App Router) + React + TypeScript, Tailwind CSS, Dexie (IndexedDB), date-fns, Vitest + @testing-library/react, PWA via web manifest + service worker.

## Global Constraints

- **No third-party analytics/ad/tracking SDKs** in the client bundle — ever. (PRD §12.1)
- **Local-first**: all health data lives in IndexedDB on-device; the app must be fully usable offline with no backend in this phase. (PRD §12.1, §14)
- **No paywall, no ads** anywhere. (PRD §0)
- **Predictions are deterministic and explainable**: every `Prediction` carries a human-readable `explanation`; no LLM involved in prediction. (PRD §15.2)
- **Honest uncertainty**: never present false precision; irregular cycles must produce wider ranges and lower `confidence`. (PRD §5.2)
- **Dates are stored as `ISODate` strings (`'YYYY-MM-DD'`)**, never `Date` objects, to avoid timezone drift. Day 1 of a cycle = first day of period.
- **Non-diagnostic**: no medical/contraceptive claims; a disclaimer string is shown wherever predictions appear.
- **Accessibility**: calendar states must not rely on color alone (use labels/icons too). (PRD §14)
- **Inclusive, non-shaming copy** throughout. (PRD §14)
- **TypeScript strict mode** on; **Node 24**; package manager: npm.

---

### Task 1: Scaffold Next.js + TypeScript + Tailwind + Vitest

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, `vitest.setup.ts`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `src/domain/smoke.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a runnable Next.js app and a working `npm test` (Vitest) command for all later tasks.

- [ ] **Step 1: Scaffold the app non-interactively**

Run from the project root (current directory):
```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*" --no-turbopack --yes
```
If the directory is non-empty (it contains `docs/`), accept the prompt to proceed, or pass `--yes`. Keep `app/` at the project root and `src/` for non-route code.

- [ ] **Step 2: Add test + domain dependencies**

```bash
npm install dexie date-fns
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom fake-indexeddb
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
});
```

Create `vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
```

Add scripts to `package.json` (merge into existing `"scripts"`):
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: Write a smoke test**

Create `src/domain/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the smoke test and the build**

Run: `npm test`
Expected: PASS (1 test).

Run: `npm run build`
Expected: Next.js build completes with no errors.

- [ ] **Step 6: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + Vitest toolchain"
```

---

### Task 2: Domain types

**Files:**
- Create: `src/domain/types.ts`
- Test: `src/domain/types.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the shared type vocabulary used by every later task:
  - `ISODate = string`
  - `FlowIntensity = 'none' | 'spotting' | 'light' | 'medium' | 'heavy'`
  - `LifeStage = 'cycle' | 'ttc' | 'pregnancy' | 'menopause'`
  - `DailyLog { date: ISODate; flow?: FlowIntensity; symptoms: string[]; moods: string[]; notes?: string }`
  - `Cycle { id: string; startDate: ISODate; endDate?: ISODate }`
  - `CycleStats { cycleCount; averageCycleLength; cycleLengthStdDev; averagePeriodLength; isRegular }`
  - `Confidence = 'high' | 'medium' | 'low'`
  - `CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'`
  - `Prediction { nextPeriodStart: ISODate; nextPeriodStartRange: { earliest: ISODate; latest: ISODate }; predictedPeriodLength: number; fertileWindow: { start: ISODate; end: ISODate }; ovulationDate: ISODate; confidence: Confidence; explanation: string }`
  - constants: `DEFAULT_CYCLE_LENGTH = 28`, `DEFAULT_PERIOD_LENGTH = 5`, `LUTEAL_PHASE_LENGTH = 14`, `REGULARITY_STDDEV_THRESHOLD = 3`

- [ ] **Step 1: Write the failing test**

Create `src/domain/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
  LUTEAL_PHASE_LENGTH,
  REGULARITY_STDDEV_THRESHOLD,
} from './types';

describe('domain constants', () => {
  it('exposes cycle defaults', () => {
    expect(DEFAULT_CYCLE_LENGTH).toBe(28);
    expect(DEFAULT_PERIOD_LENGTH).toBe(5);
    expect(LUTEAL_PHASE_LENGTH).toBe(14);
    expect(REGULARITY_STDDEV_THRESHOLD).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- types`
Expected: FAIL — cannot find module './types'.

- [ ] **Step 3: Write the types**

Create `src/domain/types.ts`:
```ts
export type ISODate = string; // 'YYYY-MM-DD'

export type FlowIntensity = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

export type LifeStage = 'cycle' | 'ttc' | 'pregnancy' | 'menopause';

export interface DailyLog {
  date: ISODate;
  flow?: FlowIntensity;
  symptoms: string[];
  moods: string[];
  notes?: string;
}

export interface Cycle {
  id: string;
  startDate: ISODate; // day 1 = first day of period
  endDate?: ISODate; // last day of period
}

export interface CycleStats {
  cycleCount: number;
  averageCycleLength: number;
  cycleLengthStdDev: number;
  averagePeriodLength: number;
  isRegular: boolean;
}

export type Confidence = 'high' | 'medium' | 'low';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export interface Prediction {
  nextPeriodStart: ISODate;
  nextPeriodStartRange: { earliest: ISODate; latest: ISODate };
  predictedPeriodLength: number;
  fertileWindow: { start: ISODate; end: ISODate };
  ovulationDate: ISODate;
  confidence: Confidence;
  explanation: string;
}

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;
export const LUTEAL_PHASE_LENGTH = 14;
export const REGULARITY_STDDEV_THRESHOLD = 3;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- types`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/domain/types.test.ts
git commit -m "feat(domain): add core health-tracking types and constants"
```

---

### Task 3: Date utilities

**Files:**
- Create: `src/domain/dates.ts`
- Test: `src/domain/dates.test.ts`

**Interfaces:**
- Consumes: `ISODate` from `./types`.
- Produces:
  - `toISODate(d: Date): ISODate`
  - `parseISODate(s: ISODate): Date`
  - `addDays(s: ISODate, n: number): ISODate`
  - `daysBetween(a: ISODate, b: ISODate): number` (b − a, in whole calendar days)
  - `todayISO(): ISODate`

- [ ] **Step 1: Write the failing test**

Create `src/domain/dates.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { addDays, daysBetween, parseISODate, toISODate } from './dates';

describe('date utils', () => {
  it('adds days without timezone drift', () => {
    expect(addDays('2026-01-30', 5)).toBe('2026-02-04');
  });

  it('counts whole calendar days between dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-29')).toBe(28);
    expect(daysBetween('2026-01-29', '2026-01-01')).toBe(-28);
  });

  it('round-trips Date <-> ISODate', () => {
    expect(toISODate(parseISODate('2026-06-17'))).toBe('2026-06-17');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- dates`
Expected: FAIL — cannot find module './dates'.

- [ ] **Step 3: Write the implementation**

Create `src/domain/dates.ts`:
```ts
import {
  format,
  parseISO,
  addDays as fnsAddDays,
  differenceInCalendarDays,
} from 'date-fns';
import type { ISODate } from './types';

export function toISODate(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd');
}

export function parseISODate(s: ISODate): Date {
  return parseISO(s);
}

export function addDays(s: ISODate, n: number): ISODate {
  return toISODate(fnsAddDays(parseISODate(s), n));
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(parseISODate(b), parseISODate(a));
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- dates`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/dates.ts src/domain/dates.test.ts
git commit -m "feat(domain): add timezone-safe ISODate utilities"
```

---

### Task 4: Cycle statistics

**Files:**
- Create: `src/domain/cycle-stats.ts`
- Test: `src/domain/cycle-stats.test.ts`

**Interfaces:**
- Consumes: `Cycle`, `CycleStats`, `DEFAULT_CYCLE_LENGTH`, `DEFAULT_PERIOD_LENGTH`, `REGULARITY_STDDEV_THRESHOLD` from `./types`; `daysBetween` from `./dates`.
- Produces:
  - `computeCycleLengths(cycles: Cycle[]): number[]` — gaps between consecutive `startDate`s, sorted ascending by date first.
  - `computeCycleStats(cycles: Cycle[]): CycleStats` — with `cycleCount = number of completed gaps`; falls back to defaults when no data; `isRegular = cycleCount >= 2 && stdDev <= REGULARITY_STDDEV_THRESHOLD`.

- [ ] **Step 1: Write the failing test**

Create `src/domain/cycle-stats.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeCycleLengths, computeCycleStats } from './cycle-stats';
import type { Cycle } from './types';

const cyc = (id: string, startDate: string, endDate?: string): Cycle => ({
  id,
  startDate,
  endDate,
});

describe('computeCycleLengths', () => {
  it('returns gaps between consecutive start dates', () => {
    const cycles = [
      cyc('a', '2026-01-01'),
      cyc('b', '2026-01-29'),
      cyc('c', '2026-02-26'),
    ];
    expect(computeCycleLengths(cycles)).toEqual([28, 28]);
  });

  it('sorts unsorted input by date before computing', () => {
    const cycles = [cyc('b', '2026-01-29'), cyc('a', '2026-01-01')];
    expect(computeCycleLengths(cycles)).toEqual([28]);
  });

  it('returns empty array for fewer than two cycles', () => {
    expect(computeCycleLengths([cyc('a', '2026-01-01')])).toEqual([]);
  });
});

describe('computeCycleStats', () => {
  it('falls back to defaults with no data', () => {
    const stats = computeCycleStats([]);
    expect(stats.cycleCount).toBe(0);
    expect(stats.averageCycleLength).toBe(28);
    expect(stats.averagePeriodLength).toBe(5);
    expect(stats.isRegular).toBe(false);
  });

  it('computes averages for regular cycles', () => {
    const cycles = [
      cyc('a', '2026-01-01', '2026-01-05'),
      cyc('b', '2026-01-29', '2026-02-02'),
      cyc('c', '2026-02-26', '2026-03-02'),
    ];
    const stats = computeCycleStats(cycles);
    expect(stats.cycleCount).toBe(2);
    expect(stats.averageCycleLength).toBe(28);
    expect(stats.averagePeriodLength).toBe(5);
    expect(stats.cycleLengthStdDev).toBe(0);
    expect(stats.isRegular).toBe(true);
  });

  it('flags irregular cycles via standard deviation', () => {
    const cycles = [
      cyc('a', '2026-01-01'),
      cyc('b', '2026-01-22'), // 21
      cyc('c', '2026-03-01'), // 38
    ];
    const stats = computeCycleStats(cycles);
    expect(stats.isRegular).toBe(false);
    expect(stats.cycleLengthStdDev).toBeGreaterThan(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cycle-stats`
Expected: FAIL — cannot find module './cycle-stats'.

- [ ] **Step 3: Write the implementation**

Create `src/domain/cycle-stats.ts`:
```ts
import type { Cycle, CycleStats } from './types';
import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
  REGULARITY_STDDEV_THRESHOLD,
} from './types';
import { daysBetween } from './dates';

function sortByStart(cycles: Cycle[]): Cycle[] {
  return [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function computeCycleLengths(cycles: Cycle[]): number[] {
  const sorted = sortByStart(cycles);
  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    lengths.push(daysBetween(sorted[i - 1].startDate, sorted[i].startDate));
  }
  return lengths;
}

function computePeriodLengths(cycles: Cycle[]): number[] {
  return cycles
    .filter((c) => c.endDate)
    .map((c) => daysBetween(c.startDate, c.endDate as string) + 1);
}

export function computeCycleStats(cycles: Cycle[]): CycleStats {
  const lengths = computeCycleLengths(cycles);
  const periodLengths = computePeriodLengths(cycles);

  const averageCycleLength =
    lengths.length > 0 ? Math.round(mean(lengths)) : DEFAULT_CYCLE_LENGTH;
  const averagePeriodLength =
    periodLengths.length > 0
      ? Math.round(mean(periodLengths))
      : DEFAULT_PERIOD_LENGTH;
  const cycleLengthStdDev = Number(stdDev(lengths).toFixed(2));

  return {
    cycleCount: lengths.length,
    averageCycleLength,
    cycleLengthStdDev,
    averagePeriodLength,
    isRegular:
      lengths.length >= 2 && cycleLengthStdDev <= REGULARITY_STDDEV_THRESHOLD,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- cycle-stats`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/domain/cycle-stats.ts src/domain/cycle-stats.test.ts
git commit -m "feat(domain): compute cycle/period averages and regularity"
```

---

### Task 5: Prediction engine

**Files:**
- Create: `src/domain/prediction.ts`
- Test: `src/domain/prediction.test.ts`

**Interfaces:**
- Consumes: `Cycle`, `CycleStats`, `Prediction`, `Confidence`, `CyclePhase`, `LUTEAL_PHASE_LENGTH` from `./types`; `addDays`, `daysBetween` from `./dates`; `computeCycleStats`, `computeCycleLengths` from `./cycle-stats`.
- Produces:
  - `predictionConfidence(stats: CycleStats): Confidence`
  - `getCyclePhase(cycleDay: number, stats: CycleStats): CyclePhase` (cycleDay is 1-based days since last period start)
  - `generatePrediction(cycles: Cycle[], today: ISODate): Prediction | null` — returns `null` when `cycles` is empty (nothing to predict from).

  Rules: ovulation = nextPeriodStart − `LUTEAL_PHASE_LENGTH`; fertile window = ovulation − 5 … ovulation + 1; range margin = `max(1, round(stdDev))` days; confidence: `high` if cycleCount ≥ 3 && isRegular, `medium` if cycleCount ≥ 1, else `low`.

- [ ] **Step 1: Write the failing test**

Create `src/domain/prediction.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  generatePrediction,
  getCyclePhase,
  predictionConfidence,
} from './prediction';
import { computeCycleStats } from './cycle-stats';
import type { Cycle } from './types';

const cyc = (id: string, startDate: string, endDate?: string): Cycle => ({
  id,
  startDate,
  endDate,
});

const regular = [
  cyc('a', '2026-01-01', '2026-01-05'),
  cyc('b', '2026-01-29', '2026-02-02'),
  cyc('c', '2026-02-26', '2026-03-02'),
  cyc('d', '2026-03-26', '2026-03-30'),
];

describe('predictionConfidence', () => {
  it('is high for 3+ regular cycles', () => {
    expect(predictionConfidence(computeCycleStats(regular))).toBe('high');
  });
  it('is medium for a single cycle', () => {
    expect(
      predictionConfidence(computeCycleStats([cyc('a', '2026-01-01')])),
    ).toBe('medium');
  });
  it('is low for no cycles', () => {
    expect(predictionConfidence(computeCycleStats([]))).toBe('low');
  });
});

describe('generatePrediction', () => {
  it('returns null with no cycles', () => {
    expect(generatePrediction([], '2026-06-17')).toBeNull();
  });

  it('predicts next period one average-cycle after the last start', () => {
    const p = generatePrediction(regular, '2026-04-01');
    expect(p).not.toBeNull();
    // last start 2026-03-26 + 28 days
    expect(p!.nextPeriodStart).toBe('2026-04-23');
    expect(p!.predictedPeriodLength).toBe(5);
    expect(p!.confidence).toBe('high');
  });

  it('places ovulation 14 days before the predicted period', () => {
    const p = generatePrediction(regular, '2026-04-01');
    expect(p!.ovulationDate).toBe('2026-04-09'); // 2026-04-23 - 14
    expect(p!.fertileWindow.start).toBe('2026-04-04'); // ovulation - 5
    expect(p!.fertileWindow.end).toBe('2026-04-10'); // ovulation + 1
  });

  it('widens the range for irregular cycles', () => {
    const irregular = [
      cyc('a', '2026-01-01'),
      cyc('b', '2026-01-22'), // 21
      cyc('c', '2026-03-01'), // 38
    ];
    const p = generatePrediction(irregular, '2026-03-05');
    expect(p!.confidence).toBe('low');
    const { earliest, latest } = p!.nextPeriodStartRange;
    expect(earliest).not.toBe(latest); // non-zero margin
  });

  it('always includes a non-empty explanation', () => {
    const p = generatePrediction(regular, '2026-04-01');
    expect(p!.explanation.length).toBeGreaterThan(0);
  });
});

describe('getCyclePhase', () => {
  const stats = computeCycleStats(regular); // avg 28
  it('reports menstrual during the period', () => {
    expect(getCyclePhase(1, stats)).toBe('menstrual');
  });
  it('reports ovulation around day 14', () => {
    expect(getCyclePhase(14, stats)).toBe('ovulation');
  });
  it('reports luteal after ovulation', () => {
    expect(getCyclePhase(20, stats)).toBe('luteal');
  });
  it('reports follicular between period and ovulation', () => {
    expect(getCyclePhase(8, stats)).toBe('follicular');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- prediction`
Expected: FAIL — cannot find module './prediction'.

- [ ] **Step 3: Write the implementation**

Create `src/domain/prediction.ts`:
```ts
import type {
  Cycle,
  CycleStats,
  Confidence,
  CyclePhase,
  ISODate,
  Prediction,
} from './types';
import { LUTEAL_PHASE_LENGTH } from './types';
import { addDays } from './dates';
import { computeCycleStats } from './cycle-stats';

export function predictionConfidence(stats: CycleStats): Confidence {
  if (stats.cycleCount >= 3 && stats.isRegular) return 'high';
  if (stats.cycleCount >= 1) return 'medium';
  return 'low';
}

export function getCyclePhase(cycleDay: number, stats: CycleStats): CyclePhase {
  const ovulationDay = stats.averageCycleLength - LUTEAL_PHASE_LENGTH;
  if (cycleDay <= stats.averagePeriodLength) return 'menstrual';
  if (cycleDay >= ovulationDay - 1 && cycleDay <= ovulationDay + 1)
    return 'ovulation';
  if (cycleDay < ovulationDay - 1) return 'follicular';
  return 'luteal';
}

function lastStart(cycles: Cycle[]): ISODate {
  return [...cycles]
    .map((c) => c.startDate)
    .sort((a, b) => a.localeCompare(b))
    .at(-1) as ISODate;
}

function buildExplanation(stats: CycleStats, confidence: Confidence): string {
  if (stats.cycleCount === 0) {
    return 'Based on a typical 28-day cycle. Predictions improve as you log more.';
  }
  const base = `Based on your last ${stats.cycleCount} cycle${
    stats.cycleCount === 1 ? '' : 's'
  } (average ${stats.averageCycleLength} days).`;
  if (confidence === 'low') {
    return `${base} Your cycles vary, so this is a wider, low-confidence estimate.`;
  }
  return base;
}

export function generatePrediction(
  cycles: Cycle[],
  _today: ISODate,
): Prediction | null {
  if (cycles.length === 0) return null;

  const stats = computeCycleStats(cycles);
  const confidence = predictionConfidence(stats);
  const start = lastStart(cycles);

  const nextPeriodStart = addDays(start, stats.averageCycleLength);
  const margin = Math.max(1, Math.round(stats.cycleLengthStdDev));
  const ovulationDate = addDays(nextPeriodStart, -LUTEAL_PHASE_LENGTH);

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
    explanation: buildExplanation(stats, confidence),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- prediction`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/domain/prediction.ts src/domain/prediction.test.ts
git commit -m "feat(domain): deterministic, explainable cycle prediction engine"
```

---

### Task 6: Local-first data layer (Dexie)

**Files:**
- Create: `src/data/db.ts`
- Create: `src/data/repository.ts`
- Test: `src/data/repository.test.ts`

**Interfaces:**
- Consumes: `Cycle`, `DailyLog`, `ISODate` from `@/src/domain/types`.
- Produces (all async, IndexedDB-backed):
  - `db` — Dexie instance with tables `cycles` (keyed by `id`) and `dailyLogs` (keyed by `date`).
  - `addCycle(cycle: Cycle): Promise<void>`
  - `updateCycle(cycle: Cycle): Promise<void>`
  - `getCycles(): Promise<Cycle[]>` (sorted ascending by `startDate`)
  - `upsertDailyLog(log: DailyLog): Promise<void>`
  - `getDailyLog(date: ISODate): Promise<DailyLog | undefined>`
  - `getAllDailyLogs(): Promise<DailyLog[]>`
  - `exportAll(): Promise<{ cycles: Cycle[]; dailyLogs: DailyLog[] }>`
  - `deleteAll(): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `src/data/repository.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  addCycle,
  deleteAll,
  exportAll,
  getCycles,
  getDailyLog,
  upsertDailyLog,
} from './repository';

beforeEach(async () => {
  await deleteAll();
});

describe('repository', () => {
  it('stores and returns cycles sorted by start date', async () => {
    await addCycle({ id: 'b', startDate: '2026-02-01' });
    await addCycle({ id: 'a', startDate: '2026-01-01' });
    const cycles = await getCycles();
    expect(cycles.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('upserts a daily log keyed by date', async () => {
    await upsertDailyLog({ date: '2026-01-01', symptoms: ['cramps'], moods: [] });
    await upsertDailyLog({
      date: '2026-01-01',
      symptoms: ['cramps', 'headache'],
      moods: ['tired'],
    });
    const log = await getDailyLog('2026-01-01');
    expect(log?.symptoms).toEqual(['cramps', 'headache']);
    expect(log?.moods).toEqual(['tired']);
  });

  it('exports everything and deletes everything', async () => {
    await addCycle({ id: 'a', startDate: '2026-01-01' });
    await upsertDailyLog({ date: '2026-01-01', symptoms: [], moods: [] });
    const dump = await exportAll();
    expect(dump.cycles).toHaveLength(1);
    expect(dump.dailyLogs).toHaveLength(1);

    await deleteAll();
    const empty = await exportAll();
    expect(empty.cycles).toHaveLength(0);
    expect(empty.dailyLogs).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- repository`
Expected: FAIL — cannot find module './repository'.

- [ ] **Step 3: Write the Dexie schema**

Create `src/data/db.ts`:
```ts
import Dexie, { type Table } from 'dexie';
import type { Cycle, DailyLog } from '@/src/domain/types';

export class HealthDB extends Dexie {
  cycles!: Table<Cycle, string>;
  dailyLogs!: Table<DailyLog, string>;

  constructor() {
    super('lumen-health');
    this.version(1).stores({
      cycles: 'id, startDate',
      dailyLogs: 'date',
    });
  }
}

export const db = new HealthDB();
```

- [ ] **Step 4: Write the repository**

Create `src/data/repository.ts`:
```ts
import type { Cycle, DailyLog, ISODate } from '@/src/domain/types';
import { db } from './db';

export async function addCycle(cycle: Cycle): Promise<void> {
  await db.cycles.put(cycle);
}

export async function updateCycle(cycle: Cycle): Promise<void> {
  await db.cycles.put(cycle);
}

export async function getCycles(): Promise<Cycle[]> {
  const all = await db.cycles.toArray();
  return all.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function upsertDailyLog(log: DailyLog): Promise<void> {
  await db.dailyLogs.put(log);
}

export async function getDailyLog(date: ISODate): Promise<DailyLog | undefined> {
  return db.dailyLogs.get(date);
}

export async function getAllDailyLogs(): Promise<DailyLog[]> {
  return db.dailyLogs.toArray();
}

export async function exportAll(): Promise<{
  cycles: Cycle[];
  dailyLogs: DailyLog[];
}> {
  return {
    cycles: await getCycles(),
    dailyLogs: await getAllDailyLogs(),
  };
}

export async function deleteAll(): Promise<void> {
  await db.cycles.clear();
  await db.dailyLogs.clear();
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- repository`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add src/data/db.ts src/data/repository.ts src/data/repository.test.ts
git commit -m "feat(data): local-first IndexedDB store with export/delete"
```

---

### Task 7: App state hook (cycles + prediction)

**Files:**
- Create: `src/state/useHealthData.ts`
- Test: `src/state/useHealthData.test.tsx`

**Interfaces:**
- Consumes: repository functions from `@/src/data/repository`; `generatePrediction` from `@/src/domain/prediction`; `computeCycleStats` from `@/src/domain/cycle-stats`; `todayISO` from `@/src/domain/dates`; types from `@/src/domain/types`.
- Produces a React hook `useHealthData()` returning:
  - `{ cycles, dailyLogs, stats, prediction, loading, startPeriod, endPeriod, saveLog, refresh }`
  - `startPeriod(date: ISODate): Promise<void>` — creates a new `Cycle` with a generated id.
  - `endPeriod(cycleId: string, endDate: ISODate): Promise<void>`
  - `saveLog(log: DailyLog): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `src/state/useHealthData.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHealthData } from './useHealthData';
import { deleteAll } from '@/src/data/repository';

beforeEach(async () => {
  await deleteAll();
});

describe('useHealthData', () => {
  it('starts a period and recomputes a prediction', async () => {
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.startPeriod('2026-01-01');
    });
    await act(async () => {
      await result.current.startPeriod('2026-01-29');
    });

    await waitFor(() => expect(result.current.cycles).toHaveLength(2));
    expect(result.current.prediction).not.toBeNull();
    expect(result.current.prediction!.nextPeriodStart).toBe('2026-02-26');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useHealthData`
Expected: FAIL — cannot find module './useHealthData'.

- [ ] **Step 3: Write the hook**

Create `src/state/useHealthData.ts`:
```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  Cycle,
  CycleStats,
  DailyLog,
  ISODate,
  Prediction,
} from '@/src/domain/types';
import {
  addCycle,
  getAllDailyLogs,
  getCycles,
  updateCycle,
  upsertDailyLog,
} from '@/src/data/repository';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import { generatePrediction } from '@/src/domain/prediction';
import { todayISO } from '@/src/domain/dates';

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `c_${Date.now()}_${Math.random()}`;
}

export function useHealthData() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [c, l] = await Promise.all([getCycles(), getAllDailyLogs()]);
    setCycles(c);
    setDailyLogs(l);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startPeriod = useCallback(
    async (date: ISODate) => {
      await addCycle({ id: newId(), startDate: date });
      await refresh();
    },
    [refresh],
  );

  const endPeriod = useCallback(
    async (cycleId: string, endDate: ISODate) => {
      const cycle = cycles.find((c) => c.id === cycleId);
      if (!cycle) return;
      await updateCycle({ ...cycle, endDate });
      await refresh();
    },
    [cycles, refresh],
  );

  const saveLog = useCallback(
    async (log: DailyLog) => {
      await upsertDailyLog(log);
      await refresh();
    },
    [refresh],
  );

  const stats: CycleStats = computeCycleStats(cycles);
  const prediction: Prediction | null = generatePrediction(cycles, todayISO());

  return {
    cycles,
    dailyLogs,
    stats,
    prediction,
    loading,
    startPeriod,
    endPeriod,
    saveLog,
    refresh,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useHealthData`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/useHealthData.ts src/state/useHealthData.test.tsx
git commit -m "feat(state): useHealthData hook wiring store to prediction engine"
```

---

### Task 8: Onboarding flow

**Files:**
- Create: `app/onboarding/page.tsx`
- Create: `src/components/OnboardingForm.tsx`
- Test: `src/components/OnboardingForm.test.tsx`

**Interfaces:**
- Consumes: `useHealthData` (specifically `startPeriod`); `todayISO`, `addDays` from `@/src/domain/dates`.
- Produces: `OnboardingForm` component that captures last-period start date and an optional "I'm not sure" path, calls `startPeriod`, and invokes an `onComplete` callback prop `() => void`.

- [ ] **Step 1: Write the failing test**

Create `src/components/OnboardingForm.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingForm } from './OnboardingForm';
import { deleteAll, getCycles } from '@/src/data/repository';

beforeEach(async () => {
  await deleteAll();
});

describe('OnboardingForm', () => {
  it('saves the last period date and calls onComplete', async () => {
    const onComplete = vi.fn();
    render(<OnboardingForm onComplete={onComplete} />);

    const dateInput = screen.getByLabelText(/last period start/i);
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, '2026-06-01');
    await userEvent.click(screen.getByRole('button', { name: /get started/i }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const cycles = await getCycles();
    expect(cycles).toHaveLength(1);
    expect(cycles[0].startDate).toBe('2026-06-01');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- OnboardingForm`
Expected: FAIL — cannot find module './OnboardingForm'.

- [ ] **Step 3: Write the component**

Create `src/components/OnboardingForm.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { todayISO } from '@/src/domain/dates';

export function OnboardingForm({ onComplete }: { onComplete: () => void }) {
  const { startPeriod } = useHealthData();
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await startPeriod(date);
    setSaving(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Let&apos;s set up your first prediction. This stays private on your
          device.
        </p>
      </div>
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

Create `app/onboarding/page.tsx`:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { OnboardingForm } from '@/src/components/OnboardingForm';

export default function OnboardingPage() {
  const router = useRouter();
  return <OnboardingForm onComplete={() => router.push('/')} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- OnboardingForm`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/onboarding/page.tsx src/components/OnboardingForm.tsx src/components/OnboardingForm.test.tsx
git commit -m "feat(ui): onboarding flow capturing first cycle"
```

---

### Task 9: Home view (cycle ring + prediction summary)

**Files:**
- Create: `src/components/CycleSummary.tsx`
- Modify: `app/page.tsx`
- Test: `src/components/CycleSummary.test.tsx`

**Interfaces:**
- Consumes: `Prediction`, `CycleStats` from `@/src/domain/types`; `getCyclePhase` from `@/src/domain/prediction`; `daysBetween`, `todayISO` from `@/src/domain/dates`.
- Produces: `CycleSummary({ prediction, stats, lastPeriodStart, today })` — pure presentational component showing current cycle day, phase, days until next period, confidence, explanation, and the non-diagnostic disclaimer. Renders an empty state when `prediction` is `null`.

- [ ] **Step 1: Write the failing test**

Create `src/components/CycleSummary.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CycleSummary } from './CycleSummary';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import { generatePrediction } from '@/src/domain/prediction';
import type { Cycle } from '@/src/domain/types';

const cycles: Cycle[] = [
  { id: 'a', startDate: '2026-01-01', endDate: '2026-01-05' },
  { id: 'b', startDate: '2026-01-29', endDate: '2026-02-02' },
  { id: 'c', startDate: '2026-02-26', endDate: '2026-03-02' },
];

describe('CycleSummary', () => {
  it('shows the prediction explanation and disclaimer', () => {
    const stats = computeCycleStats(cycles);
    const prediction = generatePrediction(cycles, '2026-03-10')!;
    render(
      <CycleSummary
        prediction={prediction}
        stats={stats}
        lastPeriodStart="2026-02-26"
        today="2026-03-10"
      />,
    );
    expect(screen.getByText(/average 28 days/i)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();
  });

  it('renders an empty state with no prediction', () => {
    render(
      <CycleSummary
        prediction={null}
        stats={computeCycleStats([])}
        lastPeriodStart={null}
        today="2026-03-10"
      />,
    );
    expect(screen.getByText(/log your first period/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CycleSummary`
Expected: FAIL — cannot find module './CycleSummary'.

- [ ] **Step 3: Write the component**

Create `src/components/CycleSummary.tsx`:
```tsx
import type { CycleStats, ISODate, Prediction } from '@/src/domain/types';
import { getCyclePhase } from '@/src/domain/prediction';
import { daysBetween } from '@/src/domain/dates';

const PHASE_LABEL: Record<string, string> = {
  menstrual: 'Menstrual phase',
  follicular: 'Follicular phase',
  ovulation: 'Ovulation phase',
  luteal: 'Luteal phase',
};

export function CycleSummary({
  prediction,
  stats,
  lastPeriodStart,
  today,
}: {
  prediction: Prediction | null;
  stats: CycleStats;
  lastPeriodStart: ISODate | null;
  today: ISODate;
}) {
  if (!prediction || !lastPeriodStart) {
    return (
      <div className="rounded-2xl bg-rose-50 p-6 text-center">
        <p className="text-neutral-700">
          Log your first period to see predictions.
        </p>
      </div>
    );
  }

  const cycleDay = daysBetween(lastPeriodStart, today) + 1;
  const phase = getCyclePhase(cycleDay, stats);
  const daysToNext = daysBetween(today, prediction.nextPeriodStart);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-rose-50 p-6 text-center">
        <p className="text-sm uppercase tracking-wide text-rose-700">
          {PHASE_LABEL[phase]}
        </p>
        <p className="mt-2 text-4xl font-semibold">Day {cycleDay}</p>
        <p className="mt-2 text-neutral-700">
          {daysToNext > 0
            ? `Next period in ~${daysToNext} day${daysToNext === 1 ? '' : 's'}`
            : 'Your period may start any day now'}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Confidence: {prediction.confidence}
        </p>
      </div>
      <p className="text-sm text-neutral-600">{prediction.explanation}</p>
      <p className="text-xs text-neutral-400">
        These predictions are estimates and not medical advice. Consult a
        clinician with health concerns.
      </p>
    </section>
  );
}
```

Modify `app/page.tsx` to render the home experience:
```tsx
'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHealthData } from '@/src/state/useHealthData';
import { CycleSummary } from '@/src/components/CycleSummary';
import { todayISO } from '@/src/domain/dates';

export default function HomePage() {
  const router = useRouter();
  const { cycles, stats, prediction, loading } = useHealthData();

  useEffect(() => {
    if (!loading && cycles.length === 0) router.replace('/onboarding');
  }, [loading, cycles.length, router]);

  if (loading) return <main className="p-6">Loading…</main>;

  const lastPeriodStart = cycles.at(-1)?.startDate ?? null;

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <CycleSummary
        prediction={prediction}
        stats={stats}
        lastPeriodStart={lastPeriodStart}
        today={todayISO()}
      />
      <nav className="grid grid-cols-2 gap-3 text-center text-sm">
        <Link href="/log" className="rounded-md bg-rose-600 px-4 py-3 text-white">
          Log today
        </Link>
        <Link href="/calendar" className="rounded-md border px-4 py-3">
          Calendar
        </Link>
        <Link href="/history" className="rounded-md border px-4 py-3">
          History
        </Link>
        <Link href="/settings" className="rounded-md border px-4 py-3">
          Settings
        </Link>
      </nav>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- CycleSummary`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx src/components/CycleSummary.tsx src/components/CycleSummary.test.tsx
git commit -m "feat(ui): home cycle summary with explainable prediction"
```

---

### Task 10: Daily logging screen

**Files:**
- Create: `app/log/page.tsx`
- Create: `src/components/DailyLogForm.tsx`
- Create: `src/domain/log-options.ts`
- Test: `src/components/DailyLogForm.test.tsx`

**Interfaces:**
- Consumes: `useHealthData` (`saveLog`, `startPeriod`, `dailyLogs`); `DailyLog`, `FlowIntensity` from `@/src/domain/types`; `todayISO` from `@/src/domain/dates`.
- Produces:
  - `log-options.ts`: `SYMPTOM_OPTIONS: string[]`, `MOOD_OPTIONS: string[]`, `FLOW_OPTIONS: FlowIntensity[]`.
  - `DailyLogForm({ date })` — toggles symptoms/moods, selects flow, free-text notes, and persists via `saveLog`; if flow is set to a non-`none` value and no cycle starts on `date`, it also calls `startPeriod(date)`.

- [ ] **Step 1: Write the failing test**

Create `src/components/DailyLogForm.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DailyLogForm } from './DailyLogForm';
import { deleteAll, getDailyLog } from '@/src/data/repository';

beforeEach(async () => {
  await deleteAll();
});

describe('DailyLogForm', () => {
  it('saves selected symptoms and mood for the date', async () => {
    render(<DailyLogForm date="2026-06-17" />);

    await userEvent.click(screen.getByRole('button', { name: /cramps/i }));
    await userEvent.click(screen.getByRole('button', { name: /happy/i }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(async () => {
      const log = await getDailyLog('2026-06-17');
      expect(log?.symptoms).toContain('Cramps');
      expect(log?.moods).toContain('Happy');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- DailyLogForm`
Expected: FAIL — cannot find module './DailyLogForm'.

- [ ] **Step 3: Write the option lists**

Create `src/domain/log-options.ts`:
```ts
import type { FlowIntensity } from './types';

export const FLOW_OPTIONS: FlowIntensity[] = [
  'none',
  'spotting',
  'light',
  'medium',
  'heavy',
];

export const SYMPTOM_OPTIONS: string[] = [
  'Cramps',
  'Headache',
  'Bloating',
  'Tender breasts',
  'Acne',
  'Fatigue',
  'Backache',
  'Nausea',
];

export const MOOD_OPTIONS: string[] = [
  'Happy',
  'Calm',
  'Anxious',
  'Irritable',
  'Sad',
  'Energetic',
  'Mood swings',
];
```

- [ ] **Step 4: Write the component**

Create `src/components/DailyLogForm.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import type { FlowIntensity, ISODate } from '@/src/domain/types';
import { useHealthData } from '@/src/state/useHealthData';
import {
  FLOW_OPTIONS,
  MOOD_OPTIONS,
  SYMPTOM_OPTIONS,
} from '@/src/domain/log-options';

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm ${
        active ? 'border-rose-600 bg-rose-600 text-white' : 'border-neutral-300'
      }`}
    >
      {label}
    </button>
  );
}

export function DailyLogForm({ date }: { date: ISODate }) {
  const { dailyLogs, saveLog, startPeriod, cycles } = useHealthData();
  const existing = dailyLogs.find((l) => l.date === date);

  const [flow, setFlow] = useState<FlowIntensity>('none');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existing) {
      setFlow(existing.flow ?? 'none');
      setSymptoms(existing.symptoms);
      setMoods(existing.moods);
      setNotes(existing.notes ?? '');
    }
  }, [existing]);

  function toggle(list: string[], value: string): string[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  async function handleSave() {
    await saveLog({ date, flow, symptoms, moods, notes: notes || undefined });
    const hasFlow = flow !== 'none';
    const cycleExists = cycles.some((c) => c.startDate === date);
    if (hasFlow && !cycleExists) await startPeriod(date);
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-medium">Flow</h2>
        <div className="flex flex-wrap gap-2">
          {FLOW_OPTIONS.map((f) => (
            <Chip key={f} label={f} active={flow === f} onClick={() => setFlow(f)} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium">Symptoms</h2>
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS.map((s) => (
            <Chip
              key={s}
              label={s}
              active={symptoms.includes(s)}
              onClick={() => setSymptoms((prev) => toggle(prev, s))}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium">Mood</h2>
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((m) => (
            <Chip
              key={m}
              label={m}
              active={moods.includes(m)}
              onClick={() => setMoods((prev) => toggle(prev, m))}
            />
          ))}
        </div>
      </section>

      <section>
        <label htmlFor="notes" className="mb-2 block text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-neutral-300 p-2"
          rows={3}
        />
      </section>

      <button
        type="button"
        onClick={handleSave}
        className="w-full rounded-md bg-rose-600 px-4 py-2 font-medium text-white"
      >
        Save
      </button>
      {saved && <p className="text-center text-sm text-green-700">Saved</p>}
    </div>
  );
}
```

Create `app/log/page.tsx`:
```tsx
'use client';

import { DailyLogForm } from '@/src/components/DailyLogForm';
import { todayISO } from '@/src/domain/dates';

export default function LogPage() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">Log for today</h1>
      <DailyLogForm date={todayISO()} />
    </main>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- DailyLogForm`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/log/page.tsx src/components/DailyLogForm.tsx src/domain/log-options.ts src/components/DailyLogForm.test.tsx
git commit -m "feat(ui): daily logging for flow, symptoms, mood, notes"
```

---

### Task 11: Calendar view

**Files:**
- Create: `app/calendar/page.tsx`
- Create: `src/components/CycleCalendar.tsx`
- Create: `src/domain/calendar.ts`
- Test: `src/domain/calendar.test.ts`

**Interfaces:**
- Consumes: `Cycle`, `Prediction`, `ISODate` from `@/src/domain/types`; `addDays`, `daysBetween`, `parseISODate`, `toISODate` from `@/src/domain/dates`.
- Produces:
  - `calendar.ts`: `type DayMarker = 'period' | 'predicted-period' | 'fertile' | 'ovulation' | 'none'` and `getDayMarker(date: ISODate, cycles: Cycle[], prediction: Prediction | null): DayMarker` (logged period takes priority over predictions).
  - `CycleCalendar({ cycles, prediction, month })` — renders a month grid with accessible labels per marker (not color-only).

- [ ] **Step 1: Write the failing test**

Create `src/domain/calendar.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { getDayMarker } from './calendar';
import { generatePrediction } from './prediction';
import type { Cycle } from './types';

const cycles: Cycle[] = [
  { id: 'a', startDate: '2026-01-01', endDate: '2026-01-05' },
  { id: 'b', startDate: '2026-01-29', endDate: '2026-02-02' },
  { id: 'c', startDate: '2026-02-26', endDate: '2026-03-02' },
];
const prediction = generatePrediction(cycles, '2026-03-10')!;

describe('getDayMarker', () => {
  it('marks logged period days', () => {
    expect(getDayMarker('2026-01-03', cycles, prediction)).toBe('period');
  });
  it('marks the predicted ovulation day', () => {
    expect(getDayMarker(prediction.ovulationDate, cycles, prediction)).toBe(
      'ovulation',
    );
  });
  it('marks fertile-window days', () => {
    expect(getDayMarker(prediction.fertileWindow.start, cycles, prediction)).toBe(
      'fertile',
    );
  });
  it('marks predicted period days', () => {
    expect(getDayMarker(prediction.nextPeriodStart, cycles, prediction)).toBe(
      'predicted-period',
    );
  });
  it('returns none for ordinary days', () => {
    expect(getDayMarker('2026-03-15', cycles, prediction)).toBe('none');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- calendar`
Expected: FAIL — cannot find module './calendar'.

- [ ] **Step 3: Write the marker logic**

Create `src/domain/calendar.ts`:
```ts
import type { Cycle, ISODate, Prediction } from './types';
import { addDays, daysBetween } from './dates';

export type DayMarker =
  | 'period'
  | 'predicted-period'
  | 'fertile'
  | 'ovulation'
  | 'none';

function inRange(date: ISODate, start: ISODate, end: ISODate): boolean {
  return daysBetween(start, date) >= 0 && daysBetween(date, end) >= 0;
}

function isLoggedPeriod(date: ISODate, cycles: Cycle[]): boolean {
  return cycles.some((c) => {
    const end = c.endDate ?? c.startDate;
    return inRange(date, c.startDate, end);
  });
}

export function getDayMarker(
  date: ISODate,
  cycles: Cycle[],
  prediction: Prediction | null,
): DayMarker {
  if (isLoggedPeriod(date, cycles)) return 'period';
  if (!prediction) return 'none';
  if (date === prediction.ovulationDate) return 'ovulation';
  if (inRange(date, prediction.fertileWindow.start, prediction.fertileWindow.end))
    return 'fertile';
  const predictedEnd = addDays(
    prediction.nextPeriodStart,
    prediction.predictedPeriodLength - 1,
  );
  if (inRange(date, prediction.nextPeriodStart, predictedEnd))
    return 'predicted-period';
  return 'none';
}
```

- [ ] **Step 4: Write the calendar component**

Create `src/components/CycleCalendar.tsx`:
```tsx
import type { Cycle, ISODate, Prediction } from '@/src/domain/types';
import { getDayMarker, type DayMarker } from '@/src/domain/calendar';
import { addDays, parseISODate, toISODate } from '@/src/domain/dates';

const MARKER_STYLE: Record<DayMarker, string> = {
  period: 'bg-rose-600 text-white',
  'predicted-period': 'bg-rose-200 text-rose-900',
  fertile: 'bg-emerald-100 text-emerald-900',
  ovulation: 'bg-emerald-500 text-white',
  none: '',
};

const MARKER_LABEL: Record<DayMarker, string> = {
  period: 'period',
  'predicted-period': 'predicted period',
  fertile: 'fertile window',
  ovulation: 'ovulation',
  none: '',
};

export function CycleCalendar({
  cycles,
  prediction,
  month,
}: {
  cycles: Cycle[];
  prediction: Prediction | null;
  month: ISODate; // any date within the month to render
}) {
  const first = parseISODate(month);
  const year = first.getFullYear();
  const m = first.getMonth();
  const firstOfMonth = new Date(year, m, 1);
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();

  const cells: (ISODate | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toISODate(new Date(year, m, i + 1)),
    ),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-neutral-500">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const marker = getDayMarker(date, cycles, prediction);
          const day = Number(date.slice(-2));
          const label = MARKER_LABEL[marker]
            ? `${date}, ${MARKER_LABEL[marker]}`
            : date;
          return (
            <div
              key={i}
              aria-label={label}
              title={MARKER_LABEL[marker] || undefined}
              className={`flex aspect-square items-center justify-center rounded-md text-sm ${MARKER_STYLE[marker]}`}
            >
              {day}
            </div>
          );
        })}
      </div>
      <ul className="mt-4 space-y-1 text-xs text-neutral-600">
        <li>● Period &nbsp; ◐ Predicted period</li>
        <li>● Fertile window &nbsp; ◉ Ovulation</li>
      </ul>
    </div>
  );
}
```

Create `app/calendar/page.tsx`:
```tsx
'use client';

import { useHealthData } from '@/src/state/useHealthData';
import { CycleCalendar } from '@/src/components/CycleCalendar';
import { todayISO } from '@/src/domain/dates';

export default function CalendarPage() {
  const { cycles, prediction, loading } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">Calendar</h1>
      <CycleCalendar cycles={cycles} prediction={prediction} month={todayISO()} />
    </main>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- calendar`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add app/calendar/page.tsx src/components/CycleCalendar.tsx src/domain/calendar.ts src/domain/calendar.test.ts
git commit -m "feat(ui): month calendar with accessible cycle markers"
```

---

### Task 12: History & trends

**Files:**
- Create: `app/history/page.tsx`
- Create: `src/components/CycleHistory.tsx`
- Test: `src/components/CycleHistory.test.tsx`

**Interfaces:**
- Consumes: `Cycle`, `CycleStats` from `@/src/domain/types`; `computeCycleLengths` from `@/src/domain/cycle-stats`.
- Produces: `CycleHistory({ cycles, stats })` — shows summary stats (average cycle length, average period length, regularity) and a per-cycle list with each cycle's length.

- [ ] **Step 1: Write the failing test**

Create `src/components/CycleHistory.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CycleHistory } from './CycleHistory';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import type { Cycle } from '@/src/domain/types';

const cycles: Cycle[] = [
  { id: 'a', startDate: '2026-01-01', endDate: '2026-01-05' },
  { id: 'b', startDate: '2026-01-29', endDate: '2026-02-02' },
];

describe('CycleHistory', () => {
  it('shows average cycle length', () => {
    render(<CycleHistory cycles={cycles} stats={computeCycleStats(cycles)} />);
    expect(screen.getByText(/28 days/i)).toBeInTheDocument();
  });

  it('shows an empty state without data', () => {
    render(<CycleHistory cycles={[]} stats={computeCycleStats([])} />);
    expect(screen.getByText(/no cycles logged yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CycleHistory`
Expected: FAIL — cannot find module './CycleHistory'.

- [ ] **Step 3: Write the component**

Create `src/components/CycleHistory.tsx`:
```tsx
import type { Cycle, CycleStats } from '@/src/domain/types';
import { computeCycleLengths } from '@/src/domain/cycle-stats';

export function CycleHistory({
  cycles,
  stats,
}: {
  cycles: Cycle[];
  stats: CycleStats;
}) {
  if (cycles.length === 0) {
    return <p className="text-neutral-600">No cycles logged yet.</p>;
  }

  const lengths = computeCycleLengths(cycles);
  const sorted = [...cycles].sort((a, b) =>
    b.startDate.localeCompare(a.startDate),
  );

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-neutral-100 p-3">
          <dt className="text-xs text-neutral-500">Avg cycle</dt>
          <dd className="text-lg font-semibold">{stats.averageCycleLength} days</dd>
        </div>
        <div className="rounded-xl bg-neutral-100 p-3">
          <dt className="text-xs text-neutral-500">Avg period</dt>
          <dd className="text-lg font-semibold">{stats.averagePeriodLength} days</dd>
        </div>
        <div className="rounded-xl bg-neutral-100 p-3">
          <dt className="text-xs text-neutral-500">Regularity</dt>
          <dd className="text-lg font-semibold">
            {stats.isRegular ? 'Regular' : 'Variable'}
          </dd>
        </div>
      </dl>

      <ul className="divide-y divide-neutral-200">
        {sorted.map((c, i) => {
          // lengths are in chronological order; map newest-first index back.
          const lengthIndex = lengths.length - 1 - i;
          const length = lengthIndex >= 0 ? lengths[lengthIndex] : null;
          return (
            <li key={c.id} className="flex justify-between py-3 text-sm">
              <span>{c.startDate}</span>
              <span className="text-neutral-500">
                {length ? `${length} day cycle` : 'Current cycle'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

Create `app/history/page.tsx`:
```tsx
'use client';

import { useHealthData } from '@/src/state/useHealthData';
import { CycleHistory } from '@/src/components/CycleHistory';

export default function HistoryPage() {
  const { cycles, stats, loading } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">History &amp; trends</h1>
      <CycleHistory cycles={cycles} stats={stats} />
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- CycleHistory`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add app/history/page.tsx src/components/CycleHistory.tsx src/components/CycleHistory.test.tsx
git commit -m "feat(ui): cycle history and trend summary"
```

---

### Task 13: Settings — data export & delete

**Files:**
- Create: `app/settings/page.tsx`
- Create: `src/components/DataControls.tsx`
- Create: `src/data/export.ts`
- Test: `src/data/export.test.ts`

**Interfaces:**
- Consumes: `exportAll`, `deleteAll` from `@/src/data/repository`.
- Produces:
  - `export.ts`: `buildExportBlob(data: { cycles; dailyLogs }): { filename: string; json: string }` — serializes a versioned export payload.
  - `DataControls` — buttons to download the JSON export and to delete all data (with a confirm step).

- [ ] **Step 1: Write the failing test**

Create `src/data/export.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildExportBlob } from './export';

describe('buildExportBlob', () => {
  it('produces a versioned JSON payload', () => {
    const { filename, json } = buildExportBlob({
      cycles: [{ id: 'a', startDate: '2026-01-01' }],
      dailyLogs: [{ date: '2026-01-01', symptoms: [], moods: [] }],
    });
    expect(filename).toMatch(/lumen-export-.*\.json/);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.cycles).toHaveLength(1);
    expect(parsed.dailyLogs).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- export`
Expected: FAIL — cannot find module './export'.

- [ ] **Step 3: Write the export builder**

Create `src/data/export.ts`:
```ts
import type { Cycle, DailyLog } from '@/src/domain/types';
import { todayISO } from '@/src/domain/dates';

export function buildExportBlob(data: {
  cycles: Cycle[];
  dailyLogs: DailyLog[];
}): { filename: string; json: string } {
  const payload = {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    cycles: data.cycles,
    dailyLogs: data.dailyLogs,
  };
  return {
    filename: `lumen-export-${todayISO()}.json`,
    json: JSON.stringify(payload, null, 2),
  };
}
```

- [ ] **Step 4: Write the controls component**

Create `src/components/DataControls.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { deleteAll, exportAll } from '@/src/data/repository';
import { buildExportBlob } from '@/src/data/export';

export function DataControls({ onDeleted }: { onDeleted?: () => void }) {
  const [confirming, setConfirming] = useState(false);

  async function handleExport() {
    const data = await exportAll();
    const { filename, json } = buildExportBlob(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    await deleteAll();
    setConfirming(false);
    onDeleted?.();
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleExport}
        className="w-full rounded-md border px-4 py-2"
      >
        Export my data
      </button>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-full rounded-md border border-red-300 px-4 py-2 text-red-700"
        >
          Delete all data
        </button>
      ) : (
        <div className="space-y-2 rounded-md border border-red-300 p-3">
          <p className="text-sm text-red-700">
            This permanently deletes everything on this device. This cannot be
            undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 rounded-md bg-red-600 px-4 py-2 text-white"
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-md border px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

Create `app/settings/page.tsx`:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { DataControls } from '@/src/components/DataControls';

export default function SettingsPage() {
  const router = useRouter();
  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600">Your data</h2>
        <p className="text-xs text-neutral-500">
          Your health data is stored only on this device. We never upload it.
        </p>
        <DataControls onDeleted={() => router.replace('/onboarding')} />
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- export`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/settings/page.tsx src/components/DataControls.tsx src/data/export.ts src/data/export.test.ts
git commit -m "feat(settings): local data export and hard delete"
```

---

### Task 14: PWA (installable + offline)

**Files:**
- Create: `app/manifest.ts`
- Create: `public/sw.js`
- Create: `src/components/ServiceWorkerRegistrar.tsx`
- Modify: `app/layout.tsx`
- Test: `src/components/ServiceWorkerRegistrar.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a web app manifest, a basic offline-shell service worker, and a client component that registers it. After this task the app is installable and the shell loads offline (data already works offline via IndexedDB).

- [ ] **Step 1: Write the failing test**

Create `src/components/ServiceWorkerRegistrar.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ServiceWorkerRegistrar', () => {
  it('registers the service worker when supported', () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });
    render(<ServiceWorkerRegistrar />);
    expect(register).toHaveBeenCalledWith('/sw.js');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ServiceWorkerRegistrar`
Expected: FAIL — cannot find module './ServiceWorkerRegistrar'.

- [ ] **Step 3: Write the manifest, service worker, and registrar**

Create `app/manifest.ts`:
```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lumen — Cycle & Health',
    short_name: 'Lumen',
    description: 'Private, offline-first cycle and health tracking.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#e11d48',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
```

Create `public/sw.js`:
```js
const CACHE = 'lumen-shell-v1';
const SHELL = ['/', '/log', '/calendar', '/history', '/settings'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
```

Create `src/components/ServiceWorkerRegistrar.tsx`:
```tsx
'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js');
    }
  }, []);
  return null;
}
```

Note on the test: the registrar uses `useEffect`, which runs after render in jsdom. If the assertion runs before the effect, wrap registration logic into a module-level call invoked from the effect, or assert via `await waitFor(() => expect(register).toHaveBeenCalled())`. Update the test's last line to:
```tsx
import { waitFor } from '@testing-library/react';
// ...
await waitFor(() => expect(register).toHaveBeenCalledWith('/sw.js'));
```
and make the test function `async`.

- [ ] **Step 4: Wire the registrar into the layout**

Modify `app/layout.tsx` to render `<ServiceWorkerRegistrar />` inside `<body>` (keep existing metadata/font setup):
```tsx
import { ServiceWorkerRegistrar } from '@/src/components/ServiceWorkerRegistrar';
// inside <body>, before {children}:
//   <ServiceWorkerRegistrar />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- ServiceWorkerRegistrar`
Expected: PASS.

- [ ] **Step 6: Verify production build still succeeds**

Run: `npm run build`
Expected: build completes; `/manifest.webmanifest` is generated.

- [ ] **Step 7: Commit**

```bash
git add app/manifest.ts public/sw.js src/components/ServiceWorkerRegistrar.tsx app/layout.tsx src/components/ServiceWorkerRegistrar.test.tsx
git commit -m "feat(pwa): installable manifest + offline shell service worker"
```

---

### Task 15: App passcode lock (privacy)

**Files:**
- Create: `src/security/passcode.ts`
- Create: `src/components/PasscodeGate.tsx`
- Modify: `app/layout.tsx`
- Test: `src/security/passcode.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (uses Web Crypto + `localStorage`).
- Produces:
  - `passcode.ts`: `hashPasscode(code: string): Promise<string>` (SHA-256 hex), `setPasscode(code)`, `hasPasscode(): boolean`, `verifyPasscode(code): Promise<boolean>`, `clearPasscode()`. Only the **hash** is persisted (never the passcode).
  - `PasscodeGate` — wraps children; if a passcode is set, requires entry before rendering them.

- [ ] **Step 1: Write the failing test**

Create `src/security/passcode.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearPasscode,
  hasPasscode,
  setPasscode,
  verifyPasscode,
} from './passcode';

beforeEach(() => {
  localStorage.clear();
});

describe('passcode', () => {
  it('reports no passcode initially', () => {
    expect(hasPasscode()).toBe(false);
  });

  it('sets and verifies a passcode without storing it in cleartext', async () => {
    await setPasscode('1234');
    expect(hasPasscode()).toBe(true);
    expect(await verifyPasscode('1234')).toBe(true);
    expect(await verifyPasscode('0000')).toBe(false);
    expect(JSON.stringify(localStorage)).not.toContain('1234');
  });

  it('clears a passcode', async () => {
    await setPasscode('1234');
    clearPasscode();
    expect(hasPasscode()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- passcode`
Expected: FAIL — cannot find module './passcode'.

- [ ] **Step 3: Write the passcode module**

Create `src/security/passcode.ts`:
```ts
const KEY = 'lumen.passcode.hash';

export async function hashPasscode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function setPasscode(code: string): Promise<void> {
  localStorage.setItem(KEY, await hashPasscode(code));
}

export function hasPasscode(): boolean {
  return localStorage.getItem(KEY) !== null;
}

export async function verifyPasscode(code: string): Promise<boolean> {
  const stored = localStorage.getItem(KEY);
  if (!stored) return false;
  return stored === (await hashPasscode(code));
}

export function clearPasscode(): void {
  localStorage.removeItem(KEY);
}
```

- [ ] **Step 4: Write the gate component**

Create `src/components/PasscodeGate.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { hasPasscode, verifyPasscode } from '@/src/security/passcode';

export function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocked(hasPasscode());
    setReady(true);
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (await verifyPasscode(code)) {
      setLocked(false);
      setError(false);
    } else {
      setError(true);
    }
  }

  if (!ready) return null;
  if (!locked) return <>{children}</>;

  return (
    <main className="mx-auto flex min-h-screen max-w-xs flex-col justify-center p-6">
      <form onSubmit={handleUnlock} className="space-y-4">
        <h1 className="text-center text-lg font-semibold">Enter passcode</h1>
        <input
          aria-label="passcode"
          type="password"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-center"
        />
        {error && (
          <p className="text-center text-sm text-red-600">Incorrect passcode</p>
        )}
        <button type="submit" className="w-full rounded-md bg-rose-600 px-4 py-2 text-white">
          Unlock
        </button>
      </form>
    </main>
  );
}
```

Modify `app/layout.tsx` to wrap `{children}` with `<PasscodeGate>`:
```tsx
import { PasscodeGate } from '@/src/components/PasscodeGate';
// inside <body>:
//   <ServiceWorkerRegistrar />
//   <PasscodeGate>{children}</PasscodeGate>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- passcode`
Expected: PASS (all cases).

- [ ] **Step 6: Run the full suite + build**

Run: `npm test`
Expected: all tests PASS.

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/security/passcode.ts src/components/PasscodeGate.tsx app/layout.tsx src/security/passcode.test.ts
git commit -m "feat(privacy): optional app passcode lock (hash-only storage)"
```

---

## Self-Review Notes

**Spec coverage (Phase 0 + Phase 1 of the PRD):**
- Account/privacy baseline → Task 15 (passcode), Task 13 (export/delete), local-only storage throughout. (Full Anonymous Mode account + E2E sync are later phases per PRD §16; not in this MVP — local-first with no backend already means no identifiable server data.)
- Offline-first local store → Task 6 + Task 14.
- Period/symptom/mood logging → Task 10.
- Calendar + home ring → Task 9, Task 11.
- Prediction engine v1 (period, fertile window, ovulation, confidence, explanation) → Tasks 4–5.
- History & trends → Task 12.
- Onboarding → Task 8.
- Data export/delete → Task 13.
- Notifications → **deferred**: web push requires backend/permission infrastructure; the PRD lists notifications in Phase 1 but they depend on the service worker (Task 14). A follow-up plan should add local notification scheduling. Flagged as the one Phase-1 item intentionally deferred to keep this plan backend-free.

**Placeholder scan:** No TBD/TODO/"handle edge cases" — every code step contains complete code.

**Type consistency:** `Prediction`, `Cycle`, `DailyLog`, `CycleStats`, `FlowIntensity`, `DayMarker`, `Confidence`, `CyclePhase` are defined once (Tasks 2, 11) and consumed with identical signatures. `generatePrediction(cycles, today)`, `computeCycleStats(cycles)`, `getCyclePhase(cycleDay, stats)`, `getDayMarker(date, cycles, prediction)` signatures match across producers and consumers.

**Scope check:** One coherent subsystem (local cycle tracking). Later phases each get their own spec → plan.
