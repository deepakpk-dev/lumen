# Insights Engine — Design Spec (Phase 2A)

**Status:** Draft v1 for review
**Date:** 2026-06-17
**Project:** Lumen (women's health / cycle-tracking PWA)
**Depends on:** Cycle Tracking MVP (merged to `main`)
**Parent:** PRD §9 (Health logging & insights)

---

## 1. Purpose & scope

Generate **personalized, explainable insights from the user's own logged data** and surface them on a dedicated Insights page plus a single highlight on the home screen.

This is **Phase 2A**. Phase 2B (medically-reviewed content library + personalized feed) is a separate spec and is **out of scope here**.

### In scope (four insight types)
1. **Symptom/mood ↔ phase patterns** — correlate logged symptoms/moods with cycle phase.
2. **Cycle trends** — averages, regularity, and recent-vs-earlier direction.
3. **Anomaly nudges** — overdue period, unusual cycle length, dense symptom clusters; non-alarmist, with clinician-consult phrasing where warranted.
4. **Phase guidance** — static, general, non-diagnostic tips for the current cycle phase.

### Out of scope (YAGNI / later)
- Any AI/LLM-generated text. v1 is **deterministic rules + statistics only** (consistent with the privacy pillar and the no-backend MVP). AI summaries belong to the dedicated AI phase.
- Content library, articles, courses, personalized content feed (Phase 2B).
- Notifications/push for insights (depends on deferred notification infra).
- Cross-device sync of insights (insights are derived, never stored).

---

## 2. Constraints (carried from the project)

- **Deterministic & explainable.** Every insight's `body` cites the data basis that produced it. No randomness, no LLM.
- **Local-only.** Pure computation over data already in IndexedDB. No network, no backend.
- **Non-diagnostic.** Anomaly (`severity: 'attention'`) insights carry a clear disclaimer and, where relevant, a "consider checking with a clinician" line. No diagnoses, no medical claims.
- **Honest data-sufficiency.** Each generator guards on minimum data; when there isn't enough, it emits nothing rather than a weak/false insight. The UI shows an empty/"keep logging" state.
- **Inclusive, non-shaming tone.** No alarmist or judgmental copy.
- **Dates** are `ISODate` strings (`'YYYY-MM-DD'`).
- **Accessibility:** WCAG 2.2 AA; attention insights not conveyed by color alone (icon/label + text).
- **Insights are derived, never persisted.** Recomputed from source data each time.

---

## 3. Architecture

A pure-TypeScript module `src/domain/insights/`, mirroring the existing `src/domain/` pattern (e.g. `prediction.ts`). One small **generator** per insight type; a top-level **aggregator** composes them. UI consumes the aggregator output via the existing `useHealthData` hook.

```
src/domain/insights/
  types.ts            Insight, InsightCategory, InsightSeverity, InsightInput, constants
  phase-assignment.ts phaseForDate(date, cycles, stats) -> CyclePhase | null
  patterns.ts         generatePatternInsights(input)  -> Insight[]
  trends.ts           generateTrendInsights(input)    -> Insight[]
  anomalies.ts        generateAnomalyInsights(input)  -> Insight[]
  guidance.ts         generateGuidanceInsights(input) -> Insight[]
  insights.ts         generateInsights(input) -> Insight[];  topInsight(list) -> Insight | null
```

### Core types (`types.ts`)
```ts
import type { Cycle, DailyLog, CycleStats, Prediction, ISODate } from '@/src/domain/types';

export type InsightCategory = 'pattern' | 'trend' | 'anomaly' | 'guidance';
export type InsightSeverity = 'info' | 'attention';

export interface Insight {
  id: string;                 // stable key, unique within a render (e.g. 'pattern:Headache:luteal')
  category: InsightCategory;
  severity: InsightSeverity;  // 'attention' => anomaly/clinician-relevant
  priority: number;           // higher = more relevant; used for sort + home highlight
  title: string;
  body: string;               // explainable; cites the data basis
  detail?: string;            // optional "why am I seeing this?"
}

export interface InsightInput {
  cycles: Cycle[];
  dailyLogs: DailyLog[];
  stats: CycleStats;
  prediction: Prediction | null;
  today: ISODate;
}

// data-sufficiency / threshold constants (single source of truth)
export const MIN_SYMPTOM_OCCURRENCES = 3;        // need >=3 logs of a symptom before a pattern
export const PATTERN_CONCENTRATION = 0.6;         // >=60% of its occurrences in one phase
export const MIN_CYCLES_FOR_TRENDS = 2;           // need >=2 completed cycles
export const RECENT_CYCLE_WINDOW = 3;             // "recent" = last 3 cycles
export const OVERDUE_DAYS = 2;                     // days past predicted start before flagging overdue
export const SYMPTOM_CLUSTER_COUNT = 4;           // distinct symptoms in a short window
export const SYMPTOM_CLUSTER_WINDOW = 3;          // ...within this many days
```

### Priority ordering
`generateInsights` concatenates all generator outputs and sorts: **`attention` severity first**, then by `priority` descending, then stable by `id`. `topInsight` returns the first element (or `null` if empty). Priority bands (guidance lowest, then trends, then patterns, then anomalies highest) are encoded as the `priority` number each generator assigns.

---

## 4. Generators (behaviour)

All generators are pure: `(input: InsightInput) => Insight[]`. Each returns `[]` when its data threshold isn't met.

### 4.1 `phase-assignment.ts` — `phaseForDate(date, cycles, stats): CyclePhase | null`
Finds the cycle whose `startDate` is the most recent start `<= date`; if none (date precedes all cycles), returns `null`. Computes `cycleDay = daysBetween(start, date) + 1` and returns `getCyclePhase(cycleDay, stats)` (reusing the existing prediction-domain function). Used by the patterns generator.

### 4.2 `patterns.ts` — symptom/mood ↔ phase
- For every distinct symptom and mood across `dailyLogs`, count total occurrences and occurrences per phase (using `phaseForDate`; logs with `null` phase are ignored).
- Emit a `pattern` insight when: total occurrences `>= MIN_SYMPTOM_OCCURRENCES` **and** the most-common phase holds `>= PATTERN_CONCENTRATION` of those occurrences.
- Body cites the basis, e.g. *"You logged Headache on 4 of your 6 luteal-phase days."* `id = 'pattern:<label>:<phase>'`. `priority` mid-band. `severity: 'info'`.

### 4.3 `trends.ts` — cycle trends
- Requires `stats.cycleCount >= MIN_CYCLES_FOR_TRENDS` (else `[]`).
- Emits a regularity/average insight: *"Your cycles have been regular, averaging 28 days."* vs *"Your cycle length varies (around 28 days, ±N)."* using `stats.isRegular`, `averageCycleLength`, `cycleLengthStdDev`.
- Emits a direction insight when enough cycles exist: compare the mean of the last `RECENT_CYCLE_WINDOW` cycle lengths to the mean of earlier ones; if they differ by more than the rounding noise (>= 2 days), say *"Your recent cycles have been shorter/longer than before."* Uses `computeCycleLengths`.
- `severity: 'info'`, `priority` below patterns.

### 4.4 `anomalies.ts` — nudges
- **Overdue:** if `prediction` exists, no cycle has started on/after the predicted `nextPeriodStart`, and `daysBetween(prediction.nextPeriodStart, today) >= OVERDUE_DAYS` → *"Your period is N days later than predicted. Cycles vary; if you're concerned, consider checking with a clinician."*
- **Unusual cycle length:** if the most recent completed cycle length deviates from the user's average by more than `2 * max(1, round(stdDev))` (and `cycleCount >= MIN_CYCLES_FOR_TRENDS`) → flag it as notably longer/shorter than usual.
- **Symptom cluster:** if `>= SYMPTOM_CLUSTER_COUNT` distinct symptoms were logged within any `SYMPTOM_CLUSTER_WINDOW`-day window ending at/near `today` → a gentle "you've logged several symptoms recently" nudge.
- All `severity: 'attention'`, highest `priority`, non-alarmist, with clinician phrasing on the overdue/unusual ones.

### 4.5 `guidance.ts` — phase guidance
- Determines the current phase from `phaseForDate(today, cycles, stats)` (or `null` → `[]`).
- Returns one `guidance` insight from a static lookup table keyed by phase (general, non-diagnostic "what's typical in this phase"). `severity: 'info'`, lowest `priority`.

### 4.6 `insights.ts` — aggregator
- `generateInsights(input)`: concat all four generators, sort (attention first → priority desc → id), return.
- `topInsight(list)`: first element or `null`.

---

## 5. Integration & UI

### 5.1 Hook
`src/state/useHealthData.ts` gains a derived, **memoized** `insights: Insight[]` (memo on `[cycles, dailyLogs]` since it scans all logs). Exposed alongside `stats`/`prediction`. No new storage.

### 5.2 Components
- `src/components/InsightCard.tsx` — presentational. Renders one `Insight`: title, body, optional `detail`, category styling, and for `severity: 'attention'` an icon/label (not color-only) plus the non-diagnostic disclaimer. Pure (no hooks) for easy testing.
- `src/components/InsightsList.tsx` — maps `Insight[]` to cards; empty state: *"Keep logging to unlock insights."*

### 5.3 Pages / navigation
- `app/insights/page.tsx` — `'use client'`; renders `InsightsList` from the hook (loading state like the other pages).
- `app/page.tsx` (home) — render the `topInsight` highlight (using `InsightCard`) above/near the nav when one exists; add an **"Insights"** link to the existing nav grid (currently Log / Calendar / History / Settings).

---

## 6. Error handling & edge cases

- **No data / new user:** all generators return `[]` except possibly guidance (needs at least one cycle for phase). Insights page shows the empty state; home shows no highlight.
- **Sparse data:** thresholds prevent weak insights; e.g. a symptom logged twice never produces a pattern.
- **Irregular cycles:** trends still emit (regularity insight says "varies"); anomaly thresholds scale with the user's own stdDev so naturally-variable users aren't spammed.
- **`prediction === null`:** overdue anomaly is skipped (no prediction to compare against).
- **Date before all cycles:** `phaseForDate` returns `null`; that log is excluded from pattern tallies.
- **Determinism:** identical input always yields identical, identically-ordered output (stable sort by `id` tiebreak).

---

## 7. Testing strategy

Pure functions → straightforward unit tests with crafted fixtures.

- `phase-assignment.test.ts`: date inside a cycle maps to the right phase; date before all cycles → `null`.
- `patterns.test.ts`: a symptom concentrated in luteal phase above threshold → one pattern insight with the correct body; a symptom below `MIN_SYMPTOM_OCCURRENCES` → none; a symptom evenly spread across phases → none.
- `trends.test.ts`: regular cycles → regularity insight; `< MIN_CYCLES_FOR_TRENDS` → `[]`; recent cycles shorter than earlier → direction insight.
- `anomalies.test.ts`: today `OVERDUE_DAYS` past predicted start with no new cycle → overdue (attention); a recent cycle far from the norm → unusual-length; a dense symptom window → cluster.
- `guidance.test.ts`: current phase resolves to the matching static guidance; no cycles → `[]`.
- `insights.test.ts`: aggregation orders attention first then priority; `topInsight` returns the top; empty input → `[]` and `topInsight` → `null`.
- `InsightCard.test.tsx`: renders title/body; attention insight shows the disclaimer and a non-color indicator.
- `InsightsList.test.tsx`: renders N cards; empty list → "keep logging" state.

All tests run under the existing Vitest setup. Full suite + `npm run build` must stay green.

---

## 8. File-change summary

**New:** `src/domain/insights/{types,phase-assignment,patterns,trends,anomalies,guidance,insights}.ts` (+ their `.test.ts`), `src/components/InsightCard.tsx` (+test), `src/components/InsightsList.tsx` (+test), `app/insights/page.tsx`.
**Modified:** `src/state/useHealthData.ts` (add memoized `insights`), `app/page.tsx` (home highlight + nav link).

No data-model/schema changes; no migration; backward compatible.
