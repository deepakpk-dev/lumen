# Pregnancy Mode (Phase 4) — Design

**Date:** 2026-06-21
**Status:** Approved (design); pending plan
**Pillar:** PRD §7 "Pillar 3 — Pregnancy mode"; roadmap Phase 4

## 1. Summary

Pregnancy mode is the third life-stage mode in Lumen (after cycle and TTC). It is
switched on when a user confirms a pregnancy — either freshly (entering a due date or
LMP) or carried over from cycle/TTC data. It replaces the cycle-centric home experience
with a week-by-week pregnancy experience and provides two iconic interactive tools (kick
counter, contraction timer). It includes a first-class, compassionate exit flow for both
birth and pregnancy loss.

The design follows the project's established layered architecture: a pure-TS deterministic
domain core (`src/domain/pregnancy/`) → the `useHealthData` hook → UI (Next.js App Router).
No LLM is involved; all computation is deterministic and explainable. All data stays
local (Dexie / localStorage), consistent with the privacy-first, local-first pillar.

## 2. Scope

### In scope (this plan)
- Pregnancy mode toggle (life-stage switch), reachable from settings and onboarding.
- Due-date calculation: from LMP (Naegele's rule, with optional cycle-length adjustment),
  from a directly entered due date, or imported from existing cycle/TTC data. Editable.
- Week-by-week tracker: current gestational week + days, trimester, due-date countdown,
  progress.
- Weekly baby-development + maternal-changes content from a compact bundled data table.
- Pregnancy-tuned symptom logging (reuses the existing `DailyLog.symptoms[]`).
- Kick counter (count-to-10 sessions, persisted, with history).
- Contraction timer (timed contractions, frequency/duration, educational 5-1-1 guidance).
- Compassionate exit flow: birth → cycle mode; pregnancy loss → dedicated supportive flow.
- Export + hard-delete coverage for all new pregnancy data.

### Deferred to a Phase 4 fast-follow (explicitly out of this cut)
- Weight tracking with healthy-range guidance.
- Appointments / to-dos / trimester checklists (depend on reminders/notifications infra,
  which is already a deferred follow-up).
- Symptom safety-triage prompts (educational "when to call a clinician" flags).

## 3. Architecture & storage

### 3.1 Layered structure
- **Domain core:** new `src/domain/pregnancy/` package — pure TS, test-first, deterministic.
- **State:** `useHealthData` hook extended to expose pregnancy state and mutators.
- **Data:** Dexie schema bumped to `version(2)` with three additive tables.
- **Settings:** `lifeStage` continues to live in localStorage (the mode switch), gaining the
  `'pregnancy'` value (the `LifeStage` union already includes it).
- **UI:** Next.js App Router pages + components.

### 3.2 Storage decision
The `PregnancyProfile` and tool sessions are stored in **Dexie**, not localStorage. Rationale:
due date and especially pregnancy-loss state are sensitive health data and must ride the same
hard-delete and export path as `dailyLogs`. localStorage holds only the non-sensitive mode flag.

Dexie `version(2)` adds (existing `cycles`/`dailyLogs` stores untouched — additive migration,
no data loss):

```ts
this.version(2).stores({
  cycles: 'id, startDate',           // unchanged
  dailyLogs: 'date',                 // unchanged
  pregnancyProfile: 'id',            // singleton, id = 'current'
  kickSessions: 'id, date',
  contractionSessions: 'id, date',
});
```

## 4. Data model

```ts
type ISOTimestamp = string; // ISO 8601 datetime

type PregnancyEndReason = 'birth' | 'loss';
type DueDateSource = 'lmp' | 'manual' | 'cycle';
type PregnancyStatus = 'active' | 'ended';

interface PregnancyProfile {
  id: 'current';            // singleton key
  dueDate: ISODate;
  lmp?: ISODate;            // present when known or derived
  dueDateSource: DueDateSource;
  startedAt: ISODate;       // when pregnancy mode was switched on
  status: PregnancyStatus;
  endReason?: PregnancyEndReason;
  endDate?: ISODate;
}

interface KickSession {
  id: string;
  date: ISODate;            // local date of the session
  startedAt: ISOTimestamp;
  kickTimestamps: ISOTimestamp[];
  endedAt?: ISOTimestamp;
}

interface ContractionSession {
  id: string;
  date: ISODate;
  contractions: { start: ISOTimestamp; end?: ISOTimestamp }[];
}
```

`DailyLog` is **not** modified. Pregnancy symptom logging reuses the existing `symptoms[]`
array, surfaced via a pregnancy-specific option group in `log-options`.

## 5. Domain core (`src/domain/pregnancy/`)

All modules are pure functions, built test-first with Vitest.

### 5.1 `gestation.ts`
- `eddFromLmp(lmp, opts?)` — Naegele's rule: LMP + 280 days. Optional cycle-length adjustment
  using existing `CycleStats`: `+280 + (averageCycleLength − 28)` days, when a reliable average
  is available and the caller opts in.
- `lmpFromEdd(dueDate)` — inverse: due date − 280 days.
- `gestationalAge(dueDate, onDate)` — returns `{ weeks, days }` (e.g., 14w 3d). Derived from
  the implied LMP so it stays consistent regardless of `dueDateSource`.
- `trimester(weeks)` — ACOG boundaries: T1 ≤ 13w6d, T2 14w0d–27w6d, T3 ≥ 28w0d.
- `daysUntilDue(dueDate, onDate)` — countdown (negative when post-term).
- `progressFraction(dueDate, onDate)` — gestationalDays / 280, clamped 0–1.
- Edge handling: graceful results pre-4w and post-term (>42w); never throws on plausible dates.

### 5.2 `weeks.ts`
- A compact bundled dataset covering ~weeks 4–42. Each entry:
  `{ week: number; sizeComparison: string; fetalDevelopment: string[]; maternalChanges: string[] }`.
- Per-trimester source attribution (NHS / ACOG / OWH) so content is cited at the trimester level,
  consistent with the content-library's medical-citation norm.
- `weekContent(week)` accessor returns the entry for a gestational week (clamped to the dataset
  range so early/post-term weeks still resolve).

### 5.3 `kicks.ts`
- `summarizeKickSession(session)` → `{ count, elapsedMinutes, reachedTarget }` for the standard
  count-to-10 protocol (`reachedTarget` when count ≥ 10). Non-diagnostic.

### 5.4 `contractions.ts`
- `contractionDuration(c)` — seconds between start and end.
- `contractionFrequency(contractions)` — start-to-start intervals between consecutive contractions.
- `fiveOneOneStatus(contractions, onTimestamp)` — educational guidance flag: contractions ~5 min
  apart, lasting ~1 min, sustained ~1 hour → surface a *"consider contacting your provider"*
  message. Explicitly non-diagnostic; phrased as guidance, not instruction.

### 5.5 `lifecycle.ts`
Pure transition helpers returning the next `PregnancyProfile` and/or `lifeStage`:
- `startPregnancy(input)` — builds an active profile from LMP / manual due date / imported cycle data.
- `editDueDate(profile, newDueDate, source)` — returns updated profile.
- `endByBirth(profile, endDate)` — status `ended`, reason `birth`.
- `endByLoss(profile, endDate)` — status `ended`, reason `loss`.
End transitions also signal `lifeStage` reset to `'cycle'`; the ended profile is retained
(for export) until the user deletes their data.

## 6. UI

### 6.1 `/pregnancy` — the hub
Gestational week + days, trimester label, due-date countdown with a progress ring, baby
"size of" card, fetal-development and maternal-changes lists for the current week, entry points
to the two tools, a symptom-log shortcut, and a quiet "Manage pregnancy" affordance (edit due
date / end pregnancy).

### 6.2 `/pregnancy/kicks` and `/pregnancy/contractions`
Dedicated focused timer screens (separate routes so the running timer isn't disrupted by the
dashboard), each with recent-session history.

### 6.3 Home (`app/page.tsx`)
When `lifeStage === 'pregnancy'`, render a `PregnancyCard` (week + countdown + size-of) in place
of the cycle prediction summary, and add a "Pregnancy" nav tile — the same conditional pattern
already used for the TTC `ConceptionCard` and Fertility tile.

### 6.4 Onboarding
Add an "I'm pregnant" goal that switches the mode and captures a due date or LMP.

### 6.5 Settings
`PregnancyControls`: enter pregnancy mode (due-date/LMP entry, including "import from my cycle/TTC
data") and trigger the exit flow.

### 6.6 Logging
`DailyLogForm` surfaces a pregnancy symptom group when `lifeStage === 'pregnancy'`.

## 7. Exit flow (first-class, per PRD §7.1)

From "Manage pregnancy", two gentle, non-clinical choices:

- **"Baby arrived"** (birth) → marks the profile ended/birth with an end date; shows a warm
  acknowledgment; returns to cycle mode. (Postpartum is a later phase.)
- **"My pregnancy has ended"** (loss) → a dedicated **compassionate screen**: brief acknowledgment,
  optional supportive resources/helplines, **no celebratory copy and no prediction/period prompts**.
  Quietly returns to cycle mode and **suppresses re-traumatizing nudges** — specifically, no
  immediate "log your period" / "when was your last period" prompts on return. Re-engagement happens
  entirely at the user's pace.

Both transitions go through `lifecycle.ts`, mark the profile ended (retained for export until the
user deletes), and reset `lifeStage` to `'cycle'`.

## 8. Privacy: export & hard-delete

- `buildExportBlob` is extended to include `pregnancyProfile`, `kickSessions`, and
  `contractionSessions` (bump the export `version`).
- Hard-delete is extended so the three new Dexie tables are cleared alongside `cycles`/`dailyLogs`
  (and the existing passcode/preferences clearing is unaffected). No pregnancy data — including
  loss state — survives a hard delete.

## 9. Testing strategy

- **Domain (test-first):** gestation math (EDD both directions, gestational age, trimester
  boundaries, countdown, clamps), week accessor (range + clamping), kick summary, contraction
  duration/frequency and 5-1-1 boundary cases, and all lifecycle transitions.
- **Components:** `PregnancyCard`, the hub, kick counter, contraction timer, `PregnancyControls`,
  and the exit/loss flow (asserting absence of celebratory/period-prompt copy on the loss path).
- **Integration:** `useHealthData` wiring; export and hard-delete covering the three new tables.
- **Gate:** `npm test` + `npm run build` green before declaring done.

## 10. Non-goals / guardrails
- No diagnosis. Kick-counter and contraction (5-1-1) outputs are framed as educational guidance
  that defers to a clinician, never as medical advice.
- No backend/sync; all data local.
- No LLM in any computation path.
