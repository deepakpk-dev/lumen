# Content Library — Design Spec (Phase 2B)

**Date:** 2026-06-17
**Status:** Approved (design)
**PRD reference:** §10 (Pillar 6 — Education & content library)
**Builds on:** Phase 1 (cycle tracking MVP), Phase 2A (insights engine)

## 1. Summary

Phase 2B adds Lumen's **education & content library**: a corpus of medically-sourced,
cited articles, a **deterministic personalized feed**, and a **daily content card** on
home. It is local-first — content ships as data in the repo (no CMS, no backend) — and
the personalization is a pure-TS, explainable engine in the same spirit as the prediction
and insights engines.

### Scope (locked)

**In scope:**
- Article library (browse + topic/phase/life-stage filters + simple client-side search).
- Deterministic personalized feed ("For you").
- Daily content card on home.
- Medical-review / citation metadata on every article.

**Out of scope (deferred to a later sub-phase, "2C"):**
- Multi-part courses / programs (stateful progress tracking).
- Headless CMS / editorial review workflow tooling.
- Server-side content delivery or sync.

## 2. Principles (inherited)

- **Local-first:** content is bundled data; no network needed to read the library.
- **Deterministic & explainable:** matching is rule-based and produces human-readable
  match reasons. No LLM / embeddings (would violate the privacy + explainability pillars).
- **Medically responsible:** every article cites a reputable source (ACOG / NHS / WHO),
  carries a last-reviewed date, and shows an "educational, not medical advice" disclaimer.
- **Test-first pure domain core:** the engine is pure TS, built with Vitest before UI.
- **Reuse existing vocabularies:** content tags draw from the existing `CyclePhase`,
  `LifeStage`, `SYMPTOM_OPTIONS`, and `MOOD_OPTIONS` — no parallel taxonomies.

## 3. Architecture

Layered, matching the existing app:

```
UI (App Router pages + components)
  → useHealthData hook (exposes contentFeed, dailyContent)
    → domain/content engine (pure TS: context → feed → daily)
      → content data layer (src/content: typed articles + index)
```

### 3.1 Content data layer — `src/content/`

- `src/content/articles/<slug>.ts` — one typed `ContentArticle` export per file.
- `src/content/index.ts` — aggregates all articles into `ARTICLES: ContentArticle[]`,
  and is the single import point for the engine and UI.
- Article bodies are **Markdown** stored as template-literal strings.
- Seed corpus: **~10–12 articles** covering each cycle phase plus common symptoms
  (e.g. menstrual-phase basics, follicular/ovulation/luteal explainers, cramps,
  PMS & mood, irregular cycles, fatigue, bloating, period-tracking basics).

### 3.2 Domain engine — `src/domain/content/`

Pure TS, built test-first.

- **`types.ts`**
  - `ContentTopic` — string-literal union of topic tags (e.g. `'menstruation'`,
    `'pms'`, `'fertility'`, `'irregular-cycles'`, `'symptoms'`, `'wellbeing'`,
    `'getting-started'`).
  - `ContentArticle` (see §4).
  - `ContentContext` — derived user context the feed scores against.
  - `ScoredArticle` — `{ article: ContentArticle; score: number; matchReasons: string[] }`.

- **`context.ts`** — `deriveContentContext(input): ContentContext`
  - Input mirrors `InsightInput`: `{ cycles, dailyLogs, stats, prediction, today }`.
  - Computes: `currentPhase` (via insights `phaseForDate`), `recentSymptoms` and
    `recentMoods` (logged within the last N days), `isIrregular` (from `stats`),
    `hasData` (whether any cycles/logs exist), `lifeStage` (fixed `'cycle'` for now).

- **`feed.ts`** — `buildContentFeed(articles, context): ScoredArticle[]`
  - Scores each article deterministically:
    - **Phase match** — article lists `context.currentPhase` in its `phases` → boost.
    - **Symptom overlap** — boost per article symptom tag also in `recentSymptoms`/
      `recentMoods`.
    - **Irregular-cycle relevance** — when `context.isIrregular`, boost articles
      tagged `irregular-cycles`.
    - **Life-stage filter** — exclude articles whose `lifeStages` don't include the
      current life stage (articles with an empty/`['cycle']` tag are universally eligible
      now).
    - **No-data fallback** — when `!hasData`, prefer `getting-started` topic articles.
  - Builds `matchReasons` (human-readable strings) alongside the score.
  - **Deterministic tie-break:** higher score first, then `lastReviewed` desc, then
    `slug` asc. No randomness.
  - Returns the full ranked list (UI decides how many to show).

- **`daily.ts`** — `selectDailyContent(feed, today): ContentArticle | null`
  - Picks a **stable-per-calendar-day** article: a date-seeded deterministic index into
    the top slice of the feed so the card is constant within a day but rotates across
    days. Same `today` → same pick (idempotent).
  - Graceful fallback: if the feed is empty, returns `null` and the UI hides/realigns the
    card; if there's a feed but no personalization data, still returns a sensible pick
    (e.g. a getting-started article).

### 3.3 Hook — `src/state/useHealthData.ts`

Expose, via `useMemo` (same pattern as `insights`):
- `contentFeed: ScoredArticle[]`
- `dailyContent: ContentArticle | null`

Both derived from the already-available `cycles`, `dailyLogs`, `stats`, `prediction`, and
`today`, plus the imported `ARTICLES`.

### 3.4 UI

- **`app/library/page.tsx`** — Library
  - "For you" personalized feed section at the top (from `contentFeed`).
  - Full browse list with filters: topic, phase, life-stage; plus a simple client-side
    text search over title/summary.
- **`app/library/[slug]/page.tsx`** — Article reader
  - Renders Markdown body with `react-markdown` (+ `remark-gfm`).
  - Shows Sources list (label + link), "Aligned with ACOG/NHS guidance · last reviewed
    `<date>`", reading time, and the educational-only disclaimer.
  - Unknown slug → not-found treatment.
- **Home (`app/page.tsx`)** — `DailyContentCard` tied to `dailyContent`.
- **Nav** — add a "Library" link alongside the existing nav entries.
- **Components** (`src/components/`):
  - `ContentCard.tsx` — compact article card (used in feed, browse, home). Optionally
    shows a match reason.
  - `ContentLibrary.tsx` — browse + filter + search shell.
  - `ArticleReader.tsx` — reader body (Markdown + sources + disclaimer).
  - `DailyContentCard.tsx` — home daily card.
  - Reuse Phase 2A card / disclaimer styling for visual consistency.

## 4. Data model

```ts
interface ContentSource {
  label: string;   // e.g. "ACOG — Your First Period"
  url: string;     // citation link
}

interface ContentArticle {
  slug: string;              // stable id + URL segment (unique)
  title: string;
  summary: string;           // 1–2 sentence teaser for cards
  body: string;              // Markdown
  topics: ContentTopic[];    // >= 1
  phases: CyclePhase[];      // relevant phases ([] = any phase)
  symptoms: string[];        // tags from SYMPTOM_OPTIONS / MOOD_OPTIONS that boost relevance
  lifeStages: LifeStage[];   // ['cycle'] for now; future stages tag-ready
  readingMinutes: number;
  author: string;            // "Lumen Editorial"
  medicalReviewer: string;   // sourced-authority statement, e.g. "Aligned with ACOG guidance"
  lastReviewed: ISODate;     // 'YYYY-MM-DD'
  sources: ContentSource[];  // >= 1
}
```

Reused unions: `CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'`;
`LifeStage = 'cycle' | 'ttc' | 'pregnancy' | 'menopause'` (only `'cycle'` active);
symptom tags must be members of `SYMPTOM_OPTIONS` or `MOOD_OPTIONS`.

## 5. Medical posture

- Author attributed to **"Lumen Editorial"**; this is a personal/portfolio app, so the
  `medicalReviewer` field expresses **alignment with reputable authorities** (ACOG / NHS /
  WHO) rather than naming an individual clinician.
- Every article cites **≥ 1 source** with a working link.
- Every reader view shows an **educational-only disclaimer** ("This is general education,
  not a substitute for professional medical advice; contact a clinician for…"), reusing
  the disclaimer treatment introduced in Phase 2A.

## 6. Testing strategy

Test-first (Vitest), mirroring the insights engine's test layout.

- **Domain unit tests:**
  - `context.ts` — phase derivation, recent-symptom window, irregular flag, `hasData`.
  - `feed.ts` — scoring/ranking, phase + symptom + irregular boosts, life-stage filter,
    no-data fallback, deterministic tie-break, match-reason text.
  - `daily.ts` — stable-per-day pick, rotation across days, idempotency, empty-feed `null`,
    no-data fallback.
- **Data-integrity test** over `ARTICLES`: unique slugs; required fields present;
  `topics`, `phases`, `symptoms`, `lifeStages` only contain valid members of their unions;
  ≥ 1 source each with a non-empty url; `lastReviewed` parseable as a date.
- **Component tests:** `ContentCard`, `ArticleReader` (renders body + sources +
  disclaimer), `ContentLibrary` (filter + search), `DailyContentCard`.
- **Gate:** `npm test` + `npm run build` must pass before the phase is declared done.

## 7. Dependencies & constraints

- Add `react-markdown` and `remark-gfm` (small, trusted; content is in-repo and trusted,
  so no untrusted-HTML risk — but keep raw-HTML rendering disabled).
- **AGENTS.md constraint:** this repo's Next.js has breaking changes vs. training data.
  Before writing any route/page code (notably the dynamic `[slug]` route and any
  metadata), read the relevant guide under `node_modules/next/dist/docs/`.

## 8. Out-of-scope / future hooks

- Courses/programs (2C) will reuse `ContentArticle` tagging and add an ordered-program
  model + per-step progress in the data layer.
- When pregnancy / peri-menopause life stages ship, their content slots in via the
  existing `lifeStages` tag and the life-stage filter already in `feed.ts`.
- A future CMS/editorial workflow can replace the bundled data layer without changing the
  engine or UI contracts.
