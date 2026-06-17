# Fertility / TTC Mode — Design Spec (Phase 3)

**Date:** 2026-06-17
**Status:** Approved (design)
**PRD reference:** §6 (Pillar 2 — Fertility & Conception / TTC mode), §15 roadmap "Phase 3 — Fertility (TTC) mode"
**Builds on:** Phase 1 (cycle tracking MVP), Phase 2A (insights engine), Phase 2B (content library)

## 1. Summary

Phase 3 adds Lumen's **Trying-to-Conceive (TTC) mode**: an opt-in life-stage mode that
adds advanced fertility-signal logging (BBT, LH tests, cervical mucus, intercourse), a
deterministic **ovulation-confirmation engine** that combines those signals, qualitative
daily **conception guidance**, and feedback from confirmed ovulation into the existing
prediction engine so future forecasts use the user's *real* luteal length instead of a
fixed assumption.

It stays true to the project pillars: **local-first** (all new data in IndexedDB, no
backend), **deterministic & explainable** (the confirmation and guidance engines are
pure TS with human-readable reasons — no LLM), and **sensitive by default** (supportive
tone, non-medical disclaimers, no celebratory-pushy nudges).

### Scope (locked)

**In scope:**
- TTC mode toggle (sets `lifeStage = 'ttc'`) + BBT display-unit preference.
- Advanced signal logging: BBT, LH test result, cervical mucus type, intercourse (+ optional protection flag).
- Deterministic ovulation-confirmation engine (BBT thermal shift, corroborated by LH and mucus).
- Daily qualitative conception guidance (high / medium / low).
- Feedback into the prediction engine: confirmed ovulation overrides the current cycle's
  fertile window/ovulation, and confirmed-ovulation→next-period intervals refine the
  estimated luteal length for future predictions.
- TTC home reframing + a dedicated `/fertility` view (BBT chart, signal timeline, confirmation status).
- Sensitive handling: dismissible "when to seek help" resource note after a threshold of unsuccessful cycles; persistent non-medical disclaimer.

**Out of scope (deferred):**
- **Partner sharing** — requires sync/backend infrastructure that does not exist yet
  (app is local-first, no backend). Belongs with Phase 8 (E2E sync).
- **TTC content track** — a dedicated conception content collection. Cheap to add later by
  reusing the Phase 2B content engine; deferred to keep this slice focused.
- Pregnancy transition / confirmation (Phase 4).

## 2. Principles (inherited)

- **Local-first:** all new signals live in IndexedDB; mode/unit preferences in `localStorage`
  (`lumen.*` keys, matching the existing passcode store). No network needed.
- **Deterministic & explainable:** ovulation confirmation and conception guidance are
  rule-based and produce human-readable explanations. Never delegated to an LLM.
- **Forecast vs observation separation:** `prediction.ts` forecasts forward from cycle
  averages; the new `fertility/` module observes backward from logged signals and *feeds*
  prediction. One dependency direction: `fertility/` → consumed by prediction integration.
- **Medically responsible:** qualitative conception guidance only (never a numeric
  probability or guarantee); persistent "not contraception, not a substitute for fertility
  treatment" disclaimer on TTC surfaces.
- **Test-first pure domain core:** the engine is pure TS, built with Vitest before any UI.
- **Reuse existing vocabularies:** TTC logic reuses `Cycle`, `DailyLog`, `CyclePhase`,
  `Confidence`, and `LifeStage` — no parallel taxonomies.

## 3. Architecture

```
UI (Next.js App Router)
  ├─ Settings: TTC mode toggle + BBT unit
  ├─ Logging sheet: TTC signal section (TTC mode only)
  ├─ Home: conception card (TTC mode only)
  └─ /fertility: BBT chart + signal timeline + confirmation status
        │
useHealthData hook  ──exposes──▶ ovulationConfirmation, conceptionGuidance, refined prediction
        │
Pure-TS domain core
  ├─ src/domain/fertility/        (NEW — observation)
  │     ├─ types.ts
  │     ├─ bbt.ts          thermal-shift detection (3-over-6)
  │     ├─ confirmation.ts combine BBT + LH + mucus → OvulationConfirmation
  │     ├─ guidance.ts     daily conception guidance (high/med/low)
  │     └─ luteal.ts       estimate real luteal length from confirmed ovulations
  └─ src/domain/prediction.ts     (EXTENDED — accepts optional `observed` input)
        │
Data layer
  ├─ Dexie/IndexedDB: DailyLog gains optional TTC fields
  └─ localStorage: lumen.settings.lifeStage, lumen.settings.bbtUnit
```

## 4. Data model

### 4.1 `DailyLog` additions (`src/domain/types.ts`)

```ts
export type LHResult = 'negative' | 'positive';
export type MucusType = 'dry' | 'sticky' | 'creamy' | 'watery' | 'egg-white';

export interface DailyLog {
  date: ISODate;
  flow?: FlowIntensity;
  symptoms: string[];
  moods: string[];
  notes?: string;
  // TTC signals (Phase 3) — all optional, only set in TTC mode
  bbt?: number;                  // canonical °C (e.g. 36.55)
  lh?: LHResult;
  mucus?: MucusType;
  intercourse?: boolean;
  intercourseProtected?: boolean;
}
```

All fields optional → no Dexie schema migration required (Dexie stores documents; the
`dailyLogs` table key stays `date`). Existing logs remain valid.

### 4.2 New domain types (`src/domain/fertility/types.ts`)

```ts
export type OvulationMethod = 'bbt' | 'lh' | 'mucus';

export interface OvulationConfirmation {
  cycleId: string;
  ovulationDate: ISODate;        // best-estimate ovulation day
  status: 'confirmed' | 'likely';
  methods: OvulationMethod[];    // which signals contributed
  confidence: Confidence;        // reuse 'high' | 'medium' | 'low'
  explanation: string;           // plain-language reasoning
}

export type ConceptionLevel = 'high' | 'medium' | 'low';

export interface ConceptionGuidance {
  date: ISODate;
  level: ConceptionLevel;
  label: string;                 // e.g. "High chance to conceive"
  reason: string;                // e.g. "Positive LH test today + fertile window"
}
```

### 4.3 Settings (`src/settings/` — new, `localStorage`)

`lumen.settings.lifeStage` (`LifeStage`, default `'cycle'`) and
`lumen.settings.bbtUnit` (`'C' | 'F'`, default `'C'`). A small module mirroring
`src/security/passcode.ts`: typed get/set helpers, SSR-safe (guard `localStorage`).
BBT is stored canonical °C; the unit preference governs entry + display only, converted
at the UI edge.

## 5. Ovulation-confirmation engine (`src/domain/fertility/`)

### 5.1 BBT thermal shift — `bbt.ts`

Classic **3-over-6** rule, deterministic:
- Input: the cycle's BBT readings in date order (`{ date, bbt }[]`).
- Requires ≥ 6 readings before a candidate rise; returns `null` otherwise.
- **Coverline** = the highest of the 6 temperatures immediately preceding a candidate rise.
- A **thermal shift** is confirmed when **3 consecutive** readings are strictly above the coverline.
- **Ovulation day** = the day *before* the first of those 3 high readings.
- Output: `{ shiftDetected: boolean, coverline?: number, ovulationDate?: ISODate, firstHighDate?: ISODate }`.
- Gaps in daily temping are tolerated (operate on available readings in order); a sustained
  rise ≥ 0.2 °C is noted for confidence.

### 5.2 Signal combination — `confirmation.ts`

`confirmOvulation(logs: DailyLog[], cycle: Cycle): OvulationConfirmation | null`

- **BBT shift = primary confirmer.** When present → `status: 'confirmed'`, ovulation day from `bbt.ts`.
- **LH+** is forward/corroborating: the first positive LH test predicts ovulation ~24–36 h
  later (≈ next day). Used to corroborate and, absent BBT, to mark a *likely* ovulation.
- **Mucus peak** corroborates: peak day = the last day of `egg-white`/`watery` mucus;
  ovulation ≈ peak ± 1 day.
- **Combination rules:**
  - BBT shift + (LH+ or mucus peak within ±2 days of the BBT estimate) → `confirmed`, `confidence: high`.
  - BBT shift alone → `confirmed`, `confidence: medium`.
  - No BBT, but LH+ and mucus peak align (within ±2 days) → `likely`, `confidence: medium`.
  - LH+ only, or mucus only → `likely`, `confidence: low`.
  - No usable signals → `null`.
- `methods[]` lists every contributing signal; `explanation` states what was observed
  (e.g. "Temperature rose above your coverline for 3 days and a positive LH test landed
  2 days earlier — ovulation confirmed around June 12.").

### 5.3 Luteal-length refinement — `luteal.ts`

`estimateLutealLength(confirmedOvulations, cycles): number | null`

- For each historical cycle with a `confirmed` ovulation followed by a known next-period
  start, compute the ovulation→next-period interval.
- Return the **median** of those intervals (robust to outliers); `null` with < 2 data points
  → prediction falls back to the existing `LUTEAL_PHASE_LENGTH` (14).

## 6. Conception guidance (`guidance.ts`)

`conceptionGuidance(date, prediction, confirmation, todaysLog): ConceptionGuidance`

Qualitative only:
- **high** — fertile-window core (ovulation day, −1, −2), OR LH+ logged today, OR egg-white mucus today.
- **medium** — fertile-window edges (−5..−3, and +1).
- **low** — outside the window; or post-ovulation luteal phase → reason "ovulation has
  passed this cycle."
- After a `confirmed` ovulation, the current cycle's window is treated as closed (guidance
  `low`) regardless of the original forecast.

Every result carries a human-readable `reason`. Guidance is always accompanied (in UI) by
the non-medical disclaimer.

## 7. Prediction integration (`src/domain/prediction.ts`)

Extend the signature, backward-compatible:

```ts
interface ObservedFertility {
  lutealLength?: number;                 // from estimateLutealLength
  currentCycleOvulation?: OvulationConfirmation;
}

generatePrediction(cycles, today, observed?: ObservedFertility): Prediction | null
```

- When `observed.lutealLength` is present, use it instead of the fixed `LUTEAL_PHASE_LENGTH`.
- When `observed.currentCycleOvulation` is present (`confirmed` or `likely`), override the
  current cycle's `ovulationDate` and recompute `fertileWindow` around the *observed* day.
- The `explanation` string notes when a prediction was refined by logged signals
  (e.g. "Refined using your confirmed ovulation and 13-day luteal phase.").
- Default behavior (no `observed`) is identical to today — non-TTC users are unaffected.

## 8. Hook + UI

### 8.1 `useHealthData`
Reads the `lifeStage`/`bbtUnit` settings; when TTC mode is active, computes
`ovulationConfirmation` (current cycle), `conceptionGuidance` (today + upcoming days),
the refined `lutealLength`, and threads `observed` into `generatePrediction`. Exposes these
to the UI. Non-TTC mode: unchanged.

### 8.2 Surfaces
- **Settings:** TTC mode toggle (`lifeStage`) + BBT unit (`°C`/`°F`).
- **Logging sheet:** a TTC section (BBT numeric input in the chosen unit, LH negative/positive,
  mucus picker, intercourse + optional protection) — rendered **only** in TTC mode.
- **Home (TTC mode):** a conception card — today's conception level + ovulation status
  (predicted vs confirmed), reusing the existing home-ring/highlight framing.
- **`/fertility` view:** a lightweight **SVG BBT chart** (no new dependency) drawing the
  cycle's temps with the coverline + thermal-shift marker; a current-cycle signal timeline
  (LH, mucus, intercourse); the ovulation-confirmation status with its plain-language
  explanation; and conception levels for the days ahead.

### 8.3 BBT chart
Custom inline SVG sparkline-style chart consistent with the existing custom calendar/insights
visuals and the local/no-dependency ethos. Plots BBT points, connects them, draws the
coverline, and marks the detected ovulation day.

## 9. Sensitive handling & disclaimer

- **Unsuccessful-cycle counter:** a "TTC cycle without success" = a cycle begun in TTC mode
  that ended in a new period start. After **6** such cycles, surface a gentle, **dismissible**
  "when to seek help" resource note. Tone: supportive, never alarming, never implying failure.
- **No celebratory-pushy nudges.** Pregnancy detection/celebration is out of scope (Phase 4).
- **Persistent non-medical disclaimer** on all TTC surfaces: "Lumen is not a contraceptive
  and not a substitute for fertility treatment or medical advice."

## 10. Testing (Vitest, test-first)

Pure-domain fixtures and cases:
- `bbt.ts`: clear biphasic series, ambiguous/no-shift series, insufficient (< 6) readings,
  series with gaps, borderline coverline.
- `confirmation.ts`: each signal alone and every combination; alignment within/outside ±2 days;
  status + confidence + methods + explanation assertions.
- `luteal.ts`: median estimation, < 2 data points fallback, outlier robustness.
- `guidance.ts`: each level per day position; LH+/egg-white overrides; post-ovulation closure.
- `prediction.ts`: backward-compat (no `observed`), luteal override, confirmed-ovulation override,
  refined-explanation text.
- UI/hook: rendered only in TTC mode; unit conversion at the edge; settings persistence.

Verify with `npm test` + `npm run build` before declaring done (evidence before claims).

## 11. Deferred / follow-ups

- Partner sharing (→ Phase 8 sync).
- TTC content track (→ reuse Phase 2B content engine in a later sub-phase).
- Importing TTC history into Pregnancy mode (→ Phase 4).
- Configurable unsuccessful-cycle threshold (hard-coded 6 for now).
