# Postpartum Mode — Design

**Date:** 2026-06-23
**Status:** Approved (pre-implementation)
**Phase:** 5 (follows Phase 4 Pregnancy mode, where postpartum was deliberately deferred)

## Summary

Postpartum mode is a new life stage for Lumen that supports a mother's **physical
recovery and mental health** in the weeks after birth. It is mother-focused — not a
newborn tracker. Its centerpiece is a crisis-aware **EPDS (Edinburgh Postnatal
Depression Scale)** screening, alongside week-by-week recovery content and recovery
logging (bleeding/lochia, postpartum-specific symptoms and moods).

It is entered **only via the birth path** of the existing pregnancy end flow; the
compassionate loss path is untouched and never enters postpartum. Exit is
**user-driven** — no cycle-return prediction is shown, consistent with Lumen's
honest, deterministic, no-fake-predictions ethos.

## Goals

- Give postpartum users a recovery-focused home instead of being dumped straight back
  into cycle tracking after birth.
- Provide a validated, deterministic, explainable mental-health screen (EPDS) with
  appropriate safety handling.
- Educate (not predict) about recovery and the return of menstruation, including the
  effect of breastfeeding (lactational amenorrhea).
- Reuse existing Lumen patterns: pure-TS domain core, Dexie data layer, `useHealthData`
  hook, App Router UI, export + hard delete, all-local privacy.

## Non-goals (YAGNI)

- Full baby tracking (feeds, diapers, baby sleep, weight curves).
- Pelvic-floor exercise programs / guided courses.
- Predicting the first postpartum period.
- Region-specific crisis-line directories (guidance stays region-agnostic).
- Partner sharing (remains a future sync-dependent phase).

## Locked product decisions (from brainstorming)

1. **Scope:** mother's recovery + mental health. Not baby tracking.
2. **PPD screen:** full 10-item EPDS, user-initiated, **crisis-aware** (surface support
   resources when the score is high or the self-harm item is non-zero).
3. **Exit / cycle return:** user-driven; **no** cycle-return prediction. Educate about
   cycle return + breastfeeding; offer switch to cycle/TTC when the user logs their
   first postpartum period or chooses to leave.

---

## 1. Life stage & lifecycle

### LifeStage
Add `'postpartum'` to the union in `src/domain/types.ts`:

```ts
export type LifeStage = 'cycle' | 'ttc' | 'pregnancy' | 'postpartum' | 'menopause';
```

`src/settings/preferences.ts` already persists `lifeStage` generically; no special
per-stage handling is needed beyond what `setLifeStage`/`getLifeStage` already do
(the TTC-start-date branch is unaffected).

### PostpartumProfile (new singleton)

```ts
export type PostpartumStatus = 'active' | 'ended';
export type PostpartumReturnTo = 'cycle' | 'ttc';

export interface PostpartumProfile {
  id: 'current';            // singleton key
  birthDate: ISODate;       // day of birth; recovery clock anchor
  startedAt: ISODate;       // when postpartum mode was switched on
  breastfeeding?: boolean;  // content/education only — NEVER a prediction input
  status: PostpartumStatus;
  endReason?: 'returned';   // reserved for future reasons; 'returned' = user exited
  endDate?: ISODate;
  returnedTo?: PostpartumReturnTo;
}
```

### Transitions
- **Entry — birth only.** In `PregnancyEndFlow`, the "Baby arrived" → Confirm action
  currently calls `endPregnancyBirth(today)`, which sets `lifeStage` to `cycle`
  (`src/state/useHealthData.ts`). This changes so that confirming birth:
  1. ends the pregnancy by birth (`endByBirth`, unchanged), then
  2. starts postpartum mode: creates a `PostpartumProfile` (`birthDate = endDate`) and
     sets `lifeStage = 'postpartum'`.
  The birth-path copy updates to reflect entering a recovery space rather than "switch
  you back to cycle tracking."
- **Loss path unchanged.** `endPregnancyLoss` still returns to `cycle` with the existing
  compassionate copy and no re-engagement nudges. Loss never enters postpartum.
- **Exit — user-driven.** `endPostpartum(profile, { returnTo, endDate })` sets
  `status = 'ended'`, records `returnedTo`, and `lifeStage` becomes `cycle` or `ttc`.
  Prompted gently after ~12 weeks of recovery content, or when the user logs their first
  postpartum period, or any time via PostpartumControls.

---

## 2. Domain core (pure TS) — `src/domain/postpartum/`

All pure, deterministic, test-first (Vitest). No LLM, no randomness, no I/O.

### `recovery.ts`
- `postpartumDay(birthDate, today): number` — 0-based days since birth.
- `postpartumWeek(birthDate, today): number` — 1-based week.
- `recoveryStage(birthDate, today): 'acute' | 'extended' | 'ongoing'` —
  acute = weeks 0–6, extended = weeks 6–12, ongoing = 12+.
- Guards: dates before birth clamp to day 0 / week 1.

### `epds.ts`
The EPDS instrument as data + a pure scorer.

- `EPDS_QUESTIONS: EpdsQuestion[]` — 10 questions, each with 4 ordered response options.
  Each option carries its **scored value 0–3**. Items that are reverse-scored in the
  standard EPDS (the scale mixes 0→3 and 3→0 items) encode their values directly in the
  option list, so the scorer never needs per-item branching.
- `EpdsResponses = number[]` (length 10, each 0–3 = chosen option index's value).
- `scoreEpds(responses): EpdsResult`:
  ```ts
  interface EpdsResult {
    total: number;                 // 0–30
    band: 'low' | 'possible' | 'probable';
    riskFlag: boolean;             // true when total >= 13 OR responses[9] > 0
    bandText: string;              // plain-language, non-diagnostic
  }
  ```
  Bands: `total < 10` → low; `10–12` → possible; `>= 13` → probable. (Standard EPDS
  cutoffs.) `riskFlag` is intentionally broader than the band so the self-harm item
  (index 9, "The thought of harming myself has occurred to me") trips support resources
  even at an otherwise-low total.
- `bandText` is supportive and explicitly non-diagnostic; every result is paired in the
  UI with "share these results with your healthcare provider."
- Validation: `scoreEpds` throws on malformed input (wrong length / out-of-range values)
  so the UI can't silently mis-score.

### `weeks.ts` (recovery content dataset + accessor)
Mirrors `src/domain/pregnancy/weeks.ts` in shape.

- `POSTPARTUM_WEEKS: PostpartumWeekContent[]` — entries for ~weeks 1–12, each with a
  short title and a few plain-language, medically-framed notes spanning: lochia/bleeding,
  perineal/C-section healing, afterpains, pelvic floor, sleep, mood/mental-health
  signposting, and feeding (breastfeeding/formula, both normalized). Content is
  mother-focused and cites the same authority tier used elsewhere (NHS/ACOG/OWH) where a
  claim warrants it.
- `postpartumContentForWeek(week): PostpartumWeekContent` — clamps to the available
  range (weeks past the dataset return the last "ongoing recovery" entry).

### `lifecycle.ts`
- `startPostpartum(input: { birthDate; today; breastfeeding? }): PostpartumProfile`.
- `setBreastfeeding(profile, value): PostpartumProfile`.
- `editBirthDate(profile, birthDate): PostpartumProfile`.
- `endPostpartum(profile, { returnTo, endDate }): PostpartumProfile`.

---

## 3. Data layer

### Dexie v3 (additive)
Extend `src/data/db.ts` with a `version(3)` that keeps the v1/v2 stores and adds:

```ts
postpartumProfile: 'id',
epdsEntries: 'id, date',
```

New `EpdsEntry` record (stored, distinct from the pure `EpdsResult`):

```ts
export interface EpdsEntry {
  id: string;
  date: ISODate;
  responses: number[];   // the 10 raw 0–3 values
  total: number;         // denormalized for cheap history rendering
  band: 'low' | 'possible' | 'probable';
}
```

### Repository (`src/data/repository.ts`)
- `savePostpartumProfile` / `getPostpartumProfile` / (clear via hard-delete).
- `saveEpdsEntry` / `listEpdsEntries` (sorted by date desc) / clear.

### Export & hard-delete (`src/data/export.ts` + DataControls path)
- Export blob includes `postpartumProfile` and `epdsEntries`.
- Hard delete clears both new tables (parity with pregnancy tables).

### DailyLog — recovery logging
Add an optional, postpartum-only field to `DailyLog`:

```ts
lochia?: FlowIntensity;  // postpartum bleeding; SEPARATE from `flow`
```

Kept separate from `flow` so postpartum bleeding never feeds cycle stats or predictions.
Like the TTC signal fields, adding an optional property to `dailyLogs` needs **no Dexie
migration** (the store keypath is unchanged). Postpartum symptoms and moods reuse the
existing `symptoms[]` / `moods[]` arrays with a postpartum-specific catalog in the form.

---

## 4. State — `useHealthData`

Additions (mirroring the pregnancy wiring):

- **Load:** `postpartumProfile`, derived `postpartumWeek` / `recoveryStage` /
  `postpartumContentToday`, `epdsEntries`, and `latestEpds` (most recent result).
- **Mutators:**
  - `startPostpartumMode(birthDate)` — called from the birth confirm path.
  - `setPostpartumBreastfeeding(value)`.
  - `updateBirthDate(birthDate)`.
  - `endPostpartumMode(returnTo)` — ends profile, sets `lifeStage` to cycle/ttc.
  - `saveEpdsCheckin(responses)` — scores, persists an `EpdsEntry`, refreshes.
- `endPregnancyBirth` is repurposed/renamed at the call site so confirming birth lands in
  postpartum mode rather than cycle. (Internally: `endByBirth` + `startPostpartum` +
  `setLifeStage('postpartum')`.)

---

## 5. UI (App Router)

- **PostpartumCard** (home, shown when `lifeStage === 'postpartum'`): recovery week +
  stage, a gentle "How are you feeling?" check-in prompt, latest EPDS band if taken, CTA
  to `/postpartum`.
- **`/postpartum`** hub: weekly recovery content, EPDS check-in entry point, recovery /
  lochia logging shortcut, breastfeeding-aware educational note about cycle return, and a
  "Manage postpartum" exit affordance.
- **EPDS check-in** (`/postpartum/checkin`): compassionate, explicitly non-diagnostic
  intro; the 10 questions; on submit shows the total, band, `bandText`, and an always-on
  "share with your provider." When `riskFlag` is true, a prominent **crisis-support
  block** appears (talk to your provider now; contact a local crisis line; emergency
  services if you are in danger), styled like the existing compassionate loss block.
- **PostpartumControls** (settings): breastfeeding toggle (content only), edit birth
  date, EPDS history list, and "End postpartum mode" → choose return to cycle or TTC.
- **PregnancyEndFlow** (birth path): copy + action updated to enter postpartum mode.
  Loss path unchanged.
- **DailyLogForm**: postpartum symptom group (afterpains, perineal pain, C-section site,
  breast pain/engorgement, night sweats, etc.), postpartum mood options, and a lochia
  control — all shown only when `lifeStage === 'postpartum'`.
- **Nav**: link to `/postpartum` when in postpartum mode (mirrors the pregnancy nav link).

---

## 6. Safety & ethics

- EPDS is presented as **screening, not diagnosis**, at every surface that shows a result.
- Crisis guidance is **region-agnostic** — it names provider/crisis-line/emergency
  services categories rather than a specific phone number, matching the choice already
  made in the loss flow and avoiding stale or wrong-country numbers.
- All data is local (IndexedDB). EPDS responses live only in `epdsEntries` and are
  included in data export and hard delete.
- No re-engagement pressure: prompts are gentle and dismissible; the user is never nagged.

---

## 7. Testing

**Pure-TS (Vitest):**
- `epds.ts`: every question's option values; reverse-scored items; total at boundaries;
  band cutoffs (9/10/12/13); `riskFlag` via high total and via item-10 > 0 at low total;
  input validation throws.
- `recovery.ts`: day/week math, stage boundaries (wk 6, wk 12), pre-birth clamps.
- `weeks.ts`: accessor returns expected entries; clamps beyond range.
- `lifecycle.ts`: start/edit/breastfeeding/end transitions.

**Hook (`useHealthData`):**
- Birth confirm → `lifeStage` becomes `postpartum` and a profile exists.
- `endPostpartumMode('cycle')` and `('ttc')` set the right life stage and end the profile.
- `saveEpdsCheckin` persists an entry and updates `latestEpds`.
- Export includes new tables; hard delete clears them.

**Component:**
- PostpartumCard renders recovery week + latest band.
- EPDS flow: scores correctly and renders the crisis block when `riskFlag` is true,
  and does not render it otherwise.
- DailyLogForm shows the postpartum group + lochia only in postpartum mode.
- PregnancyEndFlow: birth → enters postpartum; loss → unchanged (cycle, no postpartum).

**Gate:** `npm test` + `npm run build` green before declaring done.

---

## Architecture fit

Layered as established: UI (App Router) → `useHealthData` → pure-TS domain core
(`src/domain/postpartum/`) → Dexie/IndexedDB. The domain core is the IP and is built
test-first. This design is a deliberate structural mirror of Phase 4 (Pregnancy mode),
so reviewers and future phases find a familiar shape.
