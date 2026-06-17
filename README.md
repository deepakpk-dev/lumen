# Lumen

**A private, offline-first menstrual & reproductive health companion.**

Lumen is a women's-health app (in the spirit of [Flo](https://flo.health/)) built around a simple promise: track your cycle, fertility, and symptoms with accurate, *explainable* predictions — without your body ever becoming a data product. It runs as an installable Progressive Web App, stores all health data **on your device**, and ships with **no ads, no paywall, and no third-party tracking**.

> ⚕️ **Not medical advice.** Lumen's predictions and insights are estimates derived from your own logged data. They are not a diagnosis, not a contraceptive method, and not a substitute for a clinician.

---

## Why Lumen

Cycle tracking is one of the most sensitive categories of personal data — and, post-*Dobbs*, potentially legally sensitive. Most trackers monetize that data. Lumen takes the opposite stance, and makes privacy *structural* rather than a marketing line:

- **Local-first.** Health data lives in your browser's IndexedDB. There is no backend in the current build — nothing to upload, leak, or subpoena.
- **No tracking SDKs.** The client bundle ships zero analytics/ad/tracking code (enforced in review).
- **You own your data.** One-tap full export (JSON) and a real, irreversible delete.
- **Deterministic & explainable.** Every prediction and insight cites the data it came from. No black-box model decides your forecast.
- **Optional passcode lock.** App-level lock storing only a hash of your passcode, never the passcode itself.

---

## Features

### Cycle tracking (Phase 1 — shipped)
- **Daily logging** of flow, symptoms, mood, and free-text notes — fast and fully offline.
- **Prediction engine**: next period, fertile window, ovulation day, and current cycle phase, each with an **honest confidence level** (irregular cycles get wider ranges and lower confidence rather than false precision).
- **Home dashboard** showing your current cycle day, phase, and the most relevant insight.
- **Calendar** with accessible markers for period, predicted period, fertile window, and ovulation (state conveyed by label + shape, not color alone).
- **History & trends**: average cycle/period length, regularity, and per-cycle breakdown.
- **Onboarding** that sets up your first prediction from a single date.

### Insights engine (Phase 2A — shipped)
Deterministic, explainable insights derived entirely from your own logs:
- **Patterns** — "You logged Headache 4 times — 3 of those during your luteal phase."
- **Trends** — cycle regularity and whether recent cycles are running longer/shorter than before.
- **Anomaly nudges** — overdue period, an unusually long/short cycle vs. your own norm, or a recent cluster of symptoms. Non-alarmist, with a "consider checking with a clinician" prompt where appropriate.
- **Phase guidance** — general, non-diagnostic notes on what's typical in your current phase.

Insights surface on a dedicated **Insights page** plus a single highlight on the home screen.

### Privacy & PWA (shipped)
- Installable PWA with an offline app shell (service worker) and web manifest.
- Local data **export** (versioned JSON) and **hard delete**.
- Optional **passcode lock** (SHA-256 hash only).

---

## Tech stack

| Area | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Local storage | [Dexie](https://dexie.org/) (IndexedDB) |
| Dates | [date-fns](https://date-fns.org/) (timezone-safe ISO strings) |
| Testing | [Vitest](https://vitest.dev/) + Testing Library + `fake-indexeddb` |
| Runtime | Node.js 24 |
| Hosting | [Vercel](https://vercel.com/) |

---

## Architecture

Lumen is layered so the logic that matters most — the prediction and insights engines — is **pure, dependency-free TypeScript** that can be reasoned about and tested in isolation.

```
┌─────────────────────────────────────────────┐
│  UI  (app/* routes, src/components/*)         │  Next.js App Router, Tailwind
├─────────────────────────────────────────────┤
│  State  (src/state/useHealthData.ts)          │  React hook: store ↔ domain, memoized
├─────────────────────────────────────────────┤
│  Domain (pure TS — the core IP)               │
│    src/domain/prediction.ts                    │  forecasts + confidence
│    src/domain/cycle-stats.ts                   │  averages, regularity
│    src/domain/insights/*                       │  pattern/trend/anomaly/guidance
│    src/domain/dates.ts                          │  timezone-safe ISODate helpers
├─────────────────────────────────────────────┤
│  Data  (src/data/* — Dexie/IndexedDB)         │  local-first, offline source of truth
└─────────────────────────────────────────────┘
```

**Prediction engine.** A rolling statistical model: it computes average cycle length and variance from your history, projects the next period start, derives ovulation (≈14 days before the next period) and the fertile window, and attaches a confidence level (`high` / `medium` / `low`) plus a human-readable explanation. No machine learning, no network call.

**Insights engine.** Four small, independently tested generators (patterns, trends, anomalies, guidance) feed an aggregator that ranks results (attention-worthy items first) and picks the single most relevant one for the home screen. Each generator returns nothing when there isn't enough data, so you never see a weak or misleading insight.

### Project structure

```
app/                      # Next.js routes (/, onboarding, log, calendar,
                          #   history, settings, insights) + manifest
src/
  domain/                 # pure logic, no React/IO
    dates.ts              #   ISODate utilities
    cycle-stats.ts        #   cycle averages & regularity
    prediction.ts         #   forecasts, phases, confidence
    log-options.ts        #   symptom/mood/flow option lists
    insights/             #   types + 4 generators + aggregator
    types.ts              #   shared domain types
  data/                   # Dexie schema, repository, export
  state/                  # useHealthData hook
  components/             # presentational React components
  security/               # passcode (hash-only)
docs/superpowers/         # PRD, design specs, implementation plans
public/                   # service worker, icons, manifest assets
```

---

## Getting started

**Prerequisites:** Node.js 24+ and npm.

```bash
# install
npm install

# run the dev server (http://localhost:3000)
npm run dev

# run the test suite
npm test

# production build
npm run build && npm start
```

### Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Run the full Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint |

The app is local-first: just open it, complete onboarding, and start logging — no accounts, no configuration, no environment variables required.

---

## Testing

The domain core is developed test-first. The suite covers the date utilities, cycle statistics, the full prediction engine, every insights generator and the aggregator, the data repository (against `fake-indexeddb`), the state hook, and the UI components.

```bash
npm test          # all tests
npm test -- prediction   # a focused file/pattern
```

---

## Deployment

Lumen is a standard Next.js App Router app and deploys to **Vercel** with zero configuration — import the GitHub repo and deploy. No environment variables or backend services are required for the current build, since all data is stored client-side.

---

## Privacy & data

| | |
|---|---|
| **Where data lives** | Your browser's IndexedDB, on your device only |
| **Network egress of health data** | None |
| **Third-party trackers** | None |
| **Export** | Full data export as versioned JSON (Settings → Export) |
| **Delete** | Irreversible local delete (Settings → Delete) |
| **App lock** | Optional passcode, stored as a SHA-256 hash |

End-to-end encrypted cross-device sync is a deliberate future step (see roadmap); today the privacy guarantee is simply that the data never leaves the device.

---

## Roadmap

Lumen is built phase by phase. Each phase has a design spec and an implementation plan in [`docs/superpowers/`](docs/superpowers/).

- ✅ **Phase 1 — Cycle tracking MVP**: logging, prediction engine, calendar, history, export/delete, PWA, passcode.
- ✅ **Phase 2A — Insights engine**: patterns, trends, anomalies, guidance.
- ⬜ **Phase 2B — Content library**: medically-reviewed articles + personalized feed.
- ⬜ **Phase 3 — Fertility / TTC**: BBT, LH, cervical-mucus logging, ovulation confirmation, partner sharing.
- ⬜ **Phase 4 — Pregnancy mode**: week-by-week, kick counter, compassionate loss flow.
- ⬜ **Phase 5 — Perimenopause & menopause**.
- ⬜ **Phase 6 — AI health assistant** (RAG over a vetted corpus, strict guardrails).
- ⬜ **Phase 7 — Community ("Circles")**, anonymous + moderated.
- ⬜ **Phase 8 — Native mobile + E2E-encrypted sync**.

See the full product vision in the [PRD](docs/superpowers/specs/2026-06-17-womens-health-app-prd.md).

---

## Documentation

- **Product Requirements** — [`docs/superpowers/specs/2026-06-17-womens-health-app-prd.md`](docs/superpowers/specs/2026-06-17-womens-health-app-prd.md)
- **Insights engine design** — [`docs/superpowers/specs/2026-06-17-insights-engine-design.md`](docs/superpowers/specs/2026-06-17-insights-engine-design.md)
- **Implementation plans** — [`docs/superpowers/plans/`](docs/superpowers/plans/)

---

## Status & disclaimer

Lumen is an in-progress personal project. It is **not a medical device** and makes no diagnostic or contraceptive-efficacy claims. Always consult a qualified clinician for health decisions. If you experience a medical emergency, contact your local emergency services.
