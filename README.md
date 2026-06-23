# Lumen

**A private, offline-first companion for the whole reproductive life cycle.**

Lumen is a women's-health app (in the spirit of [Flo](https://flo.health/)) built around a simple promise: track your cycle, fertility, pregnancy, and postpartum recovery with accurate, *explainable* guidance — without your body ever becoming a data product. It runs as an installable Progressive Web App, stores **all** health data **on your device**, and ships with **no ads, no paywall, and no third-party tracking**.

> ⚕️ **Not medical advice.** Lumen's predictions and insights are estimates derived from your own logged data. They are not a diagnosis, not a contraceptive method, and not a substitute for a clinician. In an emergency, contact your local emergency services.

**Status:** `v1.0.0` — shipped. 270 tests passing · `build` + `lint` green.

---

## Table of contents

- [Why Lumen](#why-lumen)
- [Features](#features)
- [Quick start](#quick-start)
- [For end users](#for-end-users--the-life-stages)
- [For engineers](#for-engineers--how-its-built)
  - [Architecture](#architecture)
  - [The domain core](#the-domain-core-the-ip)
  - [Data layer & persistence](#data-layer--persistence)
  - [Privacy as an architecture, not a setting](#privacy-as-an-architecture-not-a-setting)
  - [Testing strategy](#testing-strategy)
  - [Project layout](#project-layout)
- [Tech stack](#tech-stack)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Design notes & conscious tradeoffs](#design-notes--conscious-tradeoffs)
- [Documentation](#documentation)
- [License](#license)

---

## Why Lumen

Cycle and pregnancy data is one of the most sensitive categories of personal data — and, post-*Dobbs*, potentially legally sensitive. Most trackers monetize it. Lumen takes the opposite stance and makes privacy **structural** rather than a marketing line:

- **Local-first.** Health data lives in your browser's IndexedDB. There is no backend in the current build — nothing to upload, leak, or subpoena.
- **No tracking SDKs.** The client bundle ships zero analytics, ad, or tracking code (enforced in review). There is no production telemetry by design.
- **You own your data.** One-tap full export (versioned JSON) and a real, irreversible delete.
- **Deterministic & explainable.** Every prediction and insight is computed from your own logs and cites the data it came from. No black-box model decides your forecast.
- **Optional passcode lock.** App-level gate storing only a salted PBKDF2 hash of your passcode, never the passcode itself.
- **Compassion by design.** Pregnancy-loss and postpartum mental-health paths are first-class, not afterthoughts — no celebratory copy on a loss path, crisis-aware screening that surfaces support.

---

## Features

Lumen follows a person across every stage of reproductive life, switching modes as their needs change. Every stage shares the same logging surface, the same on-device store, and the same export/delete guarantees.

| Stage | What it does | Status |
|---|---|---|
| **Cycle tracking** | Daily logging, deterministic period/fertile/ovulation prediction with honest confidence, calendar, history & trends | ✅ Phase 1 |
| **Insights** | Explainable patterns, trends, anomaly nudges, and phase guidance from your own data | ✅ Phase 2A |
| **Content library** | 10-article, medically-cited corpus with a personalized, deterministic feed | ✅ Phase 2B |
| **Fertility / TTC** | Opt-in trying-to-conceive mode: BBT, LH, cervical mucus, ovulation confirmation, BBT chart | ✅ Phase 3 |
| **Pregnancy** | Week-by-week, kick counter, contraction timer (5-1-1), compassionate birth/loss exit | ✅ Phase 4 |
| **Postpartum** | Mother-focused recovery tracking + EPDS mental-health screening with crisis support | ✅ Phase 5 |

### Cross-cutting (all stages)
- Installable **PWA** with an offline app shell (service worker) and web manifest, real PNG/maskable icons.
- **Persistent storage** requested on bootstrap (`navigator.storage.persist()`) so the browser is less likely to evict your data, plus an in-app data-loss backup warning.
- Local data **export** (versioned JSON) and **hard delete** that also clears passcode and preferences.
- First-run **onboarding intro** explaining what Lumen is, what it isn't, and that data stays on the device.
- A dedicated **/privacy** page and global footer link.

---

## Quick start

**Prerequisites:** Node.js 24+ and npm.

```bash
npm install          # install dependencies
npm run dev          # dev server → http://localhost:3000
npm test             # run the full Vitest suite once
npm run build        # production build
npm start            # serve the production build
```

The app is **local-first**: open it, complete onboarding, and start logging. No accounts, no configuration, **no environment variables**, no backend.

---

## For end users — the life stages

### Cycle tracking
Log flow, symptoms, mood, and free-text notes — fast and fully offline. Lumen computes your **next period, fertile window, ovulation day, and current phase**, each with an **honest confidence level**: irregular cycles get wider ranges and lower confidence rather than false precision. A home dashboard shows your current cycle day and the most relevant insight; an accessible calendar marks period, predicted period, fertile window, and ovulation (state conveyed by label + shape, not color alone); history shows average cycle/period length, regularity, and a per-cycle breakdown.

### Insights
Deterministic, explainable insights derived entirely from your own logs:
- **Patterns** — e.g. *"You logged Headache 4 times — 3 of those during your luteal phase."*
- **Trends** — cycle regularity, and whether recent cycles run longer/shorter than before.
- **Anomaly nudges** — overdue period, an unusually long/short cycle vs. *your own* norm, or a recent symptom cluster. Non-alarmist, with a "consider checking with a clinician" prompt where appropriate.
- **Phase guidance** — general, non-diagnostic notes on what's typical now.

Each generator returns nothing when there isn't enough data, so you never see a weak or misleading insight.

### Content library
A bundled, **medically-cited** article corpus (sources include NHS, ACOG, and the U.S. Office on Women's Health). A deterministic engine maps your current context → a personalized "For you" feed and a daily card on the home screen. Browse, search, and filter by topic and phase; read articles in-app.

### Fertility / TTC
An **opt-in** trying-to-conceive mode. Log basal body temperature (°C/°F), LH tests, cervical mucus, and intercourse. Lumen detects the thermal shift (3-over-6 rule), **confirms ovulation** by combining BBT + LH + mucus, estimates your real luteal length, and gives qualitative conception guidance — rendered with an inline BBT chart and a non-medical disclaimer.

### Pregnancy
Switch to pregnancy mode from a positive result or onboarding goal. Track gestational age, trimester, and countdown from EDD or LMP; read week-by-week content; count kicks; and time contractions with **5-1-1** guidance. The birth/loss exit flow is **compassionate by design** — the loss path carries no celebratory or period-prompt copy and suppresses re-engagement nudges.

### Postpartum
Mother-focused **recovery** tracking (not baby tracking): day/week/stage of recovery, lochia logging kept entirely separate from cycle stats, and the **Edinburgh Postnatal Depression Scale (EPDS)** check-in. Scoring is crisis-aware — a high-risk band (total ≥ 13) **or** any self-harm response surfaces a non-diagnostic crisis-support block. Returning to cycle/TTC is user-driven; Lumen makes no dishonest "cycle will return on X" prediction while breastfeeding.

---

## For engineers — how it's built

### Architecture

Lumen is layered so the logic that matters most — the prediction, fertility, pregnancy, postpartum, insights, and content engines — is **pure, dependency-free TypeScript** that can be reasoned about and tested in isolation, with no React or IO in the way.

```
┌────────────────────────────────────────────────────────────┐
│  UI   app/* routes + src/components/*                        │  Next.js App Router, React 19, Tailwind v4
├────────────────────────────────────────────────────────────┤
│  State   src/state/useHealthData.ts                          │  one hook: store ↔ domain, memoized derived state
├────────────────────────────────────────────────────────────┤
│  Domain   src/domain/* — PURE TS, the core IP                │
│    prediction.ts      cycle-stats.ts     calendar.ts          │
│    insights/          content/                                │
│    fertility/         pregnancy/         postpartum/          │
│    dates.ts (timezone-safe ISODate)      types.ts             │
├────────────────────────────────────────────────────────────┤
│  Data   src/data/* (Dexie v3 / IndexedDB) · src/storage/*    │  local-first, offline source of truth
│  Security   src/security/* (salted PBKDF2 passcode)          │
└────────────────────────────────────────────────────────────┘
```

The dependency rule points **inward**: UI depends on state, state depends on the domain, the domain depends on nothing. The domain layer imports no React and performs no IO, which is what makes it cheap to test exhaustively and safe to evolve.

### The domain core (the IP)

Each subsystem is a small set of independently testable pure functions:

- **`prediction.ts`** — a rolling statistical model. Computes average cycle length and variance from history, projects the next period, derives ovulation (≈14 days before the next period) and the fertile window, and attaches a `high` / `medium` / `low` confidence plus a human-readable explanation. Optionally accepts `ObservedFertility` (real luteal length + confirmed-ovulation override) from TTC mode; the default path is unchanged. No ML, no network.
- **`insights/`** — four generators (patterns, trends, anomalies, guidance) feed an aggregator that ranks results (attention-worthy first) and picks the single most relevant for the home screen.
- **`content/`** — `context → feed → daily`: turns the user's current context into a ranked article feed and one daily pick, over a bundled cited corpus.
- **`fertility/`** — `units` (°C/°F), `bbt` (3-over-6 thermal shift), `confirmation` (BBT + LH + mucus → `OvulationConfirmation`), `luteal` (clamped 9–17 days), `guidance`, `journey` (TTC-cycle counting).
- **`pregnancy/`** — `gestation` (EDD↔LMP, age/trimester/countdown/progress), `weeks` (weekly content), `kicks`, `contractions` (duration/frequency + 5-1-1), `lifecycle` transitions.
- **`postpartum/`** — `recovery` (day/week/stage), **`epds`** (EPDS instrument + crisis-aware `scoreEpds` → total/band/`riskFlag`), `weeks` (1–12 recovery content), `lifecycle`.

### Data layer & persistence

- **`src/data/db.ts`** — a Dexie database (`lumen-health`) at **schema version 3**, migrated additively:
  - **v1:** `cycles`, `dailyLogs`
  - **v2:** + `pregnancyProfile`, `kickSessions`, `contractionSessions`
  - **v3:** + `postpartumProfile`, `epdsEntries`
- **`src/data/repository.ts`** — CRUD over those tables; the only place IndexedDB is touched.
- **`src/data/export.ts`** — a single versioned JSON export blob covering every table, with matching hard-delete parity.
- **`src/storage/persist.ts`** — wraps `navigator.storage.persist()` to reduce eviction risk.
- **Notable model decision:** `DailyLog` carries optional fields per stage (`bbt`/`lh`/`mucus`/`intercourse`, and `lochia`). **Lochia is deliberately separate from `flow`** — postpartum bleeding never feeds cycle statistics or predictions and never creates a `Cycle`.

### Privacy as an architecture, not a setting

- **No backend, no network egress of health data.** The absence of a server is the privacy model — there is nothing to breach server-side.
- **No analytics or error monitoring in production** — an intentional v1 tradeoff (see below) that keeps the zero-tracking guarantee literal.
- **Passcode** (`src/security/passcode.ts`) is a salted **PBKDF2** hash; verification derives with the *stored* iteration count and transparently upgrades legacy hashes and stale parameters on success. It is an app-level gate — the local DB itself is not encrypted, and the UI says so.

### Testing strategy

The domain core is developed **test-first** (TDD). The suite (**270 tests**, Vitest) covers date utilities, cycle statistics, the full prediction engine (including the TTC-observed path), every insights/content/fertility/pregnancy/postpartum module, the EPDS scoring bands and crisis flag, the repository (against `fake-indexeddb`), export/delete, the `useHealthData` hook per stage, and UI components.

```bash
npm test                 # all tests
npm test -- prediction   # focused file/pattern
npm run test:watch       # watch mode
```

> ⚠️ **Repo convention:** this project pins **Next.js 16**, which has breaking changes versus older mental models. Per [`AGENTS.md`](AGENTS.md), read the bundled guides in `node_modules/next/dist/docs/` before writing Next.js code, and heed deprecation notices.

### Project layout

```
app/                      # Next.js App Router routes
  page.tsx                #   home dashboard (stage-aware)
  onboarding/  log/  calendar/  history/  insights/
  library/  library/[slug]/                 # content reader
  fertility/                                 # TTC + BBT chart
  pregnancy/  pregnancy/kicks/  pregnancy/contractions/
  postpartum/  postpartum/checkin/           # recovery + EPDS
  settings/  privacy/
src/
  domain/                 # pure logic — no React/IO (the IP)
    dates.ts  cycle-stats.ts  prediction.ts  calendar.ts  log-options.ts  types.ts
    insights/  content/  fertility/  pregnancy/  postpartum/
  data/                   # Dexie schema (v3), repository, export
  storage/                # persistent-storage request
  state/                  # useHealthData hook (store ↔ domain)
  components/             # presentational React components
  security/               # passcode (salted PBKDF2)
  content/                # bundled cited article corpus (Markdown)
  settings/               # local preferences
docs/superpowers/         # PRD, design specs, implementation plans
public/                   # service worker, icons, manifest assets
scripts/                  # generate-icons.mjs (sharp)
```

---

## Tech stack

| Area | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Local storage | [Dexie](https://dexie.org/) over IndexedDB (schema v3) |
| Dates | [date-fns](https://date-fns.org/) with timezone-safe ISO date strings |
| Markdown | `react-markdown` + `remark-gfm` (content library) |
| Testing | [Vitest](https://vitest.dev/) + Testing Library + `fake-indexeddb` |
| Runtime | Node.js 24 |
| Hosting | [Vercel](https://vercel.com/) |

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Run the full Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint |

---

## Deployment

Lumen is a standard Next.js App Router app and deploys to **Vercel** with zero configuration — import the GitHub repo and deploy. **No environment variables or backend services are required**, since all data is stored client-side. Vercel deploys from `main`.

---

## Roadmap

Built phase by phase; each phase has a design spec and implementation plan in [`docs/superpowers/`](docs/superpowers/).

- ✅ **Phase 1 — Cycle tracking MVP**: logging, prediction engine, calendar, history, export/delete, PWA, passcode.
- ✅ **Phase 2A — Insights engine**: patterns, trends, anomalies, guidance.
- ✅ **Phase 2B — Content library**: cited article corpus + personalized deterministic feed.
- ✅ **Phase 3 — Fertility / TTC**: BBT, LH, cervical mucus, ovulation confirmation, BBT chart.
- ✅ **Phase 4 — Pregnancy**: week-by-week, kick counter, contraction timer, compassionate loss flow.
- ✅ **Phase 5 — Postpartum**: recovery tracking + EPDS mental-health screening.
- 🚀 **v1.0.0 shipped** — privacy page, persistent storage, onboarding intro, MIT license.
- ⬜ **Phase 2C — Courses / programs**.
- ⬜ **Phase 5b — Perimenopause & menopause**.
- ⬜ **Phase 6 — AI health assistant** (RAG over a vetted corpus, strict guardrails).
- ⬜ **Phase 7 — Community ("Circles")**, anonymous + moderated.
- ⬜ **Phase 8 — Native mobile + E2E-encrypted sync** (+ TTC partner sharing).
- Possible **v1.x**: region-aware crisis resources, restore-from-export UI.

---

## Design notes & conscious tradeoffs

These are shipped *knowingly* and documented so reviewers don't mistake them for oversights:

- **No analytics or error monitoring in production.** This is the price of the zero-tracking guarantee — there is intentionally no production error visibility. Revisit only with a privacy-preserving approach.
- **EPDS crisis guidance is region-agnostic.** No hardcoded helpline numbers or "find help in your country" link in v1; revisit when localizing.
- **The local DB is not encrypted.** The passcode is an app-level gate, not at-rest encryption; the Settings copy states this plainly.
- **No cross-device sync.** End-to-end encrypted sync is a deliberate future step (Phase 8). Today the guarantee is simply that data never leaves the device.

---

## Documentation

- **Product Requirements (PRD)** — [`docs/superpowers/specs/2026-06-17-womens-health-app-prd.md`](docs/superpowers/specs/2026-06-17-womens-health-app-prd.md)
- **Insights engine design** — [`docs/superpowers/specs/2026-06-17-insights-engine-design.md`](docs/superpowers/specs/2026-06-17-insights-engine-design.md)
- **Pregnancy mode design** — [`docs/superpowers/specs/2026-06-21-pregnancy-mode-design.md`](docs/superpowers/specs/2026-06-21-pregnancy-mode-design.md)
- **Postpartum mode design** — [`docs/superpowers/specs/2026-06-23-postpartum-mode-design.md`](docs/superpowers/specs/2026-06-23-postpartum-mode-design.md)
- **Implementation plans** — [`docs/superpowers/plans/`](docs/superpowers/plans/)
- **User guide** — [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)

---

## License

[MIT](LICENSE). Lumen is an independent personal/portfolio project. It is **not a medical device** and makes no diagnostic or contraceptive-efficacy claims. Always consult a qualified clinician for health decisions; in an emergency, contact your local emergency services.
