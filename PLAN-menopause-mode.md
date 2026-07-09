# Perimenopause Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the missing life stage. Flo and Clue both launched menopause modes in 2026; Lumen advertises "whole life cycle" coverage and doesn't serve it. The `'menopause'` value already exists in `LifeStage` (`src/domain/types.ts:8`) and the content system already validates it â€” this plan wires it into settings, onboarding, logging, predictions/reminders, and content.

**Architecture:** Follow the TTC-mode pattern exactly: a preference-backed stage, a settings toggle component, stage-filtered log options and content. Perimenopause users still menstruate, so cycle tracking and period prediction stay ON; what changes is framing (irregularity is expected, confidence language softens), symptom options (vasomotor symptoms), and fertility UI (fertile-window display and reminder are suppressed â€” Lumen must not imply contraceptive safety, and peri ovulation prediction is unreliable).

**Tech Stack:** existing stack only. No new dependencies.

## Global Constraints

- This repo's Next.js is a custom 16.2.9 build â€” read `node_modules/next/dist/docs/` before writing any Next-specific code.
- The word used in ALL user-facing copy is **"perimenopause"** (the years of transition, which is what a cycle tracker can serve); `'menopause'` stays as the internal `LifeStage` value â€” do not rename the type value, sync peers may hold it.
- Every content article must carry real citations (NHS / ACOG / Office on Women's Health / Mayo Clinic) â€” the content style is established; copy the shape of `src/content/articles/irregular-cycles.ts` exactly.
- No contraceptive or diagnostic claims anywhere. Perimenopause copy must state pregnancy is still possible until 12 months without a period.
- `npm run lint && npx tsc --noEmit && npm test` green before every commit.

---

### Task 1: Stage wiring â€” context setter + settings toggle

**Files:**
- Modify: `src/state/useHealthData.tsx` (add `setMenopauseMode` next to `setTtcMode` ~line 155; expose it in the context value ~line 539)
- Create: `src/components/MenopauseControls.tsx`
- Test: `src/components/MenopauseControls.test.tsx`
- Modify: `app/settings/page.tsx` (new section, gated `!inJourney`, placed after the "Trying to conceive" section)

**Interfaces:**
- Produces: `setMenopauseMode(on: boolean): void` on the `useHealthData()` context â€” flips `lifeStage` between `'menopause'` and `'cycle'` via the existing `setLifeStage(stage, todayISO())` + `refreshSettings()` pattern (copy `setTtcMode`, `useHealthData.tsx:155-161`; `setLifeStage` already handles clearing `ttcStartDate` for non-ttc stages).

- [x] **Step 1: Failing tests.** Component test modeled on `TtcControls`' (mock nothing; render inside the real provider like `useHealthData.ttc.test.tsx` does, or mock `useHealthData` like other component tests â€” copy whichever pattern `TtcControls.test.tsx` uses):

```ts
it('turns perimenopause mode on and off', async () => { /* click toggle â†’ getLifeStage() === 'menopause'; click again â†’ 'cycle' */ });
it('calls onEnabled when switched on', async () => { /* spy prop */ });
```

- [x] **Step 2:** FAIL â†’ **Step 3: implement.** `MenopauseControls.tsx` is a copy of `TtcControls.tsx` minus the unit picker:

```tsx
'use client';

import { useHealthData } from '@/src/state/useHealthData';

export function MenopauseControls({ onEnabled }: { onEnabled?: () => void }) {
  const { lifeStage, setMenopauseMode } = useHealthData();
  const on = lifeStage === 'menopause';

  function toggle() {
    const next = !on;
    setMenopauseMode(next);
    if (next) onEnabled?.();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        Perimenopause mode is <span className="font-medium">{on ? 'on' : 'off'}</span>.
      </p>
      <button
        type="button"
        onClick={toggle}
        className={`w-full rounded-md px-4 py-3 text-white ${on ? 'bg-neutral-600' : 'bg-rose-600'}`}
      >
        {on ? 'Turn off perimenopause mode' : 'Turn on perimenopause mode'}
      </button>
    </div>
  );
}
```

Settings section copy (matches the tone of the neighboring sections): heading "Perimenopause"; body "Track the transition: irregular cycles are expected here, so Lumen reframes predictions instead of alarming you, and adds symptoms like hot flashes and sleep changes. Pregnancy is still possible until you've gone 12 months without a period."

- [x] **Step 4:** PASS; full suite green. **Step 5: Commit** â€” `git commit -m "feat(peri): perimenopause life stage toggle in settings"`

### Task 2: Logging â€” perimenopause symptom/mood options

**Files:**
- Modify: `src/domain/log-options.ts`
- Modify: `src/components/DailyLogForm.tsx` (stage-based option selection â€” read how `isPostpartum` swaps option sets around lines 71-165 and extend the same mechanism)
- Test: `src/domain/log-options.test.ts`, `src/components/DailyLogForm.menopause.test.tsx` (new, modeled on `DailyLogForm.postpartum.test.tsx`)

- [x] **Step 1: Failing tests** â€” log-options: the new arrays exist, are non-empty, and have no duplicates (match the existing test file's style). DailyLogForm: with `lifeStage: 'menopause'`, the form shows "Hot flashes" as a symptom option, does NOT show TTC fields (BBT/LH/mucus), still shows flow options (peri users bleed), and saving round-trips the selected symptoms.
- [x] **Step 2:** FAIL â†’ **Step 3: implement.** Add to `log-options.ts`:

```ts
export const MENOPAUSE_SYMPTOM_OPTIONS: string[] = [
  'Hot flashes',
  'Night sweats',
  'Sleep problems',
  'Brain fog',
  'Headache',
  'Joint aches',
  'Vaginal dryness',
  'Heart palpitations',
  'Fatigue',
  'Bloating',
];

export const MENOPAUSE_MOOD_OPTIONS: string[] = [
  'Happy',
  'Calm',
  'Anxious',
  'Irritable',
  'Low mood',
  'Mood swings',
  'Energetic',
];
```

In `DailyLogForm.tsx`, extend the existing stage ternary so `lifeStage === 'menopause'` selects these sets. Flow section unchanged; TTC-only sections stay gated to `lifeStage === 'ttc'` (they already are â€” verify at line 272).

- [x] **Step 4:** PASS. **Step 5: Commit** â€” `git commit -m "feat(peri): perimenopause symptom and mood options in daily log"`

### Task 3: Predictions, reminders, calendar â€” soften, don't alarm

**Files:**
- Modify: `src/domain/reminders.ts` + `src/domain/reminders.test.ts`
- Modify: `app/page.tsx` (fertile-window presentation)
- Modify: `src/components/CycleCalendar.tsx` + test (fertile-day markers)
- Possibly modify: `src/domain/prediction.ts` (only if explanation text is composed there â€” read first)

Behavior spec:
1. **Fertile-window reminder never fires in menopause stage.** Read `src/domain/reminders.ts` first: `dueReminders()` is a pure engine â€” add the minimal parameter or input flag it needs (prefer extending its existing input object with `lifeStage` over a boolean). Period and daily-log reminders keep working.
2. **Home page:** in menopause stage, hide the fertile-window line/section of the prediction card (find where `prediction.fertileWindow` is rendered in `app/page.tsx`) and render instead one quiet line: "Cycles often become irregular in perimenopause â€” predictions carry extra uncertainty."
3. **Calendar:** fertile/ovulation day markers are not painted in menopause stage (find the marker logic in `CycleCalendar.tsx`; it receives prediction data â€” gate on the stage prop or add one).
4. **Do NOT suppress period prediction** â€” peri users still want a heads-up; low confidence is already expressed by the existing confidence machinery (irregular cycles â†’ wider ranges, lower confidence â€” that behavior exists in `cycle-stats.ts`/`prediction.ts` and needs no change).

- [x] **Step 1: Failing tests:** reminders test â€” a due fertile reminder with `lifeStage: 'menopause'` produces no fertile reminder but the same inputs with `'cycle'` do; period reminder unaffected. CycleCalendar test â€” no fertile markers in menopause stage. (Home-page line: cover in the page's existing test file if one exists; otherwise the calendar + reminders tests carry the logic and the page change is presentational.)
- [x] **Step 2:** FAIL â†’ **Step 3:** implement (smallest change that passes; keep the reminder engine pure). **Step 4:** PASS.
- [x] **Step 5: Commit** â€” `git commit -m "feat(peri): suppress fertility UI and reminders in perimenopause"`

### Task 4: Content â€” three articles + one program

**Files:**
- Create: `src/content/articles/perimenopause-what-changes.ts`
- Create: `src/content/articles/hot-flashes-night-sweats.ts`
- Create: `src/content/articles/perimenopause-when-to-see-a-doctor.ts`
- Modify: `src/content/index.ts` (register the three articles â€” see how existing articles are imported/listed)
- Create: `src/content/programs/understanding-perimenopause.ts`
- Modify: `src/content/programs/index.ts` (register)

All four files copy the exact exported shape of `src/content/articles/irregular-cycles.ts` / `src/content/programs/understanding-your-cycle.ts` (the content test suites in `src/content/index.test.ts` and `src/content/programs/index.test.ts` validate `lifeStages` membership and article/program slug cross-references â€” run them to find any shape drift). All tagged `lifeStages: ['menopause']`, `lastReviewed: <today's date>`, `author: 'Lumen Editorial'`.

Required substance per article (write full ~300-500-word bodies in the established plain, non-alarmist voice; each claim below is the factual skeleton to build from):

1. **`perimenopause-what-changes`** â€” "What changes in perimenopause": typically starts in the 40s (can be late 30s), lasts ~4-8 years; cycles shorten/lengthen and become irregular as ovulation becomes less predictable; periods can be heavier or lighter; it ends at menopause = 12 consecutive months without a period; **pregnancy remains possible until that point**; how Lumen handles it (keeps tracking, widens estimates, drops fertile-window display). Sources: NHS â€” Menopause (`https://www.nhs.uk/conditions/menopause/`), Office on Women's Health â€” Menopause basics (`https://www.womenshealth.gov/menopause/menopause-basics`).
2. **`hot-flashes-night-sweats`** â€” vasomotor symptoms affect most people in the transition; typical triggers (heat, caffeine, alcohol, stress); practical management (layers, cooler room, paced breathing); treatment exists â€” HRT/MHT and non-hormonal options are a conversation with a clinician, not app advice; log them in Lumen to spot patterns. Sources: NHS â€” Menopause symptoms/treatment, ACOG (`https://www.acog.org/womens-health/faqs/the-menopause-years`).
3. **`perimenopause-when-to-see-a-doctor`** â€” red flags that are NOT normal perimenopause and warrant a visit: **any bleeding after 12 months without a period**, very heavy bleeding (soaking through hourly), bleeding between periods or after sex, cycles shorter than 21 days persistently, symptoms disrupting daily life (there is effective help); bring your Lumen doctor summary (`/report`). Sources: NHS, ACOG as above.

Program **`understanding-perimenopause`**: steps reference the three article slugs above (the program test enforces that program lifeStages intersect each step article's lifeStages â€” tagging all three `['menopause']` satisfies it).

- [x] **Step 1:** Write the four files + registrations. **Step 2:** Run `npx vitest run src/content` â€” the existing validation suites are the tests here; they must pass. **Step 3:** Full suite green. **Step 4: Commit** â€” `git commit -m "feat(peri): perimenopause content library + program"`

### Task 5: Onboarding option

**Files:**
- Modify: `src/components/OnboardingForm.tsx` (`Goal` type at line 8, `goalIcon` map, goal button list, date-field logic)
- Modify: `src/state/useHealthData.tsx` (`completeOnboarding` â€” read it around line 257-262 to see how goals map to stages)
- Test: `src/components/OnboardingForm.test.tsx`, `src/state/useHealthData.onboarding.test.tsx`

- [x] **Step 1: Failing tests:** onboarding with the new goal lands in `lifeStage === 'menopause'` and (when a last-period date is given) seeds a cycle exactly like the `'cycle'` goal does; the goal button renders with label "Navigating perimenopause".
- [x] **Step 2:** FAIL â†’ **Step 3: implement:**
  - `export type Goal = 'cycle' | 'ttc' | 'pregnant' | 'menopause';`
  - Icon: reuse the stroke style; a simple thermometer-ish or wave glyph, `aria-hidden`, decorative like the others.
  - Date question: same as the cycle goal â€” ask for the last period start (peri users still cycle); `askingForPeriod` already computes correctly if the new goal isn't `'pregnant'` â€” **verify line 78** (`goal !== 'pregnant' || lmpMode`) still routes right, it does.
  - In `completeOnboarding`, map the new goal to `setLifeStage('menopause', todayISO())` and seed the cycle from the given date (mirror the `'cycle'` branch).
- [x] **Step 4:** PASS; run e2e smoke locally if quick (`npx playwright test e2e/smoke.spec.ts`) â€” before e2e, check nothing stale is on port 3000. **Step 5: Commit** â€” `git commit -m "feat(peri): perimenopause onboarding goal"`

### Task 6: Docs

- Modify: `README.md` (life-cycle claim), `docs/USER_GUIDE.md` (new stage section), `docs/COMPETITIVE_BENCHMARKING.md` (matrix "Menopause / perimenopause mode": ðŸ”µ â†’ âœ…; Â§5.1(4)).
- [x] Update + commit: `git commit -m "docs: perimenopause mode shipped"`

---

## Edge cases found while exploring (do not skip)

1. **`'menopause'` is already a valid `LifeStage`** â€” types, content validation (`src/content/index.test.ts:8`), and the whole storage/sync layer accept it today. No schema, export-version, or sync change is needed: preferences sync as an opaque snapshot, so a peri device syncing to an older-app device is already tolerated (older app just renders it like `cycle` where it has no branch â€” acceptable).
2. **Do not gate menopause behind `inJourney` incorrectly:** settings hides stage switches during active pregnancy/postpartum (`app/settings/page.tsx:22`) â€” the new section must sit inside the same `!inJourney` gate as TTC, or a pregnant user could orphan their journey.
3. **`setLifeStage('menopause', â€¦)` clears `ttcStartDate`** (the `else` branch in `preferences.ts:34-44`) â€” switching TTC â†’ perimenopause silently drops the TTC start date. That's correct; don't "preserve" it.
4. **Fertile-window suppression is a safety stance, not a style choice.** Peri ovulation is erratic; showing a fertile window implies precision Lumen doesn't have and could be misread as contraceptive guidance. Suppress display AND reminder, keep the underlying prediction object untouched (other consumers, e.g. the doctor report, may legitimately show ranges â€” check `/report` and leave it factual).
5. **Content library filtering is automatic** â€” `app/library/page.tsx:14` filters by `lifeStages.includes(lifeStage)`; articles with empty `lifeStages` show everywhere. Tag the new articles `['menopause']` only, or they'll appear for pregnant users.
6. **Onboarding `Goal` is a distinct type from `LifeStage`** (`'pregnant'` vs `'pregnancy'`) â€” don't conflate them; extend both mappings explicitly.
7. **Daily content feed:** `useHealthData` picks daily content by stage â€” with zero menopause-tagged articles the feed section can render empty; Task 4 must land before or with Task 1's release (execute plan in order; it's fine within one branch).

## Acceptance criteria

- Settings (outside an active journey) offers Perimenopause; toggling it changes the home feed, log form symptom set, and hides fertile-window UI/markers/reminders; period prediction still shows with its normal confidence language.
- Onboarding offers "Navigating perimenopause", lands in the stage with a seeded cycle.
- `/library` in the stage lists the three new articles; `/programs` lists the program; all content tests pass.
- Switching back to Cycle mode restores everything (no residue).
- `npm run lint && npx tsc --noEmit && npm test` green; e2e smoke passes.
