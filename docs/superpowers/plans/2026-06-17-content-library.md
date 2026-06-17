# Content Library Implementation Plan (Phase 2B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a medically-sourced, local-first content library with a deterministic personalized feed and a daily content card on home.

**Architecture:** Layered like the rest of Lumen — bundled typed article data (`src/content/`) → a pure-TS, deterministic, explainable matching engine (`src/domain/content/`) → the `useHealthData` hook → App Router pages + components. The engine reuses the existing `phaseForDate` helper and the `CyclePhase` / `LifeStage` / `SYMPTOM_OPTIONS` / `MOOD_OPTIONS` vocabularies; no LLM, no network, no parallel taxonomies.

**Tech Stack:** Next.js 16 (App Router, all pages `'use client'`), React 19, TypeScript strict, Tailwind v4, `react-markdown` + `remark-gfm` (new), Vitest + Testing Library + fake-indexeddb, date-fns, Dexie. Spec: `docs/superpowers/specs/2026-06-17-content-library-design.md`.

## Global Constraints

- **Local-first / deterministic:** the matching engine is pure TS, has no randomness, no network, and no LLM. Same inputs → same outputs.
- **Reuse existing types verbatim:** `CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'`; `LifeStage = 'cycle' | 'ttc' | 'pregnancy' | 'menopause'` (only `'cycle'` active); article `symptoms[]` entries must be members of `SYMPTOM_OPTIONS` (`src/domain/log-options.ts`) or `MOOD_OPTIONS`.
- **Import alias:** `@/*` maps to repo root (e.g. `@/src/domain/content/feed`).
- **`daysBetween(a, b)` returns `b - a` in whole days** (positive when `b` is later). A past log is "recent" when `daysBetween(log.date, today)` is between `0` and `RECENT_LOG_WINDOW`.
- **Medical posture:** `author` is always `'Lumen Editorial'`; `medicalReviewer` states alignment with a reputable body (NHS / ACOG / Office on Women's Health); every article has ≥1 source with an `http(s)` URL; every reader view shows an educational-only disclaimer.
- **Source URLs are fixed by this plan.** Use exactly the URLs given here — do NOT invent or "improve" URLs during implementation. They are best-effort canonical pages and are flagged for live verification + clinician review as a pre-launch gate (PRD §0 medical-accuracy requirement); that gate is out of scope for this phase.
- **Next.js caveat (AGENTS.md):** this repo's Next.js has breaking changes vs. training data. Before writing any code under `app/` (Task 12), read the routing guide under `node_modules/next/dist/docs/`.
- **Gate:** `npm test` and `npm run build` must both pass before the branch is declared done.
- **One commit per task.** Work on branch `content-library` off `main`.

---

## File Structure

**Domain engine (pure TS, test-first):**
- `src/domain/content/types.ts` — types + topic union + scoring constants
- `src/domain/content/context.ts` — `deriveContentContext`
- `src/domain/content/feed.ts` — `buildContentFeed`
- `src/domain/content/daily.ts` — `selectDailyContent`

**Content data:**
- `src/content/articles/<slug>.ts` — one `ContentArticle` per file (10 articles)
- `src/content/index.ts` — `ARTICLES` aggregation
- `src/content/index.test.ts` — data-integrity test

**Hook:**
- `src/state/useHealthData.ts` — expose `contentFeed`, `dailyContent`

**Components:**
- `src/components/ContentCard.tsx`
- `src/components/ArticleReader.tsx`
- `src/components/ContentLibrary.tsx`
- `src/components/DailyContentCard.tsx`

**Pages:**
- `app/library/page.tsx`
- `app/library/[slug]/page.tsx`
- `app/page.tsx` — add daily card + Library nav link

---

## Task 1: Content types & constants

**Files:**
- Create: `src/domain/content/types.ts`
- Test: `src/domain/content/types.test.ts`

**Interfaces:**
- Consumes: `CyclePhase`, `LifeStage`, `ISODate` from `@/src/domain/types`; `InsightInput` from `@/src/domain/insights/types`.
- Produces: `ContentTopic`, `CONTENT_TOPICS`, `ContentSource`, `ContentArticle`, `ContentContext`, `ScoredArticle`, `ContentInput`, and constants `RECENT_LOG_WINDOW`, `PHASE_MATCH_WEIGHT`, `SYMPTOM_MATCH_WEIGHT`, `IRREGULAR_BOOST`, `GETTING_STARTED_BOOST`, `DAILY_TOP_SLICE`.

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/content/types.test.ts
import { describe, it, expect } from 'vitest';
import {
  CONTENT_TOPICS,
  RECENT_LOG_WINDOW,
  PHASE_MATCH_WEIGHT,
  SYMPTOM_MATCH_WEIGHT,
  IRREGULAR_BOOST,
  GETTING_STARTED_BOOST,
  DAILY_TOP_SLICE,
} from './types';

describe('content types & constants', () => {
  it('exposes the topic vocabulary', () => {
    expect(CONTENT_TOPICS).toContain('getting-started');
    expect(CONTENT_TOPICS).toContain('irregular-cycles');
    expect(new Set(CONTENT_TOPICS).size).toBe(CONTENT_TOPICS.length);
  });

  it('defines positive scoring constants', () => {
    for (const n of [
      RECENT_LOG_WINDOW,
      PHASE_MATCH_WEIGHT,
      SYMPTOM_MATCH_WEIGHT,
      IRREGULAR_BOOST,
      GETTING_STARTED_BOOST,
      DAILY_TOP_SLICE,
    ]) {
      expect(n).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/content/types.test.ts`
Expected: FAIL — cannot find module `./types`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/content/types.ts
import type { CyclePhase, LifeStage, ISODate } from '@/src/domain/types';
import type { InsightInput } from '@/src/domain/insights/types';

export const CONTENT_TOPICS = [
  'getting-started',
  'menstruation',
  'fertility',
  'pms',
  'symptoms',
  'irregular-cycles',
  'wellbeing',
] as const;

export type ContentTopic = (typeof CONTENT_TOPICS)[number];

export interface ContentSource {
  label: string;
  url: string;
}

export interface ContentArticle {
  slug: string;
  title: string;
  summary: string;
  body: string; // markdown
  topics: ContentTopic[];
  phases: CyclePhase[]; // [] = relevant to any phase
  symptoms: string[]; // members of SYMPTOM_OPTIONS / MOOD_OPTIONS
  lifeStages: LifeStage[]; // [] = universal; ['cycle'] for now
  readingMinutes: number;
  author: string;
  medicalReviewer: string;
  lastReviewed: ISODate;
  sources: ContentSource[];
}

export interface ContentContext {
  currentPhase: CyclePhase | null;
  recentSymptoms: string[];
  isIrregular: boolean;
  hasData: boolean;
  lifeStage: LifeStage;
}

export interface ScoredArticle {
  article: ContentArticle;
  score: number;
  matchReasons: string[];
}

// The engine consumes the same shape the insights engine does.
export type ContentInput = InsightInput;

export const RECENT_LOG_WINDOW = 14; // days
export const PHASE_MATCH_WEIGHT = 10;
export const SYMPTOM_MATCH_WEIGHT = 5;
export const IRREGULAR_BOOST = 8;
export const GETTING_STARTED_BOOST = 6;
export const DAILY_TOP_SLICE = 5;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/content/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/content/types.ts src/domain/content/types.test.ts
git commit -m "feat(content): article types, topic vocabulary, scoring constants"
```

---

## Task 2: deriveContentContext

**Files:**
- Create: `src/domain/content/context.ts`
- Test: `src/domain/content/context.test.ts`

**Interfaces:**
- Consumes: `ContentInput`, `ContentContext` from `./types`; `phaseForDate` from `@/src/domain/insights/phase-assignment`; `daysBetween` from `@/src/domain/dates`.
- Produces: `deriveContentContext(input: ContentInput): ContentContext`.

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/content/context.test.ts
import { describe, it, expect } from 'vitest';
import { deriveContentContext } from './context';
import type { Cycle, CycleStats, DailyLog } from '@/src/domain/types';

const regularStats: CycleStats = {
  cycleCount: 4,
  averageCycleLength: 28,
  cycleLengthStdDev: 1,
  averagePeriodLength: 5,
  isRegular: true,
  inputCycleCount: 4,
};

const irregularStats: CycleStats = { ...regularStats, isRegular: false };

const emptyStats: CycleStats = {
  cycleCount: 0,
  averageCycleLength: 28,
  cycleLengthStdDev: 0,
  averagePeriodLength: 5,
  isRegular: true,
  inputCycleCount: 0,
};

describe('deriveContentContext', () => {
  it('reports no data when there are no cycles or logs', () => {
    const ctx = deriveContentContext({
      cycles: [],
      dailyLogs: [],
      stats: emptyStats,
      prediction: null,
      today: '2026-06-17',
    });
    expect(ctx.hasData).toBe(false);
    expect(ctx.currentPhase).toBeNull();
    expect(ctx.recentSymptoms).toEqual([]);
    expect(ctx.isIrregular).toBe(false);
    expect(ctx.lifeStage).toBe('cycle');
  });

  it('derives the current phase from the active cycle', () => {
    const cycles: Cycle[] = [{ id: 'c1', startDate: '2026-06-15' }];
    const ctx = deriveContentContext({
      cycles,
      dailyLogs: [],
      stats: regularStats,
      prediction: null,
      today: '2026-06-17', // cycle day 3 → menstrual (period length 5)
    });
    expect(ctx.currentPhase).toBe('menstrual');
    expect(ctx.hasData).toBe(true);
  });

  it('collects unique symptoms and moods logged within the recent window', () => {
    const logs: DailyLog[] = [
      { date: '2026-06-16', symptoms: ['Cramps'], moods: ['Irritable'] },
      { date: '2026-06-10', symptoms: ['Cramps'], moods: [] }, // 7d ago, in window, dup
      { date: '2026-05-20', symptoms: ['Bloating'], moods: [] }, // 28d ago, out of window
    ];
    const ctx = deriveContentContext({
      cycles: [{ id: 'c1', startDate: '2026-06-01' }],
      dailyLogs: logs,
      stats: regularStats,
      prediction: null,
      today: '2026-06-17',
    });
    expect(ctx.recentSymptoms.sort()).toEqual(['Cramps', 'Irritable']);
  });

  it('flags irregularity only when data exists', () => {
    const withData = deriveContentContext({
      cycles: [{ id: 'c1', startDate: '2026-06-01' }],
      dailyLogs: [],
      stats: irregularStats,
      prediction: null,
      today: '2026-06-17',
    });
    expect(withData.isIrregular).toBe(true);

    const noData = deriveContentContext({
      cycles: [],
      dailyLogs: [],
      stats: { ...irregularStats, cycleCount: 0, inputCycleCount: 0 },
      prediction: null,
      today: '2026-06-17',
    });
    expect(noData.isIrregular).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/content/context.test.ts`
Expected: FAIL — cannot find module `./context`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/content/context.ts
import type { ContentInput, ContentContext } from './types';
import { RECENT_LOG_WINDOW } from './types';
import { phaseForDate } from '@/src/domain/insights/phase-assignment';
import { daysBetween } from '@/src/domain/dates';

export function deriveContentContext(input: ContentInput): ContentContext {
  const { cycles, dailyLogs, stats, today } = input;
  const hasData = cycles.length > 0 || dailyLogs.length > 0;

  const recent = new Set<string>();
  for (const log of dailyLogs) {
    const age = daysBetween(log.date, today);
    if (age < 0 || age > RECENT_LOG_WINDOW) continue;
    for (const s of log.symptoms) recent.add(s);
    for (const m of log.moods) recent.add(m);
  }

  return {
    currentPhase: phaseForDate(today, cycles, stats),
    recentSymptoms: [...recent],
    isIrregular: hasData && !stats.isRegular,
    hasData,
    lifeStage: 'cycle',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/content/context.test.ts`
Expected: PASS (all 4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/content/context.ts src/domain/content/context.test.ts
git commit -m "feat(content): derive user content context from cycles and logs"
```

---

## Task 3: buildContentFeed

**Files:**
- Create: `src/domain/content/feed.ts`
- Test: `src/domain/content/feed.test.ts`

**Interfaces:**
- Consumes: `ContentArticle`, `ContentContext`, `ScoredArticle`, and the scoring constants from `./types`.
- Produces: `buildContentFeed(articles: ContentArticle[], context: ContentContext): ScoredArticle[]`.

**Scoring rules (deterministic):**
1. Eligibility: an article is eligible if `lifeStages.length === 0` OR `lifeStages.includes(context.lifeStage)`. Ineligible articles are excluded.
2. `+PHASE_MATCH_WEIGHT` if `context.currentPhase` is set and `article.phases.includes(currentPhase)` → reason `Relevant to your <phase> phase`.
3. `+SYMPTOM_MATCH_WEIGHT` per article symptom tag also in `context.recentSymptoms` → reason `Matches what you logged: <list>`.
4. `+IRREGULAR_BOOST` if `context.isIrregular` and `article.topics.includes('irregular-cycles')` → reason `Relevant to your irregular cycles`.
5. `+GETTING_STARTED_BOOST` if `!context.hasData` and `article.topics.includes('getting-started')` → reason `A good place to start`.
6. Sort: `score` desc, then `lastReviewed` desc, then `slug` asc. Zero-score eligible articles are kept (ranked last) so the library always has a full list.

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/content/feed.test.ts
import { describe, it, expect } from 'vitest';
import { buildContentFeed } from './feed';
import type { ContentArticle, ContentContext } from './types';

function article(over: Partial<ContentArticle>): ContentArticle {
  return {
    slug: 'a',
    title: 'A',
    summary: 's',
    body: 'b',
    topics: ['menstruation'],
    phases: [],
    symptoms: [],
    lifeStages: ['cycle'],
    readingMinutes: 2,
    author: 'Lumen Editorial',
    medicalReviewer: 'Aligned with NHS guidance',
    lastReviewed: '2026-06-17',
    sources: [{ label: 'NHS', url: 'https://www.nhs.uk/conditions/periods/' }],
    ...over,
  };
}

const baseCtx: ContentContext = {
  currentPhase: 'luteal',
  recentSymptoms: ['Cramps'],
  isIrregular: false,
  hasData: true,
  lifeStage: 'cycle',
};

describe('buildContentFeed', () => {
  it('ranks phase + symptom matches above unmatched articles', () => {
    const phaseHit = article({ slug: 'luteal', phases: ['luteal'] });
    const symptomHit = article({ slug: 'cramps', symptoms: ['Cramps'] });
    const miss = article({ slug: 'misc', phases: ['follicular'] });

    const feed = buildContentFeed([miss, symptomHit, phaseHit], baseCtx);
    const order = feed.map((f) => f.article.slug);
    expect(order[0]).toBe('luteal'); // +10 phase
    expect(order[1]).toBe('cramps'); // +5 symptom
    expect(order[2]).toBe('misc'); // 0
  });

  it('excludes articles whose life stage does not match', () => {
    const pregnancyOnly = article({ slug: 'preg', lifeStages: ['pregnancy'] });
    const universal = article({ slug: 'uni', lifeStages: [] });
    const feed = buildContentFeed([pregnancyOnly, universal], baseCtx);
    expect(feed.map((f) => f.article.slug)).toEqual(['uni']);
  });

  it('boosts irregular-cycle content when the user is irregular', () => {
    const irr = article({ slug: 'irr', topics: ['irregular-cycles'] });
    const other = article({ slug: 'oth', topics: ['menstruation'] });
    const feed = buildContentFeed([other, irr], {
      ...baseCtx,
      currentPhase: null,
      recentSymptoms: [],
      isIrregular: true,
    });
    expect(feed[0].article.slug).toBe('irr');
    expect(feed[0].matchReasons).toContain('Relevant to your irregular cycles');
  });

  it('surfaces getting-started content when there is no data', () => {
    const start = article({ slug: 'start', topics: ['getting-started'] });
    const other = article({ slug: 'oth', topics: ['menstruation'] });
    const feed = buildContentFeed([other, start], {
      currentPhase: null,
      recentSymptoms: [],
      isIrregular: false,
      hasData: false,
      lifeStage: 'cycle',
    });
    expect(feed[0].article.slug).toBe('start');
  });

  it('is a deterministic tie-break by lastReviewed then slug', () => {
    const a = article({ slug: 'zzz', lastReviewed: '2026-01-01' });
    const b = article({ slug: 'aaa', lastReviewed: '2026-01-01' });
    const c = article({ slug: 'mmm', lastReviewed: '2026-06-01' });
    const feed = buildContentFeed([a, b, c], {
      ...baseCtx,
      currentPhase: null,
      recentSymptoms: [],
    });
    expect(feed.map((f) => f.article.slug)).toEqual(['mmm', 'aaa', 'zzz']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/content/feed.test.ts`
Expected: FAIL — cannot find module `./feed`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/content/feed.ts
import type { ContentArticle, ContentContext, ScoredArticle } from './types';
import {
  PHASE_MATCH_WEIGHT,
  SYMPTOM_MATCH_WEIGHT,
  IRREGULAR_BOOST,
  GETTING_STARTED_BOOST,
} from './types';

function scoreArticle(
  article: ContentArticle,
  ctx: ContentContext,
): ScoredArticle {
  let score = 0;
  const matchReasons: string[] = [];

  if (ctx.currentPhase && article.phases.includes(ctx.currentPhase)) {
    score += PHASE_MATCH_WEIGHT;
    matchReasons.push(`Relevant to your ${ctx.currentPhase} phase`);
  }

  const overlap = article.symptoms.filter((s) =>
    ctx.recentSymptoms.includes(s),
  );
  if (overlap.length > 0) {
    score += overlap.length * SYMPTOM_MATCH_WEIGHT;
    matchReasons.push(`Matches what you logged: ${overlap.join(', ')}`);
  }

  if (ctx.isIrregular && article.topics.includes('irregular-cycles')) {
    score += IRREGULAR_BOOST;
    matchReasons.push('Relevant to your irregular cycles');
  }

  if (!ctx.hasData && article.topics.includes('getting-started')) {
    score += GETTING_STARTED_BOOST;
    matchReasons.push('A good place to start');
  }

  return { article, score, matchReasons };
}

export function buildContentFeed(
  articles: ContentArticle[],
  context: ContentContext,
): ScoredArticle[] {
  return articles
    .filter(
      (a) =>
        a.lifeStages.length === 0 || a.lifeStages.includes(context.lifeStage),
    )
    .map((a) => scoreArticle(a, context))
    .sort(
      (x, y) =>
        y.score - x.score ||
        y.article.lastReviewed.localeCompare(x.article.lastReviewed) ||
        x.article.slug.localeCompare(y.article.slug),
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/content/feed.test.ts`
Expected: PASS (all 5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/content/feed.ts src/domain/content/feed.test.ts
git commit -m "feat(content): deterministic personalized feed scoring"
```

---

## Task 4: selectDailyContent

**Files:**
- Create: `src/domain/content/daily.ts`
- Test: `src/domain/content/daily.test.ts`

**Interfaces:**
- Consumes: `ScoredArticle`, `ContentArticle`, `DAILY_TOP_SLICE` from `./types`; `ISODate` from `@/src/domain/types`.
- Produces: `selectDailyContent(feed: ScoredArticle[], today: ISODate): ContentArticle | null`.

**Behavior:** pick a stable-per-calendar-day article from the top `DAILY_TOP_SLICE` of the feed using a deterministic date seed (sum of char codes of the `today` string, mod slice length). Empty feed → `null`. Same `today` → same pick (idempotent). Different dates generally rotate the pick.

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/content/daily.test.ts
import { describe, it, expect } from 'vitest';
import { selectDailyContent } from './daily';
import type { ScoredArticle, ContentArticle } from './types';

function scored(slug: string): ScoredArticle {
  const article = { slug, title: slug } as unknown as ContentArticle;
  return { article, score: 0, matchReasons: [] };
}

describe('selectDailyContent', () => {
  it('returns null for an empty feed', () => {
    expect(selectDailyContent([], '2026-06-17')).toBeNull();
  });

  it('is stable for the same day', () => {
    const feed = ['a', 'b', 'c', 'd', 'e', 'f'].map(scored);
    const first = selectDailyContent(feed, '2026-06-17');
    const second = selectDailyContent(feed, '2026-06-17');
    expect(first).toBe(second);
  });

  it('only ever picks from the top slice', () => {
    const feed = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(scored);
    const topSlugs = new Set(['a', 'b', 'c', 'd', 'e']);
    for (let d = 1; d <= 28; d++) {
      const day = `2026-06-${String(d).padStart(2, '0')}`;
      const pick = selectDailyContent(feed, day)!;
      expect(topSlugs.has(pick.slug)).toBe(true);
    }
  });

  it('rotates the pick across different days', () => {
    const feed = ['a', 'b', 'c', 'd', 'e'].map(scored);
    const picks = new Set(
      ['2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20'].map(
        (d) => selectDailyContent(feed, d)!.slug,
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/content/daily.test.ts`
Expected: FAIL — cannot find module `./daily`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/content/daily.ts
import type { ISODate } from '@/src/domain/types';
import type { ScoredArticle, ContentArticle } from './types';
import { DAILY_TOP_SLICE } from './types';

function dateSeed(date: ISODate): number {
  let sum = 0;
  for (let i = 0; i < date.length; i++) sum += date.charCodeAt(i);
  return sum;
}

export function selectDailyContent(
  feed: ScoredArticle[],
  today: ISODate,
): ContentArticle | null {
  if (feed.length === 0) return null;
  const slice = feed.slice(0, DAILY_TOP_SLICE);
  const index = dateSeed(today) % slice.length;
  return slice[index].article;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/content/daily.test.ts`
Expected: PASS (all 4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/content/daily.ts src/domain/content/daily.test.ts
git commit -m "feat(content): stable per-day daily content selection"
```

---

## Task 5: Content corpus — part 1 (5 articles + index)

**Files:**
- Create: `src/content/articles/how-tracking-works.ts`
- Create: `src/content/articles/menstrual-phase.ts`
- Create: `src/content/articles/follicular-phase.ts`
- Create: `src/content/articles/ovulation-fertile-window.ts`
- Create: `src/content/articles/luteal-phase-pms.ts`
- Create: `src/content/index.ts`

**Interfaces:**
- Consumes: `ContentArticle` from `@/src/domain/content/types`.
- Produces: five named `ContentArticle` exports; `ARTICLES: ContentArticle[]` from `src/content/index.ts`.

> Each article body is complete Markdown — paste verbatim. All use `author: 'Lumen Editorial'` and `lastReviewed: '2026-06-17'`.

- [ ] **Step 1: Create `how-tracking-works.ts`**

```ts
// src/content/articles/how-tracking-works.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const howTrackingWorks: ContentArticle = {
  slug: 'how-tracking-works',
  title: 'How period tracking works',
  summary:
    'What a menstrual cycle is, why logging helps, and how Lumen turns your logs into predictions.',
  body: `## What is a menstrual cycle?

Your cycle is counted from the first day of one period to the first day of the next. A typical cycle is around 28 days, but anywhere from about 21 to 35 days is common, and cycles often vary from month to month.

## Why logging helps

The more days you log — your period, symptoms, and mood — the better Lumen can describe your personal pattern. Predictions start from a typical 28‑day cycle and become more accurate, and more honest about uncertainty, as your own history builds up.

## What to log

- The days your period starts and ends
- Flow (spotting through heavy)
- Symptoms like cramps, headaches, or bloating
- Mood

There is no "perfect" cycle. Logging is simply a way to understand your own body.`,
  topics: ['getting-started', 'menstruation'],
  phases: [],
  symptoms: [],
  lifeStages: ['cycle'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with Office on Women’s Health guidance',
  lastReviewed: '2026-06-17',
  sources: [
    {
      label: 'Office on Women’s Health — Your menstrual cycle',
      url: 'https://www.womenshealth.gov/menstrual-cycle/your-menstrual-cycle',
    },
    { label: 'NHS — Periods', url: 'https://www.nhs.uk/conditions/periods/' },
  ],
};
```

- [ ] **Step 2: Create `menstrual-phase.ts`**

```ts
// src/content/articles/menstrual-phase.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const menstrualPhase: ContentArticle = {
  slug: 'menstrual-phase',
  title: 'Your menstrual phase, explained',
  summary:
    'What happens during your period and simple ways to feel more comfortable.',
  body: `## What is happening

Your period marks day 1 of your cycle. The lining of the uterus, built up over the previous cycle, is shed. Periods commonly last around 3 to 7 days.

## How you might feel

Lower energy, cramps, and a need for more rest are common in these days. None of this means anything is wrong — it is a normal part of the cycle for many people.

## Gentle ways to cope

- Rest when you can, and keep hydrated
- Gentle movement, a warm bath, or a heat pad can ease cramps
- Eat regularly to steady your energy

See a clinician if your bleeding is unusually heavy, lasts longer than 7 days, or your periods stop unexpectedly.`,
  topics: ['menstruation', 'symptoms'],
  phases: ['menstrual'],
  symptoms: ['Cramps', 'Fatigue'],
  lifeStages: ['cycle'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    { label: 'NHS — Periods', url: 'https://www.nhs.uk/conditions/periods/' },
    {
      label: 'Office on Women’s Health — Your menstrual cycle',
      url: 'https://www.womenshealth.gov/menstrual-cycle/your-menstrual-cycle',
    },
  ],
};
```

- [ ] **Step 3: Create `follicular-phase.ts`**

```ts
// src/content/articles/follicular-phase.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const follicularPhase: ContentArticle = {
  slug: 'follicular-phase',
  title: 'The follicular phase: your rising-energy days',
  summary:
    'After your period, estrogen rises and many people feel more energetic and focused.',
  body: `## What is happening

The follicular phase runs from the end of your period up to ovulation. Your body prepares to release an egg, and estrogen gradually rises.

## How you might feel

Many people notice more energy, a brighter mood, and sharper focus during these days. It can be a good window for activities that take stamina or concentration.

## Making the most of it

- Use the energy boost for exercise or bigger tasks if it suits you
- Keep logging — this helps Lumen learn when your follicular phase tends to fall

Everyone is different, so notice your own pattern rather than expecting a textbook one.`,
  topics: ['menstruation', 'wellbeing'],
  phases: ['follicular'],
  symptoms: ['Energetic'],
  lifeStages: ['cycle'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with Office on Women’s Health guidance',
  lastReviewed: '2026-06-17',
  sources: [
    {
      label: 'Office on Women’s Health — Your menstrual cycle',
      url: 'https://www.womenshealth.gov/menstrual-cycle/your-menstrual-cycle',
    },
    { label: 'NHS — Periods', url: 'https://www.nhs.uk/conditions/periods/' },
  ],
};
```

- [ ] **Step 4: Create `ovulation-fertile-window.ts`**

```ts
// src/content/articles/ovulation-fertile-window.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const ovulationFertileWindow: ContentArticle = {
  slug: 'ovulation-fertile-window',
  title: 'Ovulation and your fertile window',
  summary:
    'When ovulation happens, what the fertile window means, and the signs some people notice.',
  body: `## What is ovulation

Ovulation is when an ovary releases an egg. In many cycles it happens roughly two weeks before the next period, though the exact timing varies from person to person and cycle to cycle.

## The fertile window

The days leading up to and including ovulation are the most fertile part of the cycle, because sperm can survive for several days. This is the window to focus on if you are trying to conceive — or to be aware of if you are avoiding pregnancy.

## Signs some people notice

- Clearer, stretchy cervical mucus
- A small rise in energy or libido
- Mild one‑sided twinges

Lumen estimates your fertile window from your logged history. Treat it as a guide, not a guarantee — it is not a contraceptive method.`,
  topics: ['fertility'],
  phases: ['ovulation'],
  symptoms: ['Energetic'],
  lifeStages: ['cycle'],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    {
      label: 'NHS — Working out when you are most fertile',
      url: 'https://www.nhs.uk/pregnancy/trying-for-a-baby/working-out-when-youre-most-fertile/',
    },
    {
      label: 'Office on Women’s Health — Your menstrual cycle',
      url: 'https://www.womenshealth.gov/menstrual-cycle/your-menstrual-cycle',
    },
  ],
};
```

- [ ] **Step 5: Create `luteal-phase-pms.ts`**

```ts
// src/content/articles/luteal-phase-pms.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const lutealPhasePms: ContentArticle = {
  slug: 'luteal-phase-pms',
  title: 'The luteal phase and PMS',
  summary:
    'After ovulation, progesterone rises. Here is why PMS‑type changes are common now.',
  body: `## What is happening

The luteal phase runs from ovulation to the start of your next period. Progesterone rises, and if there is no pregnancy it then falls, which triggers your period.

## Premenstrual symptoms

In the days before your period, many people experience premenstrual syndrome (PMS): mood changes, irritability, bloating, tender breasts, or tiredness. Symptoms usually ease once your period starts.

## What can help

- Regular sleep, movement, and balanced meals
- Reducing caffeine and alcohol if they affect you
- Noting which symptoms recur, so they feel less surprising

Talk to a clinician if symptoms are severe enough to disrupt your daily life — there are effective treatments.`,
  topics: ['pms', 'symptoms'],
  phases: ['luteal'],
  symptoms: ['Mood swings', 'Irritable', 'Bloating', 'Tender breasts'],
  lifeStages: ['cycle'],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    {
      label: 'NHS — Premenstrual syndrome (PMS)',
      url: 'https://www.nhs.uk/conditions/pre-menstrual-syndrome/',
    },
    {
      label: 'ACOG — Premenstrual syndrome',
      url: 'https://www.acog.org/womens-health/faqs/premenstrual-syndrome',
    },
  ],
};
```

- [ ] **Step 6: Create `src/content/index.ts`** (will be extended in Task 6)

```ts
// src/content/index.ts
import type { ContentArticle } from '@/src/domain/content/types';
import { howTrackingWorks } from './articles/how-tracking-works';
import { menstrualPhase } from './articles/menstrual-phase';
import { follicularPhase } from './articles/follicular-phase';
import { ovulationFertileWindow } from './articles/ovulation-fertile-window';
import { lutealPhasePms } from './articles/luteal-phase-pms';

export const ARTICLES: ContentArticle[] = [
  howTrackingWorks,
  menstrualPhase,
  follicularPhase,
  ovulationFertileWindow,
  lutealPhasePms,
];
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/content/articles src/content/index.ts
git commit -m "feat(content): seed corpus part 1 (cycle-phase articles)"
```

---

## Task 6: Content corpus — part 2 (5 articles + integrity test)

**Files:**
- Create: `src/content/articles/period-cramps.ts`
- Create: `src/content/articles/mood-across-cycle.ts`
- Create: `src/content/articles/irregular-cycles.ts`
- Create: `src/content/articles/premenstrual-fatigue.ts`
- Create: `src/content/articles/bloating-and-your-cycle.ts`
- Modify: `src/content/index.ts`
- Test: `src/content/index.test.ts`

**Interfaces:**
- Consumes: `ContentArticle` from `@/src/domain/content/types`; `SYMPTOM_OPTIONS`, `MOOD_OPTIONS` from `@/src/domain/log-options`; `CONTENT_TOPICS` from `@/src/domain/content/types`.
- Produces: five more `ContentArticle` exports; extended `ARTICLES` (10 total).

- [ ] **Step 1: Create `period-cramps.ts`**

```ts
// src/content/articles/period-cramps.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const periodCramps: ContentArticle = {
  slug: 'period-cramps',
  title: 'Managing period cramps',
  summary: 'Why cramps happen and practical ways to ease them.',
  body: `## Why cramps happen

Period pain is caused by the muscular wall of the uterus tightening to help shed its lining. Stronger contractions can briefly reduce blood flow and cause the cramping ache many people feel.

## What can help

- A heat pad or warm bath on your lower tummy
- Gentle exercise, stretching, or walking
- Over‑the‑counter pain relief such as ibuprofen can help many people — follow the label and check it is suitable for you

## When to seek advice

See a clinician if your pain is severe, getting worse over time, or not helped by usual measures, or if it comes with very heavy bleeding. These can be signs worth investigating.`,
  topics: ['symptoms', 'menstruation'],
  phases: ['menstrual'],
  symptoms: ['Cramps', 'Backache'],
  lifeStages: ['cycle'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    {
      label: 'NHS — Period pain',
      url: 'https://www.nhs.uk/conditions/period-pain/',
    },
    {
      label: 'ACOG — Dysmenorrhea: painful periods',
      url: 'https://www.acog.org/womens-health/faqs/dysmenorrhea-painful-periods',
    },
  ],
};
```

- [ ] **Step 2: Create `mood-across-cycle.ts`**

```ts
// src/content/articles/mood-across-cycle.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const moodAcrossCycle: ContentArticle = {
  slug: 'mood-across-cycle',
  title: 'Mood changes across your cycle',
  summary:
    'Hormone shifts can influence how you feel. Here is what is common and when to get support.',
  body: `## Mood and hormones

Rising and falling hormones across the cycle can affect mood. Many people feel steadier in the first half of the cycle and notice more irritability, anxiety, or low mood in the days before their period.

## Looking after yourself

- Keep sleep, movement, and meals as regular as you can
- Be kind to yourself in the premenstrual days
- Logging mood helps you see your own pattern, which can make it feel more manageable

## When to reach out

If low mood, anxiety, or mood swings feel severe, last most of the month, or affect your relationships or daily life, talk to a clinician. Persistent or severe premenstrual mood symptoms can be treated.`,
  topics: ['pms', 'wellbeing'],
  phases: ['luteal'],
  symptoms: ['Anxious', 'Irritable', 'Sad', 'Mood swings'],
  lifeStages: ['cycle'],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    {
      label: 'NHS — Premenstrual syndrome (PMS)',
      url: 'https://www.nhs.uk/conditions/pre-menstrual-syndrome/',
    },
    {
      label: 'Office on Women’s Health — Your menstrual cycle',
      url: 'https://www.womenshealth.gov/menstrual-cycle/your-menstrual-cycle',
    },
  ],
};
```

- [ ] **Step 3: Create `irregular-cycles.ts`**

```ts
// src/content/articles/irregular-cycles.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const irregularCycles: ContentArticle = {
  slug: 'irregular-cycles',
  title: 'When cycles are irregular',
  summary:
    'Irregular periods are common and have many causes. Here is what is normal and when to check in.',
  body: `## What counts as irregular

Cycle length naturally varies. Periods are usually called irregular when the gap between them keeps changing, or your cycles are shorter than about 21 days or longer than about 35 days.

## Common causes

- The years after periods first start and the approach to menopause
- Stress, significant weight change, or intense exercise
- Hormonal contraception
- Conditions such as polycystic ovary syndrome (PCOS) or thyroid problems

## How Lumen handles it

When your cycles vary, Lumen widens its estimates and lowers its confidence rather than pretending to be precise. Keep logging — patterns can still emerge.

See a clinician if your periods suddenly become irregular, stop, or are very heavy, so any underlying cause can be checked.`,
  topics: ['irregular-cycles', 'menstruation'],
  phases: [],
  symptoms: [],
  lifeStages: ['cycle'],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    {
      label: 'NHS — Irregular periods',
      url: 'https://www.nhs.uk/conditions/irregular-periods/',
    },
    {
      label: 'Office on Women’s Health — Your menstrual cycle',
      url: 'https://www.womenshealth.gov/menstrual-cycle/your-menstrual-cycle',
    },
  ],
};
```

- [ ] **Step 4: Create `premenstrual-fatigue.ts`**

```ts
// src/content/articles/premenstrual-fatigue.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const premenstrualFatigue: ContentArticle = {
  slug: 'premenstrual-fatigue',
  title: 'Why you feel tired before your period',
  summary: 'Premenstrual tiredness is common. Here is why, and what can help.',
  body: `## Why it happens

Feeling more tired in the days before your period is a common premenstrual symptom. Hormone shifts, disrupted sleep, and mood changes can all play a part.

## What can help

- Aim for a regular sleep routine, especially in the luteal phase
- Gentle daytime activity can lift energy more than resting all day
- Balanced meals help steady your energy; limit caffeine late in the day

## Worth checking

Tiredness that is constant, severe, or not linked to your cycle can have other causes, such as low iron — particularly if your periods are heavy. If it persists, ask a clinician about it.`,
  topics: ['symptoms', 'wellbeing'],
  phases: ['luteal'],
  symptoms: ['Fatigue'],
  lifeStages: ['cycle'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    {
      label: 'NHS — Premenstrual syndrome (PMS)',
      url: 'https://www.nhs.uk/conditions/pre-menstrual-syndrome/',
    },
    {
      label: 'ACOG — Premenstrual syndrome',
      url: 'https://www.acog.org/womens-health/faqs/premenstrual-syndrome',
    },
  ],
};
```

- [ ] **Step 5: Create `bloating-and-your-cycle.ts`**

```ts
// src/content/articles/bloating-and-your-cycle.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const bloatingAndYourCycle: ContentArticle = {
  slug: 'bloating-and-your-cycle',
  title: 'Bloating and your cycle',
  summary:
    'Why you might feel bloated before your period and simple ways to ease it.',
  body: `## Why it happens

Many people feel bloated or notice fluid retention in the days before their period. This is a common premenstrual symptom linked to hormone changes, and it usually settles once your period begins.

## What can help

- Drink plenty of water and go easy on very salty foods
- Regular gentle movement can help
- Smaller, more frequent meals may feel more comfortable

## When to check

Bloating that is persistent, severe, or comes with other new symptoms — and does not follow your usual cycle pattern — is worth raising with a clinician.`,
  topics: ['symptoms'],
  phases: ['luteal'],
  symptoms: ['Bloating'],
  lifeStages: ['cycle'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    {
      label: 'NHS — Premenstrual syndrome (PMS)',
      url: 'https://www.nhs.uk/conditions/pre-menstrual-syndrome/',
    },
    {
      label: 'ACOG — Premenstrual syndrome',
      url: 'https://www.acog.org/womens-health/faqs/premenstrual-syndrome',
    },
  ],
};
```

- [ ] **Step 6: Extend `src/content/index.ts`**

Replace the file contents with:

```ts
// src/content/index.ts
import type { ContentArticle } from '@/src/domain/content/types';
import { howTrackingWorks } from './articles/how-tracking-works';
import { menstrualPhase } from './articles/menstrual-phase';
import { follicularPhase } from './articles/follicular-phase';
import { ovulationFertileWindow } from './articles/ovulation-fertile-window';
import { lutealPhasePms } from './articles/luteal-phase-pms';
import { periodCramps } from './articles/period-cramps';
import { moodAcrossCycle } from './articles/mood-across-cycle';
import { irregularCycles } from './articles/irregular-cycles';
import { premenstrualFatigue } from './articles/premenstrual-fatigue';
import { bloatingAndYourCycle } from './articles/bloating-and-your-cycle';

export const ARTICLES: ContentArticle[] = [
  howTrackingWorks,
  menstrualPhase,
  follicularPhase,
  ovulationFertileWindow,
  lutealPhasePms,
  periodCramps,
  moodAcrossCycle,
  irregularCycles,
  premenstrualFatigue,
  bloatingAndYourCycle,
];

export function findArticle(slug: string): ContentArticle | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
```

- [ ] **Step 7: Write the data-integrity test**

```ts
// src/content/index.test.ts
import { describe, it, expect } from 'vitest';
import { ARTICLES, findArticle } from './index';
import { CONTENT_TOPICS } from '@/src/domain/content/types';
import { SYMPTOM_OPTIONS, MOOD_OPTIONS } from '@/src/domain/log-options';

const PHASES = ['menstrual', 'follicular', 'ovulation', 'luteal'];
const LIFE_STAGES = ['cycle', 'ttc', 'pregnancy', 'menopause'];
const SYMPTOM_TAGS = new Set([...SYMPTOM_OPTIONS, ...MOOD_OPTIONS]);

describe('content corpus integrity', () => {
  it('has a healthy number of articles', () => {
    expect(ARTICLES.length).toBeGreaterThanOrEqual(10);
  });

  it('has unique slugs', () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('findArticle resolves by slug', () => {
    expect(findArticle('period-cramps')?.title).toBe('Managing period cramps');
    expect(findArticle('does-not-exist')).toBeUndefined();
  });

  it('every article is well-formed', () => {
    for (const a of ARTICLES) {
      expect(a.title.trim()).not.toBe('');
      expect(a.summary.trim()).not.toBe('');
      expect(a.body.trim().length).toBeGreaterThan(40);
      expect(a.author).toBe('Lumen Editorial');
      expect(a.medicalReviewer.trim()).not.toBe('');
      expect(a.readingMinutes).toBeGreaterThan(0);
      expect(a.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(a.lastReviewed))).toBe(false);

      expect(a.topics.length).toBeGreaterThan(0);
      for (const t of a.topics) expect(CONTENT_TOPICS).toContain(t);
      for (const p of a.phases) expect(PHASES).toContain(p);
      for (const l of a.lifeStages) expect(LIFE_STAGES).toContain(l);
      for (const s of a.symptoms) expect(SYMPTOM_TAGS.has(s)).toBe(true);

      expect(a.sources.length).toBeGreaterThan(0);
      for (const src of a.sources) {
        expect(src.label.trim()).not.toBe('');
        expect(src.url).toMatch(/^https?:\/\//);
      }
    }
  });
});
```

- [ ] **Step 8: Run the integrity test**

Run: `npx vitest run src/content/index.test.ts`
Expected: PASS (all tests). If a symptom tag fails, fix the article to use an exact `SYMPTOM_OPTIONS`/`MOOD_OPTIONS` string.

- [ ] **Step 9: Commit**

```bash
git add src/content/articles src/content/index.ts src/content/index.test.ts
git commit -m "feat(content): seed corpus part 2 + data-integrity test"
```

---

## Task 7: Expose content from useHealthData

**Files:**
- Modify: `src/state/useHealthData.ts`
- Test: `src/state/useHealthData.content.test.tsx`

**Interfaces:**
- Consumes: `ARTICLES` from `@/src/content`; `deriveContentContext`, `buildContentFeed`, `selectDailyContent` from `@/src/domain/content/*`; `ScoredArticle`, `ContentArticle` types.
- Produces: hook return gains `contentFeed: ScoredArticle[]` and `dailyContent: ContentArticle | null`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/state/useHealthData.content.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { useHealthData } from './useHealthData';
import { db } from '@/src/data/db';

describe('useHealthData content', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('exposes a content feed and a daily article', async () => {
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(Array.isArray(result.current.contentFeed)).toBe(true);
    expect(result.current.contentFeed.length).toBeGreaterThan(0);
    expect(result.current.dailyContent).not.toBeNull();
  });

  it('prioritises getting-started content before any data is logged', async () => {
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const top = result.current.contentFeed[0].article;
    expect(top.topics).toContain('getting-started');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/useHealthData.content.test.tsx`
Expected: FAIL — `contentFeed` / `dailyContent` undefined.

- [ ] **Step 3: Add imports to `src/state/useHealthData.ts`**

Add near the existing insights imports (after line importing `generateInsights`):

```ts
import { ARTICLES } from '@/src/content';
import { deriveContentContext } from '@/src/domain/content/context';
import { buildContentFeed } from '@/src/domain/content/feed';
import { selectDailyContent } from '@/src/domain/content/daily';
import type { ScoredArticle, ContentArticle } from '@/src/domain/content/types';
```

- [ ] **Step 4: Add the memoized derivations**

Immediately after the existing `insights` `useMemo` block (around line 85), add:

```ts
  const contentFeed: ScoredArticle[] = useMemo(() => {
    const context = deriveContentContext({
      cycles,
      dailyLogs,
      stats,
      prediction,
      today: todayISO(),
    });
    return buildContentFeed(ARTICLES, context);
  }, [cycles, dailyLogs, stats, prediction]);

  const dailyContent: ContentArticle | null = useMemo(
    () => selectDailyContent(contentFeed, todayISO()),
    [contentFeed],
  );
```

- [ ] **Step 5: Add to the hook's return object**

In the `return { ... }` block, add `contentFeed,` and `dailyContent,` next to `insights,`:

```ts
    insights,
    contentFeed,
    dailyContent,
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/state/useHealthData.content.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 7: Commit**

```bash
git add src/state/useHealthData.ts src/state/useHealthData.content.test.tsx
git commit -m "feat(content): expose content feed and daily article from hook"
```

---

## Task 8: ContentCard component

**Files:**
- Create: `src/components/ContentCard.tsx`
- Test: `src/components/ContentCard.test.tsx`

**Interfaces:**
- Consumes: `ContentArticle` from `@/src/domain/content/types`; `next/link`.
- Produces: `ContentCard({ article, reason }: { article: ContentArticle; reason?: string })` — a linked card to `/library/<slug>`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ContentCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContentCard } from './ContentCard';
import type { ContentArticle } from '@/src/domain/content/types';

const article: ContentArticle = {
  slug: 'period-cramps',
  title: 'Managing period cramps',
  summary: 'Why cramps happen and how to ease them.',
  body: 'x',
  topics: ['symptoms'],
  phases: ['menstrual'],
  symptoms: ['Cramps'],
  lifeStages: ['cycle'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [{ label: 'NHS', url: 'https://www.nhs.uk/' }],
};

describe('ContentCard', () => {
  it('renders the title, summary, and reading time as a link', () => {
    render(<ContentCard article={article} />);
    const link = screen.getByRole('link', { name: /managing period cramps/i });
    expect(link).toHaveAttribute('href', '/library/period-cramps');
    expect(screen.getByText(/why cramps happen/i)).toBeInTheDocument();
    expect(screen.getByText(/2 min read/i)).toBeInTheDocument();
  });

  it('shows a match reason when provided', () => {
    render(<ContentCard article={article} reason="Matches what you logged: Cramps" />);
    expect(
      screen.getByText(/matches what you logged: cramps/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ContentCard.test.tsx`
Expected: FAIL — cannot find module `./ContentCard`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/ContentCard.tsx
import Link from 'next/link';
import type { ContentArticle } from '@/src/domain/content/types';

export function ContentCard({
  article,
  reason,
}: {
  article: ContentArticle;
  reason?: string;
}) {
  return (
    <Link
      href={`/library/${article.slug}`}
      className="block rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-rose-300"
    >
      {reason && (
        <p className="mb-1 text-xs font-medium text-rose-600">{reason}</p>
      )}
      <h3 className="font-semibold">{article.title}</h3>
      <p className="mt-1 text-sm text-neutral-700">{article.summary}</p>
      <p className="mt-2 text-xs text-neutral-500">
        {article.readingMinutes} min read
      </p>
    </Link>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ContentCard.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ContentCard.tsx src/components/ContentCard.test.tsx
git commit -m "feat(content): ContentCard component"
```

---

## Task 9: ArticleReader component (+ react-markdown)

**Files:**
- Modify: `package.json` (add deps via npm)
- Create: `src/components/ArticleReader.tsx`
- Test: `src/components/ArticleReader.test.tsx`

**Interfaces:**
- Consumes: `ContentArticle` from `@/src/domain/content/types`; `react-markdown`, `remark-gfm`.
- Produces: `ArticleReader({ article }: { article: ContentArticle })` — full reader with body, metadata, sources, and disclaimer.

- [ ] **Step 1: Install dependencies**

Run: `npm install react-markdown remark-gfm`
Expected: both added to `package.json` dependencies, no peer-dep errors that block install.

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/ArticleReader.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArticleReader } from './ArticleReader';
import type { ContentArticle } from '@/src/domain/content/types';

const article: ContentArticle = {
  slug: 'menstrual-phase',
  title: 'Your menstrual phase, explained',
  summary: 'What happens during your period.',
  body: '## What is happening\n\nYour period marks day 1 of your cycle.',
  topics: ['menstruation'],
  phases: ['menstrual'],
  symptoms: ['Cramps'],
  lifeStages: ['cycle'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    { label: 'NHS — Periods', url: 'https://www.nhs.uk/conditions/periods/' },
  ],
};

describe('ArticleReader', () => {
  it('renders the title and markdown body', () => {
    render(<ArticleReader article={article} />);
    expect(
      screen.getByRole('heading', { name: /your menstrual phase, explained/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /what is happening/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/marks day 1 of your cycle/i)).toBeInTheDocument();
  });

  it('shows reviewer line, sources, and the educational disclaimer', () => {
    render(<ArticleReader article={article} />);
    expect(screen.getByText(/aligned with nhs guidance/i)).toBeInTheDocument();
    expect(screen.getByText(/last reviewed/i)).toBeInTheDocument();
    const source = screen.getByRole('link', { name: /nhs — periods/i });
    expect(source).toHaveAttribute('href', 'https://www.nhs.uk/conditions/periods/');
    expect(screen.getByText(/not a substitute for professional medical advice/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/ArticleReader.test.tsx`
Expected: FAIL — cannot find module `./ArticleReader`.

- [ ] **Step 4: Write minimal implementation**

```tsx
// src/components/ArticleReader.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ContentArticle } from '@/src/domain/content/types';

export function ArticleReader({ article }: { article: ContentArticle }) {
  return (
    <article className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{article.title}</h1>
        <p className="text-sm text-neutral-500">
          {article.readingMinutes} min read
        </p>
      </header>

      <div className="space-y-3 text-neutral-800">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: (props) => <h2 className="mt-4 text-lg font-semibold" {...props} />,
            p: (props) => <p className="text-sm leading-relaxed" {...props} />,
            ul: (props) => <ul className="list-disc pl-5 text-sm" {...props} />,
            li: (props) => <li className="mt-1" {...props} />,
            a: (props) => (
              <a
                className="text-rose-600 underline"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              />
            ),
          }}
        >
          {article.body}
        </ReactMarkdown>
      </div>

      <section className="rounded-2xl bg-neutral-50 p-4 text-sm">
        <h2 className="font-semibold">Sources</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {article.sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-600 underline"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-neutral-500">
          {article.medicalReviewer} · Last reviewed {article.lastReviewed}
        </p>
      </section>

      <p className="text-xs text-neutral-500">
        This is general education, not a substitute for professional medical
        advice. If you&apos;re concerned about your health, contact a clinician.
      </p>
    </article>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/ArticleReader.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/ArticleReader.tsx src/components/ArticleReader.test.tsx
git commit -m "feat(content): ArticleReader with markdown body, sources, disclaimer"
```

---

## Task 10: ContentLibrary component (browse + filter + search)

**Files:**
- Create: `src/components/ContentLibrary.tsx`
- Test: `src/components/ContentLibrary.test.tsx`

**Interfaces:**
- Consumes: `ContentArticle` from `@/src/domain/content/types`; `ScoredArticle`; `ContentCard`; React `useState`.
- Produces: `ContentLibrary({ feed, all }: { feed: ScoredArticle[]; all: ContentArticle[] })` — a "For you" section (top of `feed`) plus a browsable, searchable, topic-filterable list of `all`.

**Behavior:** renders up to the top 3 feed articles under "For you" (each with its top match reason if any), then "Browse" with a text input filtering by title/summary (case-insensitive) and a topic filter (`All` + each distinct topic present in `all`). This is a client component (`'use client'`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ContentLibrary.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContentLibrary } from './ContentLibrary';
import type { ContentArticle } from '@/src/domain/content/types';

function make(slug: string, title: string, topic: ContentArticle['topics'][number]): ContentArticle {
  return {
    slug,
    title,
    summary: `${title} summary`,
    body: 'x',
    topics: [topic],
    phases: [],
    symptoms: [],
    lifeStages: ['cycle'],
    readingMinutes: 2,
    author: 'Lumen Editorial',
    medicalReviewer: 'Aligned with NHS guidance',
    lastReviewed: '2026-06-17',
    sources: [{ label: 'NHS', url: 'https://www.nhs.uk/' }],
  };
}

const cramps = make('period-cramps', 'Managing period cramps', 'symptoms');
const ovulation = make('ovulation-fertile-window', 'Ovulation and your fertile window', 'fertility');
const all = [cramps, ovulation];
const feed = [{ article: cramps, score: 5, matchReasons: ['Matches what you logged: Cramps'] }];

describe('ContentLibrary', () => {
  it('shows a personalized "For you" section with reasons', () => {
    render(<ContentLibrary feed={feed} all={all} />);
    expect(screen.getByText(/for you/i)).toBeInTheDocument();
    expect(screen.getByText(/matches what you logged: cramps/i)).toBeInTheDocument();
  });

  it('filters the browse list by search text', () => {
    render(<ContentLibrary feed={feed} all={all} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: 'ovulation' },
    });
    expect(screen.getByText('Ovulation and your fertile window')).toBeInTheDocument();
    // cramps still appears once in "For you"; in the browse list it is filtered out.
    expect(screen.getAllByText('Managing period cramps').length).toBe(1);
  });

  it('filters the browse list by topic', () => {
    render(<ContentLibrary feed={[]} all={all} />);
    fireEvent.change(screen.getByLabelText(/topic/i), {
      target: { value: 'fertility' },
    });
    expect(screen.getByText('Ovulation and your fertile window')).toBeInTheDocument();
    expect(screen.queryByText('Managing period cramps')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ContentLibrary.test.tsx`
Expected: FAIL — cannot find module `./ContentLibrary`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/ContentLibrary.tsx
'use client';

import { useMemo, useState } from 'react';
import type { ContentArticle, ScoredArticle } from '@/src/domain/content/types';
import { ContentCard } from './ContentCard';

const FOR_YOU_COUNT = 3;

export function ContentLibrary({
  feed,
  all,
}: {
  feed: ScoredArticle[];
  all: ContentArticle[];
}) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');

  const topics = useMemo(() => {
    const set = new Set<string>();
    for (const a of all) for (const t of a.topics) set.add(t);
    return [...set].sort();
  }, [all]);

  const forYou = feed.slice(0, FOR_YOU_COUNT);

  const browse = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((a) => {
      const matchesTopic = topic === 'all' || a.topics.includes(topic as ContentArticle['topics'][number]);
      const matchesQuery =
        q === '' ||
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q);
      return matchesTopic && matchesQuery;
    });
  }, [all, query, topic]);

  return (
    <div className="space-y-6">
      {forYou.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">For you</h2>
          {forYou.map((f) => (
            <ContentCard
              key={f.article.slug}
              article={f.article}
              reason={f.matchReasons[0]}
            />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Browse</h2>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Search articles"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <label className="sr-only" htmlFor="topic-filter">
            Topic
          </label>
          <select
            id="topic-filter"
            aria-label="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="all">All topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {browse.length === 0 ? (
          <p className="rounded-2xl bg-neutral-50 p-6 text-center text-neutral-600">
            No articles match your search.
          </p>
        ) : (
          <div className="space-y-3">
            {browse.map((a) => (
              <ContentCard key={a.slug} article={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ContentLibrary.test.tsx`
Expected: PASS (all 3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ContentLibrary.tsx src/components/ContentLibrary.test.tsx
git commit -m "feat(content): ContentLibrary with For-you, search, topic filter"
```

---

## Task 11: DailyContentCard component

**Files:**
- Create: `src/components/DailyContentCard.tsx`
- Test: `src/components/DailyContentCard.test.tsx`

**Interfaces:**
- Consumes: `ContentArticle` from `@/src/domain/content/types`; `ContentCard`.
- Produces: `DailyContentCard({ article }: { article: ContentArticle | null })` — a labelled "Today's read" wrapper; renders nothing when `article` is null.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/DailyContentCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyContentCard } from './DailyContentCard';
import type { ContentArticle } from '@/src/domain/content/types';

const article: ContentArticle = {
  slug: 'menstrual-phase',
  title: 'Your menstrual phase, explained',
  summary: 'What happens during your period.',
  body: 'x',
  topics: ['menstruation'],
  phases: ['menstrual'],
  symptoms: [],
  lifeStages: ['cycle'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [{ label: 'NHS', url: 'https://www.nhs.uk/' }],
};

describe('DailyContentCard', () => {
  it('renders the labelled daily read', () => {
    render(<DailyContentCard article={article} />);
    expect(screen.getByText(/today.s read/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /your menstrual phase, explained/i }),
    ).toBeInTheDocument();
  });

  it('renders nothing when there is no article', () => {
    const { container } = render(<DailyContentCard article={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/DailyContentCard.test.tsx`
Expected: FAIL — cannot find module `./DailyContentCard`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/DailyContentCard.tsx
import type { ContentArticle } from '@/src/domain/content/types';
import { ContentCard } from './ContentCard';

export function DailyContentCard({
  article,
}: {
  article: ContentArticle | null;
}) {
  if (!article) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Today&apos;s read
      </h2>
      <ContentCard article={article} />
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/DailyContentCard.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/DailyContentCard.tsx src/components/DailyContentCard.test.tsx
git commit -m "feat(content): DailyContentCard component"
```

---

## Task 12: Library pages (list + reader route)

**Files:**
- Create: `app/library/page.tsx`
- Create: `app/library/[slug]/page.tsx`

**Interfaces:**
- Consumes: `useHealthData` (`contentFeed`); `ARTICLES`, `findArticle` from `@/src/content`; `ContentLibrary`, `ArticleReader`; `next/navigation` `useParams`; `next/link`.

- [ ] **Step 1: Read the Next.js routing guide**

Per AGENTS.md, before writing route code read the App Router routing/pages guide:

Run: `ls node_modules/next/dist/docs/`
Then read the file(s) covering pages and dynamic routes (e.g. `grep -ril "dynamic" node_modules/next/dist/docs/ | head`). Confirm how `params` are accessed for the current Next version. Both pages here are **client components** (`'use client'`) and read the slug via `useParams()`, which avoids server `params`-promise differences.

- [ ] **Step 2: Create the library list page**

```tsx
// app/library/page.tsx
'use client';

import Link from 'next/link';
import { useHealthData } from '@/src/state/useHealthData';
import { ContentLibrary } from '@/src/components/ContentLibrary';
import { ARTICLES } from '@/src/content';

export default function LibraryPage() {
  const { contentFeed, loading } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Library</h1>
        <Link href="/" className="text-sm text-neutral-500 underline">
          Home
        </Link>
      </div>
      <ContentLibrary feed={contentFeed} all={ARTICLES} />
    </main>
  );
}
```

- [ ] **Step 3: Create the article reader route**

```tsx
// app/library/[slug]/page.tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { findArticle } from '@/src/content';
import { ArticleReader } from '@/src/components/ArticleReader';

export default function ArticlePage() {
  const params = useParams<{ slug: string }>();
  const article = findArticle(params.slug);

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <Link href="/library" className="text-sm text-neutral-500 underline">
        ← Back to library
      </Link>
      {article ? (
        <ArticleReader article={article} />
      ) : (
        <p className="rounded-2xl bg-neutral-50 p-6 text-center text-neutral-600">
          Article not found.
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Verify the build compiles the routes**

Run: `npm run build`
Expected: build succeeds; `/library` and `/library/[slug]` appear in the route output.

- [ ] **Step 5: Commit**

```bash
git add app/library
git commit -m "feat(content): library list page and article reader route"
```

---

## Task 13: Home daily card + Library nav link

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `dailyContent` from `useHealthData`; `DailyContentCard`.

- [ ] **Step 1: Add imports to `app/page.tsx`**

Add with the other component imports:

```tsx
import { DailyContentCard } from '@/src/components/DailyContentCard';
```

- [ ] **Step 2: Pull `dailyContent` from the hook**

Change the destructure on the `useHealthData()` line to include `dailyContent`:

```tsx
  const { cycles, stats, prediction, insights, dailyContent, loading } =
    useHealthData();
```

- [ ] **Step 3: Render the daily card after the insight highlight**

Directly after the `{highlight && <InsightCard insight={highlight} />}` line, add:

```tsx
      <DailyContentCard article={dailyContent} />
```

- [ ] **Step 4: Add the Library nav link**

In the `<nav>` grid, add alongside the existing links (after the Insights link):

```tsx
        <Link href="/library" className="rounded-md border px-4 py-3">
          Library
        </Link>
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat(content): daily content card and Library link on home"
```

---

## Task 14: Full-suite verification

**Files:** none (verification only).

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all suites pass, including the new content domain, integrity, hook, and component tests.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build succeeds with `/library` and `/library/[slug]` routes present.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors (warnings acceptable if pre-existing).

- [ ] **Step 4: Commit any incidental fixes**

If steps 1–3 required fixes, commit them:

```bash
git add -A
git commit -m "chore(content): verification fixes"
```

If nothing changed, skip this commit.

---

## Self-Review (completed by plan author)

- **Spec coverage:**
  - Library + browse/filter/search → Task 10 (`ContentLibrary`) + Task 12 (`/library`).
  - Personalized feed → Tasks 2–3 (context, feed) + Task 7 (hook) + Task 10 ("For you").
  - Daily content card → Task 4 (`selectDailyContent`) + Tasks 11, 13.
  - Medical-review / citation metadata → Task 1 (`ContentArticle`), Tasks 5–6 (sources), Task 9 (reader displays them), Task 6 (integrity test enforces them).
  - Markdown bodies + lightweight renderer → Task 9 (`react-markdown` + `remark-gfm`).
  - ~10–12 cited articles → Tasks 5–6 (10 articles).
  - Reuse existing vocabularies → enforced in Task 1 types + Task 6 integrity test.
  - Deterministic / explainable → Tasks 2–4 unit tests assert determinism + match reasons.
  - Courses/programs → correctly out of scope (no task), per spec §1.
- **Placeholder scan:** every code step contains complete code; article bodies are full; URLs fixed by the Global Constraints. No TBD/TODO.
- **Type consistency:** `ContentArticle`, `ContentContext`, `ScoredArticle`, `ContentInput`, `deriveContentContext`, `buildContentFeed`, `selectDailyContent`, `findArticle`, `ARTICLES`, and the constant names are used identically across Tasks 1–13.
