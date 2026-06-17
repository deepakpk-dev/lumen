# Insights Engine Implementation Plan (Phase 2A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate deterministic, explainable insights from the user's own logged data (symptom/mood↔phase patterns, cycle trends, anomaly nudges, phase guidance) and surface them on a dedicated Insights page plus a single home highlight.

**Architecture:** A pure-TypeScript module `src/domain/insights/` with one small generator per insight type and a top-level aggregator, mirroring the existing `src/domain/prediction.ts` pattern. The `useHealthData` hook exposes a memoized `insights` array; new presentational components render them.

**Tech Stack:** TypeScript, React, Next.js App Router, Tailwind, Vitest + @testing-library/react. No new dependencies.

## Global Constraints

- **Deterministic & explainable:** every insight's `body` cites its data basis; no randomness, no LLM. Identical input → identical, identically-ordered output.
- **Local-only:** pure computation over data already in IndexedDB; no network, no backend, no new storage. Insights are derived, never persisted.
- **Non-diagnostic:** `severity: 'attention'` insights carry a disclaimer and clinician-consult phrasing; no diagnoses or medical claims.
- **Honest data-sufficiency:** each generator returns `[]` when its threshold isn't met (never a weak insight).
- **Inclusive, non-shaming tone** throughout; anomalies are non-alarmist.
- **Dates are `ISODate` strings (`'YYYY-MM-DD'`)**; ISO strings sort chronologically with `localeCompare`.
- **Accessibility:** attention is not conveyed by color alone (icon/label + text).
- **TypeScript strict mode**; package manager npm; `@` import alias resolves to the project root (use `@/src/...`).
- Existing domain functions to reuse: `getCyclePhase(cycleDay, stats)` and `generatePrediction(cycles, today)` from `@/src/domain/prediction`; `computeCycleStats(cycles)` and `computeCycleLengths(cycles)` from `@/src/domain/cycle-stats`; `addDays(date, n)`, `daysBetween(a, b)` (b−a), `todayISO()` from `@/src/domain/dates`.

---

### Task 1: Insight types & constants

**Files:**
- Create: `src/domain/insights/types.ts`
- Test: `src/domain/insights/types.test.ts`

**Interfaces:**
- Consumes: `Cycle`, `DailyLog`, `CycleStats`, `Prediction`, `ISODate` from `@/src/domain/types`.
- Produces:
  - `InsightCategory = 'pattern' | 'trend' | 'anomaly' | 'guidance'`
  - `InsightSeverity = 'info' | 'attention'`
  - `Insight { id: string; category: InsightCategory; severity: InsightSeverity; priority: number; title: string; body: string; detail?: string }`
  - `InsightInput { cycles: Cycle[]; dailyLogs: DailyLog[]; stats: CycleStats; prediction: Prediction | null; today: ISODate }`
  - constants: `MIN_SYMPTOM_OCCURRENCES=3`, `PATTERN_CONCENTRATION=0.6`, `MIN_CYCLES_FOR_TRENDS=2`, `RECENT_CYCLE_WINDOW=3`, `OVERDUE_DAYS=2`, `SYMPTOM_CLUSTER_COUNT=4`, `SYMPTOM_CLUSTER_WINDOW=3`, `PRIORITY_ANOMALY=100`, `PRIORITY_PATTERN=70`, `PRIORITY_TREND=50`, `PRIORITY_GUIDANCE=20`

- [ ] **Step 1: Write the failing test**

Create `src/domain/insights/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  MIN_SYMPTOM_OCCURRENCES,
  PATTERN_CONCENTRATION,
  MIN_CYCLES_FOR_TRENDS,
  RECENT_CYCLE_WINDOW,
  OVERDUE_DAYS,
  SYMPTOM_CLUSTER_COUNT,
  SYMPTOM_CLUSTER_WINDOW,
  PRIORITY_ANOMALY,
  PRIORITY_PATTERN,
  PRIORITY_TREND,
  PRIORITY_GUIDANCE,
} from './types';

describe('insight constants', () => {
  it('exposes thresholds', () => {
    expect(MIN_SYMPTOM_OCCURRENCES).toBe(3);
    expect(PATTERN_CONCENTRATION).toBe(0.6);
    expect(MIN_CYCLES_FOR_TRENDS).toBe(2);
    expect(RECENT_CYCLE_WINDOW).toBe(3);
    expect(OVERDUE_DAYS).toBe(2);
    expect(SYMPTOM_CLUSTER_COUNT).toBe(4);
    expect(SYMPTOM_CLUSTER_WINDOW).toBe(3);
  });

  it('orders priority bands anomaly > pattern > trend > guidance', () => {
    expect(PRIORITY_ANOMALY).toBeGreaterThan(PRIORITY_PATTERN);
    expect(PRIORITY_PATTERN).toBeGreaterThan(PRIORITY_TREND);
    expect(PRIORITY_TREND).toBeGreaterThan(PRIORITY_GUIDANCE);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- insights/types`
Expected: FAIL — cannot find module './types'.

- [ ] **Step 3: Write the types**

Create `src/domain/insights/types.ts`:
```ts
import type {
  Cycle,
  DailyLog,
  CycleStats,
  Prediction,
  ISODate,
} from '@/src/domain/types';

export type InsightCategory = 'pattern' | 'trend' | 'anomaly' | 'guidance';
export type InsightSeverity = 'info' | 'attention';

export interface Insight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  priority: number;
  title: string;
  body: string;
  detail?: string;
}

export interface InsightInput {
  cycles: Cycle[];
  dailyLogs: DailyLog[];
  stats: CycleStats;
  prediction: Prediction | null;
  today: ISODate;
}

export const MIN_SYMPTOM_OCCURRENCES = 3;
export const PATTERN_CONCENTRATION = 0.6;
export const MIN_CYCLES_FOR_TRENDS = 2;
export const RECENT_CYCLE_WINDOW = 3;
export const OVERDUE_DAYS = 2;
export const SYMPTOM_CLUSTER_COUNT = 4;
export const SYMPTOM_CLUSTER_WINDOW = 3;

export const PRIORITY_ANOMALY = 100;
export const PRIORITY_PATTERN = 70;
export const PRIORITY_TREND = 50;
export const PRIORITY_GUIDANCE = 20;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- insights/types`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/insights/types.ts src/domain/insights/types.test.ts
git commit -m "feat(insights): add Insight types and threshold constants"
```

---

### Task 2: Phase assignment helper

**Files:**
- Create: `src/domain/insights/phase-assignment.ts`
- Test: `src/domain/insights/phase-assignment.test.ts`

**Interfaces:**
- Consumes: `Cycle`, `CycleStats`, `CyclePhase`, `ISODate` from `@/src/domain/types`; `daysBetween` from `@/src/domain/dates`; `getCyclePhase` from `@/src/domain/prediction`.
- Produces: `phaseForDate(date: ISODate, cycles: Cycle[], stats: CycleStats): CyclePhase | null` — the cycle phase a given date falls in (using the most recent cycle start `<= date`), or `null` if the date precedes all cycles.

- [ ] **Step 1: Write the failing test**

Create `src/domain/insights/phase-assignment.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { phaseForDate } from './phase-assignment';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import type { Cycle } from '@/src/domain/types';

const cycles: Cycle[] = [
  { id: 'a', startDate: '2026-01-01' },
  { id: 'b', startDate: '2026-01-29' },
];
const stats = computeCycleStats(cycles); // avg 28, period 5

describe('phaseForDate', () => {
  it('maps day 1 to menstrual', () => {
    expect(phaseForDate('2026-01-01', cycles, stats)).toBe('menstrual');
  });
  it('maps day 14 to ovulation', () => {
    expect(phaseForDate('2026-01-14', cycles, stats)).toBe('ovulation');
  });
  it('maps a late day to luteal', () => {
    expect(phaseForDate('2026-01-20', cycles, stats)).toBe('luteal');
  });
  it('uses the most recent prior cycle start', () => {
    // 2026-01-29 is day 1 of cycle b
    expect(phaseForDate('2026-01-29', cycles, stats)).toBe('menstrual');
  });
  it('returns null for a date before all cycles', () => {
    expect(phaseForDate('2025-12-31', cycles, stats)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- phase-assignment`
Expected: FAIL — cannot find module './phase-assignment'.

- [ ] **Step 3: Write the implementation**

Create `src/domain/insights/phase-assignment.ts`:
```ts
import type { Cycle, CycleStats, CyclePhase, ISODate } from '@/src/domain/types';
import { daysBetween } from '@/src/domain/dates';
import { getCyclePhase } from '@/src/domain/prediction';

export function phaseForDate(
  date: ISODate,
  cycles: Cycle[],
  stats: CycleStats,
): CyclePhase | null {
  const start = cycles
    .map((c) => c.startDate)
    .filter((s) => s <= date)
    .sort((a, b) => a.localeCompare(b))
    .at(-1);
  if (!start) return null;
  const cycleDay = daysBetween(start, date) + 1;
  return getCyclePhase(cycleDay, stats);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- phase-assignment`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/domain/insights/phase-assignment.ts src/domain/insights/phase-assignment.test.ts
git commit -m "feat(insights): assign a log date to its cycle phase"
```

---

### Task 3: Pattern generator (symptom/mood ↔ phase)

**Files:**
- Create: `src/domain/insights/patterns.ts`
- Test: `src/domain/insights/patterns.test.ts`

**Interfaces:**
- Consumes: `Insight`, `InsightInput`, `MIN_SYMPTOM_OCCURRENCES`, `PATTERN_CONCENTRATION`, `PRIORITY_PATTERN` from `./types`; `CyclePhase` from `@/src/domain/types`; `phaseForDate` from `./phase-assignment`.
- Produces: `generatePatternInsights(input: InsightInput): Insight[]` — one `pattern` insight per symptom/mood that is logged `>= MIN_SYMPTOM_OCCURRENCES` times and concentrates `>= PATTERN_CONCENTRATION` of its occurrences in a single phase. `id = 'pattern:<tag>:<phase>'`. Returns results sorted by `id`.

- [ ] **Step 1: Write the failing test**

Create `src/domain/insights/patterns.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generatePatternInsights } from './patterns';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import type { Cycle, DailyLog, Prediction } from '@/src/domain/types';

const cycles: Cycle[] = [
  { id: 'a', startDate: '2026-01-01' },
  { id: 'b', startDate: '2026-01-29' },
  { id: 'c', startDate: '2026-02-26' },
];
const stats = computeCycleStats(cycles); // avg 28

function input(dailyLogs: DailyLog[]) {
  return {
    cycles,
    dailyLogs,
    stats,
    prediction: null as Prediction | null,
    today: '2026-02-20',
  };
}

const log = (date: string, symptoms: string[], moods: string[] = []): DailyLog => ({
  date,
  symptoms,
  moods,
});

describe('generatePatternInsights', () => {
  it('emits a pattern when a symptom concentrates in one phase', () => {
    // 2026-01-18/20/22 are luteal days of cycle a
    const out = generatePatternInsights(
      input([
        log('2026-01-18', ['Headache']),
        log('2026-01-20', ['Headache']),
        log('2026-01-22', ['Headache']),
      ]),
    );
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('pattern:Headache:luteal');
    expect(out[0].category).toBe('pattern');
    expect(out[0].severity).toBe('info');
    expect(out[0].body).toContain('3');
    expect(out[0].body.toLowerCase()).toContain('luteal');
  });

  it('ignores symptoms below the minimum occurrences', () => {
    const out = generatePatternInsights(
      input([log('2026-01-18', ['Cramps']), log('2026-01-20', ['Cramps'])]),
    );
    expect(out).toHaveLength(0);
  });

  it('ignores symptoms spread evenly across phases', () => {
    // menstrual (day 2), follicular (day 8), luteal (day 20) — 1 each
    const out = generatePatternInsights(
      input([
        log('2026-01-02', ['Acne']),
        log('2026-01-08', ['Acne']),
        log('2026-01-20', ['Acne']),
      ]),
    );
    expect(out).toHaveLength(0);
  });

  it('also considers moods', () => {
    const out = generatePatternInsights(
      input([
        log('2026-01-18', [], ['Irritable']),
        log('2026-01-20', [], ['Irritable']),
        log('2026-01-22', [], ['Irritable']),
      ]),
    );
    expect(out.map((i) => i.id)).toContain('pattern:Irritable:luteal');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- insights/patterns`
Expected: FAIL — cannot find module './patterns'.

- [ ] **Step 3: Write the implementation**

Create `src/domain/insights/patterns.ts`:
```ts
import type { CyclePhase } from '@/src/domain/types';
import type { Insight, InsightInput } from './types';
import {
  MIN_SYMPTOM_OCCURRENCES,
  PATTERN_CONCENTRATION,
  PRIORITY_PATTERN,
} from './types';
import { phaseForDate } from './phase-assignment';

export function generatePatternInsights(input: InsightInput): Insight[] {
  const { dailyLogs, cycles, stats } = input;

  const byTagPhase = new Map<string, Map<CyclePhase, number>>();
  const totals = new Map<string, number>();

  for (const log of dailyLogs) {
    const phase = phaseForDate(log.date, cycles, stats);
    if (!phase) continue;
    for (const tag of [...log.symptoms, ...log.moods]) {
      if (!byTagPhase.has(tag)) byTagPhase.set(tag, new Map());
      const phases = byTagPhase.get(tag)!;
      phases.set(phase, (phases.get(phase) ?? 0) + 1);
      totals.set(tag, (totals.get(tag) ?? 0) + 1);
    }
  }

  const insights: Insight[] = [];
  for (const [tag, phases] of byTagPhase) {
    const total = totals.get(tag) ?? 0;
    if (total < MIN_SYMPTOM_OCCURRENCES) continue;

    let topPhase: CyclePhase | null = null;
    let topCount = 0;
    for (const [phase, count] of phases) {
      if (count > topCount) {
        topCount = count;
        topPhase = phase;
      }
    }
    if (!topPhase || topCount / total < PATTERN_CONCENTRATION) continue;

    insights.push({
      id: `pattern:${tag}:${topPhase}`,
      category: 'pattern',
      severity: 'info',
      priority: PRIORITY_PATTERN,
      title: `${tag} often appears in your ${topPhase} phase`,
      body: `You logged ${tag} ${total} times — ${topCount} of those during your ${topPhase} phase.`,
      detail: 'Based on the days you logged this and the cycle phase each one fell in.',
    });
  }

  insights.sort((a, b) => a.id.localeCompare(b.id));
  return insights;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- insights/patterns`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/domain/insights/patterns.ts src/domain/insights/patterns.test.ts
git commit -m "feat(insights): symptom/mood-by-phase pattern detection"
```

---

### Task 4: Trend generator

**Files:**
- Create: `src/domain/insights/trends.ts`
- Test: `src/domain/insights/trends.test.ts`

**Interfaces:**
- Consumes: `Insight`, `InsightInput`, `MIN_CYCLES_FOR_TRENDS`, `RECENT_CYCLE_WINDOW`, `PRIORITY_TREND` from `./types`; `computeCycleLengths` from `@/src/domain/cycle-stats`.
- Produces: `generateTrendInsights(input: InsightInput): Insight[]` — a `trend:regularity` insight (when `stats.cycleCount >= MIN_CYCLES_FOR_TRENDS`) and, when `computeCycleLengths(cycles).length >= RECENT_CYCLE_WINDOW + 1`, a `trend:direction` insight if recent mean length differs from earlier mean by `>= 2` days.

- [ ] **Step 1: Write the failing test**

Create `src/domain/insights/trends.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generateTrendInsights } from './trends';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import { addDays } from '@/src/domain/dates';
import type { Cycle, DailyLog, Prediction } from '@/src/domain/types';

function cyclesFromGaps(gaps: number[]): Cycle[] {
  let d = '2026-01-01';
  const cycles: Cycle[] = [{ id: 'c0', startDate: d }];
  gaps.forEach((g, i) => {
    d = addDays(d, g);
    cycles.push({ id: `c${i + 1}`, startDate: d });
  });
  return cycles;
}

function input(cycles: Cycle[]) {
  return {
    cycles,
    dailyLogs: [] as DailyLog[],
    stats: computeCycleStats(cycles),
    prediction: null as Prediction | null,
    today: '2026-06-01',
  };
}

describe('generateTrendInsights', () => {
  it('returns nothing below the cycle minimum', () => {
    expect(generateTrendInsights(input(cyclesFromGaps([])))).toHaveLength(0);
  });

  it('reports regularity for steady cycles', () => {
    const out = generateTrendInsights(input(cyclesFromGaps([28, 28, 28])));
    const reg = out.find((i) => i.id === 'trend:regularity');
    expect(reg).toBeDefined();
    expect(reg!.title.toLowerCase()).toContain('regular');
  });

  it('detects a shortening direction', () => {
    // gaps: 30,30,26,26 -> recent3 mean ~27.3, earlier mean 30 -> ~-3 days
    const out = generateTrendInsights(input(cyclesFromGaps([30, 30, 26, 26])));
    const dir = out.find((i) => i.id === 'trend:direction');
    expect(dir).toBeDefined();
    expect(dir!.title.toLowerCase()).toContain('shorter');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- insights/trends`
Expected: FAIL — cannot find module './trends'.

- [ ] **Step 3: Write the implementation**

Create `src/domain/insights/trends.ts`:
```ts
import type { Insight, InsightInput } from './types';
import { MIN_CYCLES_FOR_TRENDS, RECENT_CYCLE_WINDOW, PRIORITY_TREND } from './types';
import { computeCycleLengths } from '@/src/domain/cycle-stats';

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function generateTrendInsights(input: InsightInput): Insight[] {
  const { cycles, stats } = input;
  if (stats.cycleCount < MIN_CYCLES_FOR_TRENDS) return [];

  const insights: Insight[] = [];

  insights.push(
    stats.isRegular
      ? {
          id: 'trend:regularity',
          category: 'trend',
          severity: 'info',
          priority: PRIORITY_TREND,
          title: 'Your cycles have been regular',
          body: `Over your last ${stats.cycleCount} cycles, your cycle length has averaged ${stats.averageCycleLength} days.`,
        }
      : {
          id: 'trend:regularity',
          category: 'trend',
          severity: 'info',
          priority: PRIORITY_TREND,
          title: 'Your cycle length varies',
          body: `Your cycles average about ${stats.averageCycleLength} days but vary by ±${Math.round(
            stats.cycleLengthStdDev,
          )} days.`,
        },
  );

  const lengths = computeCycleLengths(cycles);
  if (lengths.length >= RECENT_CYCLE_WINDOW + 1) {
    const recent = lengths.slice(-RECENT_CYCLE_WINDOW);
    const earlier = lengths.slice(0, -RECENT_CYCLE_WINDOW);
    const diff = Math.round(mean(recent) - mean(earlier));
    if (Math.abs(diff) >= 2) {
      const shorter = diff < 0;
      insights.push({
        id: 'trend:direction',
        category: 'trend',
        severity: 'info',
        priority: PRIORITY_TREND,
        title: shorter
          ? 'Your recent cycles have been shorter'
          : 'Your recent cycles have been longer',
        body: `Your last ${RECENT_CYCLE_WINDOW} cycles have run about ${Math.abs(
          diff,
        )} day${Math.abs(diff) === 1 ? '' : 's'} ${
          shorter ? 'shorter' : 'longer'
        } than your earlier cycles.`,
      });
    }
  }

  return insights;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- insights/trends`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/domain/insights/trends.ts src/domain/insights/trends.test.ts
git commit -m "feat(insights): cycle regularity and direction trends"
```

---

### Task 5: Anomaly generator

**Files:**
- Create: `src/domain/insights/anomalies.ts`
- Test: `src/domain/insights/anomalies.test.ts`

**Interfaces:**
- Consumes: `Insight`, `InsightInput`, `OVERDUE_DAYS`, `SYMPTOM_CLUSTER_COUNT`, `SYMPTOM_CLUSTER_WINDOW`, `MIN_CYCLES_FOR_TRENDS`, `PRIORITY_ANOMALY` from `./types`; `daysBetween` from `@/src/domain/dates`; `computeCycleLengths` from `@/src/domain/cycle-stats`.
- Produces: `generateAnomalyInsights(input: InsightInput): Insight[]` — up to three `attention` insights: `anomaly:overdue`, `anomaly:cycle-length`, `anomaly:symptom-cluster`. The cycle-length check compares the most recent cycle length against the mean/stdDev of the **prior** cycle lengths (needs `>= 3` completed lengths).

- [ ] **Step 1: Write the failing test**

Create `src/domain/insights/anomalies.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generateAnomalyInsights } from './anomalies';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import { generatePrediction } from '@/src/domain/prediction';
import { addDays } from '@/src/domain/dates';
import type { Cycle, DailyLog, Prediction } from '@/src/domain/types';

function cyclesFromGaps(gaps: number[], start = '2026-01-01'): Cycle[] {
  let d = start;
  const cycles: Cycle[] = [{ id: 'c0', startDate: d }];
  gaps.forEach((g, i) => {
    d = addDays(d, g);
    cycles.push({ id: `c${i + 1}`, startDate: d });
  });
  return cycles;
}

const log = (date: string, symptoms: string[]): DailyLog => ({
  date,
  symptoms,
  moods: [],
});

describe('generateAnomalyInsights', () => {
  it('flags an overdue period', () => {
    const cycles: Cycle[] = [{ id: 'a', startDate: '2026-05-13' }];
    const prediction = generatePrediction(cycles, '2026-06-13'); // nextPeriodStart 2026-06-10
    const out = generateAnomalyInsights({
      cycles,
      dailyLogs: [],
      stats: computeCycleStats(cycles),
      prediction,
      today: '2026-06-13',
    });
    const od = out.find((i) => i.id === 'anomaly:overdue');
    expect(od).toBeDefined();
    expect(od!.severity).toBe('attention');
    expect(od!.body.toLowerCase()).toContain('clinician');
  });

  it('does not flag overdue once a new period has started', () => {
    const cycles: Cycle[] = [
      { id: 'a', startDate: '2026-05-13' },
      { id: 'b', startDate: '2026-06-11' },
    ];
    const prediction = generatePrediction(cycles, '2026-06-13');
    const out = generateAnomalyInsights({
      cycles,
      dailyLogs: [],
      stats: computeCycleStats(cycles),
      prediction,
      today: '2026-06-13',
    });
    expect(out.find((i) => i.id === 'anomaly:overdue')).toBeUndefined();
  });

  it('flags an unusually long recent cycle vs the prior norm', () => {
    const cycles = cyclesFromGaps([28, 28, 28, 45]); // prior mean 28, last 45
    const out = generateAnomalyInsights({
      cycles,
      dailyLogs: [],
      stats: computeCycleStats(cycles),
      prediction: null,
      today: '2026-12-01',
    });
    const cl = out.find((i) => i.id === 'anomaly:cycle-length');
    expect(cl).toBeDefined();
    expect(cl!.title.toLowerCase()).toContain('longer');
  });

  it('flags a recent symptom cluster', () => {
    const out = generateAnomalyInsights({
      cycles: [],
      dailyLogs: [
        log('2026-06-17', ['Cramps', 'Headache']),
        log('2026-06-16', ['Bloating']),
        log('2026-06-15', ['Nausea']),
      ],
      stats: computeCycleStats([]),
      prediction: null as Prediction | null,
      today: '2026-06-17',
    });
    const cluster = out.find((i) => i.id === 'anomaly:symptom-cluster');
    expect(cluster).toBeDefined();
    expect(cluster!.severity).toBe('attention');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- insights/anomalies`
Expected: FAIL — cannot find module './anomalies'.

- [ ] **Step 3: Write the implementation**

Create `src/domain/insights/anomalies.ts`:
```ts
import type { Insight, InsightInput } from './types';
import {
  OVERDUE_DAYS,
  SYMPTOM_CLUSTER_COUNT,
  SYMPTOM_CLUSTER_WINDOW,
  PRIORITY_ANOMALY,
} from './types';
import { daysBetween } from '@/src/domain/dates';
import { computeCycleLengths } from '@/src/domain/cycle-stats';

export function generateAnomalyInsights(input: InsightInput): Insight[] {
  const { cycles, dailyLogs, prediction, today } = input;
  const insights: Insight[] = [];

  // Overdue period
  if (prediction) {
    const startedOnOrAfterPredicted = cycles.some(
      (c) => daysBetween(prediction.nextPeriodStart, c.startDate) >= 0,
    );
    const daysLate = daysBetween(prediction.nextPeriodStart, today);
    if (!startedOnOrAfterPredicted && daysLate >= OVERDUE_DAYS) {
      insights.push({
        id: 'anomaly:overdue',
        category: 'anomaly',
        severity: 'attention',
        priority: PRIORITY_ANOMALY,
        title: 'Your period is later than predicted',
        body: `Your period is about ${daysLate} days later than predicted. Cycles naturally vary; if you're concerned, consider checking with a clinician.`,
      });
    }
  }

  // Unusual most-recent cycle length vs the prior norm
  const lengths = computeCycleLengths(cycles);
  if (lengths.length >= 3) {
    const last = lengths[lengths.length - 1];
    const prior = lengths.slice(0, -1);
    const mean = prior.reduce((a, b) => a + b, 0) / prior.length;
    const variance =
      prior.reduce((a, b) => a + (b - mean) ** 2, 0) / prior.length;
    const sd = Math.sqrt(variance);
    const margin = 2 * Math.max(1, Math.round(sd));
    const delta = Math.round(last - mean);
    if (Math.abs(delta) > margin) {
      const longer = delta > 0;
      insights.push({
        id: 'anomaly:cycle-length',
        category: 'anomaly',
        severity: 'attention',
        priority: PRIORITY_ANOMALY,
        title: longer
          ? 'Your last cycle was longer than usual'
          : 'Your last cycle was shorter than usual',
        body: `Your most recent cycle was ${Math.abs(delta)} days ${
          longer ? 'longer' : 'shorter'
        } than your usual ${Math.round(mean)} days. If this is unexpected, consider checking with a clinician.`,
      });
    }
  }

  // Recent symptom cluster
  const distinctRecent = new Set<string>();
  for (const log of dailyLogs) {
    const age = daysBetween(log.date, today);
    if (age >= 0 && age < SYMPTOM_CLUSTER_WINDOW) {
      for (const s of log.symptoms) distinctRecent.add(s);
    }
  }
  if (distinctRecent.size >= SYMPTOM_CLUSTER_COUNT) {
    insights.push({
      id: 'anomaly:symptom-cluster',
      category: 'anomaly',
      severity: 'attention',
      priority: PRIORITY_ANOMALY,
      title: "You've logged several symptoms recently",
      body: `You've logged ${distinctRecent.size} different symptoms in the last ${SYMPTOM_CLUSTER_WINDOW} days. If you're not feeling well, consider checking with a clinician.`,
    });
  }

  return insights;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- insights/anomalies`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/domain/insights/anomalies.ts src/domain/insights/anomalies.test.ts
git commit -m "feat(insights): non-alarmist anomaly nudges"
```

---

### Task 6: Phase guidance generator

**Files:**
- Create: `src/domain/insights/guidance.ts`
- Test: `src/domain/insights/guidance.test.ts`

**Interfaces:**
- Consumes: `Insight`, `InsightInput`, `PRIORITY_GUIDANCE` from `./types`; `CyclePhase` from `@/src/domain/types`; `phaseForDate` from `./phase-assignment`.
- Produces: `generateGuidanceInsights(input: InsightInput): Insight[]` — one `guidance:<phase>` insight for the current phase (`phaseForDate(today, ...)`), or `[]` when the phase can't be determined.

- [ ] **Step 1: Write the failing test**

Create `src/domain/insights/guidance.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generateGuidanceInsights } from './guidance';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import type { Cycle, DailyLog, Prediction } from '@/src/domain/types';

const log: DailyLog[] = [];

describe('generateGuidanceInsights', () => {
  it('returns guidance for the current phase', () => {
    const cycles: Cycle[] = [{ id: 'a', startDate: '2026-06-01' }];
    const out = generateGuidanceInsights({
      cycles,
      dailyLogs: log,
      stats: computeCycleStats(cycles),
      prediction: null as Prediction | null,
      today: '2026-06-17', // day 17 -> luteal
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('guidance:luteal');
    expect(out[0].category).toBe('guidance');
    expect(out[0].body.length).toBeGreaterThan(0);
  });

  it('returns nothing when there are no cycles', () => {
    const out = generateGuidanceInsights({
      cycles: [],
      dailyLogs: log,
      stats: computeCycleStats([]),
      prediction: null as Prediction | null,
      today: '2026-06-17',
    });
    expect(out).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- insights/guidance`
Expected: FAIL — cannot find module './guidance'.

- [ ] **Step 3: Write the implementation**

Create `src/domain/insights/guidance.ts`:
```ts
import type { CyclePhase } from '@/src/domain/types';
import type { Insight, InsightInput } from './types';
import { PRIORITY_GUIDANCE } from './types';
import { phaseForDate } from './phase-assignment';

const GUIDANCE: Record<CyclePhase, { title: string; body: string }> = {
  menstrual: {
    title: "You're in your menstrual phase",
    body: 'Your period is here. Rest, hydration, and gentle movement can help with cramps and fatigue.',
  },
  follicular: {
    title: "You're in your follicular phase",
    body: 'Estrogen is rising after your period. Many people feel more energetic and focused now.',
  },
  ovulation: {
    title: "You're around ovulation",
    body: "You're near your most fertile days. Some people notice more energy and a higher libido.",
  },
  luteal: {
    title: "You're in your luteal phase",
    body: 'Progesterone rises after ovulation. PMS-type changes like mood shifts or bloating are common now.',
  },
};

export function generateGuidanceInsights(input: InsightInput): Insight[] {
  const phase = phaseForDate(input.today, input.cycles, input.stats);
  if (!phase) return [];
  const g = GUIDANCE[phase];
  return [
    {
      id: `guidance:${phase}`,
      category: 'guidance',
      severity: 'info',
      priority: PRIORITY_GUIDANCE,
      title: g.title,
      body: g.body,
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- insights/guidance`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/domain/insights/guidance.ts src/domain/insights/guidance.test.ts
git commit -m "feat(insights): static phase guidance"
```

---

### Task 7: Aggregator

**Files:**
- Create: `src/domain/insights/insights.ts`
- Test: `src/domain/insights/insights.test.ts`

**Interfaces:**
- Consumes: `Insight`, `InsightInput` from `./types`; the four generators from `./patterns`, `./trends`, `./anomalies`, `./guidance`.
- Produces:
  - `generateInsights(input: InsightInput): Insight[]` — all generators concatenated, sorted: `attention` severity first, then `priority` descending, then `id` ascending.
  - `topInsight(list: Insight[]): Insight | null` — first element or `null`.

- [ ] **Step 1: Write the failing test**

Create `src/domain/insights/insights.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generateInsights, topInsight } from './insights';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import { generatePrediction } from '@/src/domain/prediction';
import type { Cycle, DailyLog, Prediction } from '@/src/domain/types';

describe('generateInsights', () => {
  it('returns empty (and null top) for an empty profile', () => {
    const out = generateInsights({
      cycles: [],
      dailyLogs: [] as DailyLog[],
      stats: computeCycleStats([]),
      prediction: null as Prediction | null,
      today: '2026-06-17',
    });
    expect(out).toHaveLength(0);
    expect(topInsight(out)).toBeNull();
  });

  it('orders attention insights ahead of info insights', () => {
    const cycles: Cycle[] = [{ id: 'a', startDate: '2026-05-13' }];
    const prediction = generatePrediction(cycles, '2026-06-13'); // overdue by 3
    const out = generateInsights({
      cycles,
      dailyLogs: [],
      stats: computeCycleStats(cycles),
      prediction,
      today: '2026-06-13',
    });
    expect(out.length).toBeGreaterThanOrEqual(2); // overdue (attention) + guidance (info)
    expect(out[0].severity).toBe('attention');
    expect(topInsight(out)!.id).toBe('anomaly:overdue');
    // the info guidance insight comes after the attention one
    expect(out[out.length - 1].severity).toBe('info');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- insights/insights`
Expected: FAIL — cannot find module './insights'.

- [ ] **Step 3: Write the implementation**

Create `src/domain/insights/insights.ts`:
```ts
import type { Insight, InsightInput } from './types';
import { generatePatternInsights } from './patterns';
import { generateTrendInsights } from './trends';
import { generateAnomalyInsights } from './anomalies';
import { generateGuidanceInsights } from './guidance';

function severityRank(s: Insight['severity']): number {
  return s === 'attention' ? 0 : 1;
}

export function generateInsights(input: InsightInput): Insight[] {
  const all = [
    ...generateAnomalyInsights(input),
    ...generatePatternInsights(input),
    ...generateTrendInsights(input),
    ...generateGuidanceInsights(input),
  ];
  return all.sort((a, b) => {
    if (severityRank(a.severity) !== severityRank(b.severity)) {
      return severityRank(a.severity) - severityRank(b.severity);
    }
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.id.localeCompare(b.id);
  });
}

export function topInsight(list: Insight[]): Insight | null {
  return list[0] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- insights/insights`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/domain/insights/insights.ts src/domain/insights/insights.test.ts
git commit -m "feat(insights): aggregate and rank insights"
```

---

### Task 8: Expose `insights` from the hook

**Files:**
- Modify: `src/state/useHealthData.ts`
- Test: `src/state/useHealthData.insights.test.tsx`

**Interfaces:**
- Consumes: `generateInsights` from `@/src/domain/insights/insights`; `Insight` from `@/src/domain/insights/types`.
- Produces: `useHealthData()` return value gains `insights: Insight[]`. `stats`, `prediction`, and `insights` are each memoized (`stats`/`prediction` on `[cycles]`; `insights` on `[cycles, dailyLogs, stats, prediction]`).

- [ ] **Step 1: Write the failing test**

Create `src/state/useHealthData.insights.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHealthData } from './useHealthData';
import { deleteAll } from '@/src/data/repository';

beforeEach(async () => {
  await deleteAll();
});

describe('useHealthData insights', () => {
  it('exposes a trend insight after three logged cycles', async () => {
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    for (const d of ['2026-01-01', '2026-01-29', '2026-02-26']) {
      await act(async () => {
        await result.current.startPeriod(d);
      });
    }

    await waitFor(() => expect(result.current.cycles).toHaveLength(3));
    expect(Array.isArray(result.current.insights)).toBe(true);
    expect(
      result.current.insights.some((i) => i.id === 'trend:regularity'),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useHealthData.insights`
Expected: FAIL — `result.current.insights` is undefined.

- [ ] **Step 3: Update the hook**

Modify `src/state/useHealthData.ts`. Change the React import to include `useMemo`:
```ts
import { useCallback, useEffect, useMemo, useState } from 'react';
```
Add the new imports near the other domain imports:
```ts
import { generateInsights } from '@/src/domain/insights/insights';
import type { Insight } from '@/src/domain/insights/types';
```
Replace the existing derived `stats`/`prediction` lines:
```ts
  const stats: CycleStats = computeCycleStats(cycles);
  const prediction: Prediction | null = generatePrediction(cycles, todayISO());
```
with memoized versions plus insights:
```ts
  const stats: CycleStats = useMemo(() => computeCycleStats(cycles), [cycles]);
  const prediction: Prediction | null = useMemo(
    () => generatePrediction(cycles, todayISO()),
    [cycles],
  );
  const insights: Insight[] = useMemo(
    () =>
      generateInsights({
        cycles,
        dailyLogs,
        stats,
        prediction,
        today: todayISO(),
      }),
    [cycles, dailyLogs, stats, prediction],
  );
```
Add `insights` to the returned object (after `prediction`):
```ts
  return {
    cycles,
    dailyLogs,
    stats,
    prediction,
    insights,
    loading,
    startPeriod,
    endPeriod,
    saveLog,
    refresh,
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useHealthData`
Expected: PASS (both the existing hook test and the new insights test).

- [ ] **Step 5: Commit**

```bash
git add src/state/useHealthData.ts src/state/useHealthData.insights.test.tsx
git commit -m "feat(state): expose memoized insights from useHealthData"
```

---

### Task 9: InsightCard component

**Files:**
- Create: `src/components/InsightCard.tsx`
- Test: `src/components/InsightCard.test.tsx`

**Interfaces:**
- Consumes: `Insight` from `@/src/domain/insights/types`.
- Produces: `InsightCard({ insight }: { insight: Insight })` — pure presentational card. For `severity: 'attention'` it shows a non-color "Worth noting" label and a non-diagnostic disclaimer.

- [ ] **Step 1: Write the failing test**

Create `src/components/InsightCard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InsightCard } from './InsightCard';
import type { Insight } from '@/src/domain/insights/types';

const base: Insight = {
  id: 'x',
  category: 'pattern',
  severity: 'info',
  priority: 70,
  title: 'Headache often appears in your luteal phase',
  body: 'You logged Headache 3 times.',
};

describe('InsightCard', () => {
  it('renders title and body', () => {
    render(<InsightCard insight={base} />);
    expect(screen.getByText(/headache often appears/i)).toBeInTheDocument();
    expect(screen.getByText(/logged headache 3 times/i)).toBeInTheDocument();
  });

  it('shows a disclaimer and a non-color label for attention insights', () => {
    render(
      <InsightCard
        insight={{ ...base, severity: 'attention', category: 'anomaly' }}
      />,
    );
    expect(screen.getByText(/worth noting/i)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();
  });

  it('omits the disclaimer for info insights', () => {
    render(<InsightCard insight={base} />);
    expect(screen.queryByText(/not medical advice/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- InsightCard`
Expected: FAIL — cannot find module './InsightCard'.

- [ ] **Step 3: Write the component**

Create `src/components/InsightCard.tsx`:
```tsx
import type { Insight } from '@/src/domain/insights/types';

const CATEGORY_STYLE: Record<Insight['category'], string> = {
  pattern: 'border-rose-200 bg-rose-50',
  trend: 'border-neutral-200 bg-neutral-50',
  anomaly: 'border-amber-300 bg-amber-50',
  guidance: 'border-emerald-200 bg-emerald-50',
};

export function InsightCard({ insight }: { insight: Insight }) {
  const attention = insight.severity === 'attention';
  return (
    <article className={`rounded-2xl border p-4 ${CATEGORY_STYLE[insight.category]}`}>
      {attention && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
          ⚠ Worth noting
        </p>
      )}
      <h3 className="font-semibold">{insight.title}</h3>
      <p className="mt-1 text-sm text-neutral-700">{insight.body}</p>
      {insight.detail && (
        <p className="mt-2 text-xs text-neutral-500">{insight.detail}</p>
      )}
      {attention && (
        <p className="mt-2 text-xs text-neutral-500">
          This is not medical advice. If you&apos;re concerned, consult a clinician.
        </p>
      )}
    </article>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- InsightCard`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/InsightCard.tsx src/components/InsightCard.test.tsx
git commit -m "feat(ui): InsightCard with attention treatment and disclaimer"
```

---

### Task 10: InsightsList component

**Files:**
- Create: `src/components/InsightsList.tsx`
- Test: `src/components/InsightsList.test.tsx`

**Interfaces:**
- Consumes: `Insight` from `@/src/domain/insights/types`; `InsightCard` from `./InsightCard`.
- Produces: `InsightsList({ insights }: { insights: Insight[] })` — renders one `InsightCard` per insight, or an empty state (`"Keep logging to unlock insights."`) when the list is empty.

- [ ] **Step 1: Write the failing test**

Create `src/components/InsightsList.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InsightsList } from './InsightsList';
import type { Insight } from '@/src/domain/insights/types';

const make = (id: string, title: string): Insight => ({
  id,
  category: 'trend',
  severity: 'info',
  priority: 50,
  title,
  body: 'body',
});

describe('InsightsList', () => {
  it('renders a card per insight', () => {
    render(
      <InsightsList
        insights={[make('a', 'First insight'), make('b', 'Second insight')]}
      />,
    );
    expect(screen.getByText('First insight')).toBeInTheDocument();
    expect(screen.getByText('Second insight')).toBeInTheDocument();
  });

  it('shows the empty state when there are no insights', () => {
    render(<InsightsList insights={[]} />);
    expect(screen.getByText(/keep logging to unlock insights/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- InsightsList`
Expected: FAIL — cannot find module './InsightsList'.

- [ ] **Step 3: Write the component**

Create `src/components/InsightsList.tsx`:
```tsx
import type { Insight } from '@/src/domain/insights/types';
import { InsightCard } from './InsightCard';

export function InsightsList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <div className="rounded-2xl bg-neutral-50 p-6 text-center text-neutral-600">
        Keep logging to unlock insights.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- InsightsList`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/InsightsList.tsx src/components/InsightsList.test.tsx
git commit -m "feat(ui): InsightsList with empty state"
```

---

### Task 11: Insights page + home highlight + nav

**Files:**
- Create: `app/insights/page.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `useHealthData` (now returns `insights`); `InsightsList` from `@/src/components/InsightsList`; `InsightCard` from `@/src/components/InsightCard`; `topInsight` from `@/src/domain/insights/insights`.
- Produces: a `/insights` route; the home page renders the top insight (when present) and links to `/insights`.

- [ ] **Step 1: Create the Insights page**

Create `app/insights/page.tsx`:
```tsx
'use client';

import { useHealthData } from '@/src/state/useHealthData';
import { InsightsList } from '@/src/components/InsightsList';

export default function InsightsPage() {
  const { insights, loading } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">Insights</h1>
      <InsightsList insights={insights} />
    </main>
  );
}
```

- [ ] **Step 2: Wire the home highlight and nav link**

Modify `app/page.tsx`. Add imports:
```tsx
import { InsightCard } from '@/src/components/InsightCard';
import { topInsight } from '@/src/domain/insights/insights';
```
Add `insights` to the hook destructure:
```tsx
  const { cycles, stats, prediction, insights, loading } = useHealthData();
```
Compute the highlight after `lastPeriodStart`:
```tsx
  const highlight = topInsight(insights);
```
Render it between `<CycleSummary ... />` and `<nav ...>`:
```tsx
      {highlight && <InsightCard insight={highlight} />}
```
Add an Insights link inside the existing `<nav>` grid (after the Settings link):
```tsx
        <Link href="/insights" className="rounded-md border px-4 py-3">
          Insights
        </Link>
```

- [ ] **Step 3: Verify the full suite and build**

Run: `npm test`
Expected: all tests PASS (existing + new), output pristine.

Run: `npm run build`
Expected: build completes; an `/insights` route appears in the route table.

- [ ] **Step 4: Commit**

```bash
git add app/insights/page.tsx app/page.tsx
git commit -m "feat(ui): Insights page, home highlight, and nav link"
```

---

## Self-Review Notes

**Spec coverage:**
- §1 insight types → Tasks 3 (patterns), 4 (trends), 5 (anomalies), 6 (guidance).
- §3 types/constants/aggregator → Tasks 1, 7.
- §4.1 phase assignment → Task 2.
- §5 hook + components + page/home/nav → Tasks 8, 9, 10, 11.
- §6 edge cases (sparse data, null prediction, date-before-cycles, determinism) → covered by generator guards and tests in Tasks 2–7.
- §7 testing strategy → each task carries the matching tests.

**Refinement vs spec (§4.4):** the unusual-cycle-length anomaly compares the most recent cycle length to the mean/stdDev of the **prior** cycles (needs ≥3 lengths), rather than to the all-inclusive average. This is consistent with the spec's intent ("notably longer/shorter than usual") and avoids the outlier inflating both the mean and the stdDev so the check can never fire — the reason the simpler all-inclusive form is unreliable.

**Placeholder scan:** none — every code step contains complete code.

**Type consistency:** `Insight`, `InsightInput`, `InsightCategory`, `InsightSeverity` defined once (Task 1) and consumed identically. Generator signatures `generate{Pattern,Trend,Anomaly,Guidance}Insights(input)` and `phaseForDate(date, cycles, stats)`, `generateInsights(input)`, `topInsight(list)` match across producers and consumers. The hook returns `insights: Insight[]` consumed by Tasks 9–11.
