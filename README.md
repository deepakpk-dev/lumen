# Lumen

**A private, offline-first companion for the whole reproductive life cycle.**

Lumen is a women's-health app built around a simple promise: track your cycle, fertility, pregnancy, and postpartum recovery with accurate, *explainable* guidance — without your body ever becoming a data product. It runs as an installable Progressive Web App, stores **all** health data **on your device**, and ships with **no ads, no paywall, and no third-party tracking**. When you choose to sync across devices, it is **end-to-end encrypted** — the server only ever holds ciphertext it cannot read.

> ⚕️ **Not medical advice.** Lumen's predictions and insights are estimates derived from your own logged data. They are not a diagnosis, not a contraceptive method, and not a substitute for a clinician. In an emergency, contact your local emergency services.

**Status:** `v1.x` — shipped and in active development. 400+ tests passing · `build` + `lint` + typecheck green in CI.

**Live:**  https://lumen-pi-one.vercel.app/

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
  - [End-to-end encrypted sync](#end-to-end-encrypted-sync)
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

- **Local-first.** Health data lives in your browser's IndexedDB. Nothing is uploaded, leaked, or subpoenable unless *you* turn on sync.
- **Encrypted at rest (optional).** Set a passcode and your on-device records are stored as **AES-256-GCM ciphertext**, keyed by a recovery phrase the passcode unwraps. The passcode itself is never stored.
- **End-to-end encrypted sync (optional).** Turn on cross-device sync and your data is encrypted on-device *before* it leaves. The server is **blind** — your encryption key never reaches it, so it holds only ciphertext and opaque keys and can't tell which dates or life stages you have data for. (One honest caveat: the browser fetches that encryption code from the server each load — see [Trust boundary](#trust-boundary).)
- **No tracking SDKs.** The client bundle ships zero analytics, ad, or tracking code. There is no production telemetry by design.
- **You own your data.** One-tap full export (versioned JSON), and a real, irreversible delete that wipes the local store *and* the server copy.
- **Deterministic & explainable.** Every prediction and insight is computed from your own logs and cites the data it came from. No black-box model decides your forecast — there is no LLM anywhere in the product.
- **Compassion by design.** Pregnancy-loss and postpartum mental-health paths are first-class, not afterthoughts — no celebratory copy on a loss path, crisis-aware screening that surfaces support.

---

## Features

Lumen follows a person across every stage of reproductive life, switching modes as their needs change. Every stage shares the same logging surface, the same on-device store, and the same encryption / export / delete guarantees.

| Stage | What it does | Status |
|---|---|---|
| **Cycle tracking** | Daily logging, deterministic period/fertile/ovulation prediction with honest confidence, calendar, history & trends | ✅ Phase 1 |
| **Insights** | Explainable patterns, trends, anomaly nudges, and phase guidance from your own data | ✅ Phase 2A |
| **Content library** | Life-stage-spanning, medically-cited corpus (cycle, TTC, pregnancy, postpartum) with a personalized, deterministic feed scoped to the active stage | ✅ Phase 2B |
| **Courses / programs** | Ordered, stage-scoped guided reading paths over the article corpus, with local per-step progress | ✅ Phase 2C |
| **Fertility / TTC** | Opt-in trying-to-conceive mode: BBT, LH, cervical mucus, ovulation confirmation, BBT chart | ✅ Phase 3 |
| **Pregnancy** | Week-by-week, kick counter, contraction timer (5-1-1), compassionate birth/loss exit | ✅ Phase 4 |
| **Postpartum** | Mother-focused recovery tracking + EPDS mental-health screening with crisis support | ✅ Phase 5 |
| **Perimenopause** | Transition-years mode: stage-fit symptom logging (hot flashes, night sweats), softened predictions, fertile-window suppression, cited guidance | ✅ Phase 5b |
| **Encryption & sync** | Passcode-encrypted local vault + opt-in, end-to-end-encrypted, zero-knowledge cross-device sync | ✅ Phase 3 (sync) |

### Cross-cutting (all stages)
- Installable **PWA** with an offline app shell (service worker) and web manifest, real PNG/maskable icons.
- **Persistent storage** requested on bootstrap (`navigator.storage.persist()`) so the browser is less likely to evict your data, plus an in-app data-loss backup warning.
- Local data **export** (versioned JSON) and **hard delete** that also clears passcode, preferences, and any server-side sync copy.
- **Doctor summary** — a printable/PDF report generated locally for a clinician, no server round-trip.
- Configurable **reminders** (period, fertile window, daily logging) — in-app by default, with optional OS notifications you explicitly grant.
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

The app is **local-first**: open it, complete onboarding, and start logging. No accounts, no configuration, **no environment variables**, no backend required. (A `DATABASE_URL` is needed *only* if you want to run the optional sync server — see [Deployment](#deployment).)

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

### Content library & programs
A bundled, **medically-cited** article corpus (sources include NHS, ACOG, and the U.S. Office on Women's Health) spanning every shipped life stage — cycle, trying-to-conceive, pregnancy, and postpartum. A deterministic engine maps your current context → a personalized "For you" feed and a daily card on the home screen, **scoped to your active life stage** so a pregnant user sees pregnancy reads rather than period/PMS material. Browse, search, and filter by topic and phase; read articles in-app. **Programs** stitch articles into ordered, guided reading paths and track which steps you've completed.

### Fertility / TTC
An **opt-in** trying-to-conceive mode. Log basal body temperature (°C/°F), LH tests, cervical mucus, and intercourse. Lumen detects the thermal shift (3-over-6 rule), **confirms ovulation** by combining BBT + LH + mucus, estimates your real luteal length, and gives qualitative conception guidance — rendered with an inline BBT chart and a non-medical disclaimer.

### Pregnancy
Switch to pregnancy mode from a positive result or onboarding goal. Track gestational age, trimester, and countdown from EDD or LMP; read week-by-week content; count kicks; and time contractions with **5-1-1** guidance. The birth/loss exit flow is **compassionate by design** — the loss path carries no celebratory or period-prompt copy and suppresses re-engagement nudges.

### Postpartum
Mother-focused **recovery** tracking (not baby tracking): day/week/stage of recovery, lochia logging kept entirely separate from cycle stats, and the **Edinburgh Postnatal Depression Scale (EPDS)** check-in. Scoring is crisis-aware — a high-risk band (total ≥ 13) **or** any self-harm response surfaces a non-diagnostic crisis-support block. Returning to cycle/TTC is user-driven; Lumen makes no dishonest "cycle will return on X" prediction while breastfeeding.

### Encryption & cross-device sync
Two independent, opt-in privacy upgrades, both rooted in a single **12-word recovery phrase**:
- **Passcode lock** encrypts your on-device records at rest and gates the app behind a screen lock. Forget the passcode? Recover with your phrase.
- **Sync across devices** carries your full health record to another device (or restores it after clearing data). Everything is encrypted with your recovery phrase *before* it leaves the device; the server only ever stores ciphertext. Set it up on one device, then use "Restore from a backup" and your phrase on the next.

---

## For engineers — how it's built

### Architecture

Lumen is layered so the logic that matters most — the prediction, fertility, pregnancy, postpartum, insights, and content engines — is **pure, dependency-free TypeScript** that can be reasoned about and tested in isolation, with no React or IO in the way. Cryptography and sync are isolated in their own layers so the domain never touches keys or the network.

```
┌────────────────────────────────────────────────────────────┐
│  UI   app/* routes + src/components/*                        │  Next.js App Router, React 19, Tailwind v4
├────────────────────────────────────────────────────────────┤
│  State   src/state/useHealthData.tsx                         │  one hook: store ↔ domain, memoized derived state
├────────────────────────────────────────────────────────────┤
│  Domain   src/domain/* — PURE TS, the core IP                │
│    prediction.ts   cycle-stats.ts   calendar.ts   reminders   │
│    insights/       content/                                   │
│    fertility/      pregnancy/       postpartum/               │
│    dates.ts (timezone-safe ISODate)      types.ts             │
├────────────────────────────────────────────────────────────┤
│  Data   src/data/* (Dexie v6 / IndexedDB) + sync-engine      │  local-first, offline source of truth
│  Crypto src/crypto/* (keys · envelope · vault, WebCrypto)    │  at-rest + E2E encryption
│  Server src/server/* + app/api/sync/* (blind Postgres)       │  stores ciphertext only, opt-in
└────────────────────────────────────────────────────────────┘
```

The dependency rule points **inward**: UI depends on state, state depends on the domain, the domain depends on nothing. The domain layer imports no React, no crypto, and performs no IO, which is what makes it cheap to test exhaustively and safe to evolve.

### The domain core (the IP)

Each subsystem is a small set of independently testable pure functions:

- **`prediction.ts`** — a rolling statistical model. Computes average cycle length and variance from history, projects the next period, derives ovulation (≈14 days before the next period) and the fertile window, and attaches a `high` / `medium` / `low` confidence plus a human-readable explanation. Optionally accepts `ObservedFertility` (real luteal length + confirmed-ovulation override) from TTC mode; the default path is unchanged. No ML, no network.
- **`insights/`** — four generators (patterns, trends, anomalies, guidance) feed an aggregator that ranks results (attention-worthy first) and picks the single most relevant for the home screen.
- **`content/`** — `context → feed → daily`: turns the user's current context into a ranked article feed and one daily pick, over a bundled cited corpus; `content/programs/` tracks guided-path progress.
- **`fertility/`** — `units` (°C/°F), `bbt` (3-over-6 thermal shift), `confirmation` (BBT + LH + mucus → `OvulationConfirmation`), `luteal` (clamped 9–17 days), `guidance`, `journey` (TTC-cycle counting).
- **`pregnancy/`** — `gestation` (EDD↔LMP, age/trimester/countdown/progress), `weeks` (weekly content), `kicks`, `contractions` (duration/frequency + 5-1-1), `lifecycle` transitions.
- **`postpartum/`** — `recovery` (day/week/stage), **`epds`** (EPDS instrument + crisis-aware `scoreEpds` → total/band/`riskFlag`), `weeks` (1–12 recovery content), `lifecycle`.
- **`reminders.ts`** — decides which nudges (period / fertile / log-today) are actually due, so reminders only surface when relevant.

### Data layer & persistence

- **`src/data/db.ts`** — a Dexie database (`lumen-health`) at **schema version 6**, migrated additively:
  - **v1:** `cycles`, `dailyLogs`
  - **v2:** + `pregnancyProfile`, `kickSessions`, `contractionSessions`
  - **v3:** + `postpartumProfile`, `epdsEntries`
  - **v4:** + `programProgress` (per-course step completion)
  - **v5:** + `records` (encrypted envelope store, used when a passcode/vault is active)
  - **v6:** + `syncMeta` (dirty outbox + tombstones + last-write-wins clocks for sync)
- **`src/data/repository.ts`** — CRUD over those tables; the only place IndexedDB is touched. Writes also feed the sync outbox when tracking is on.
- **`src/data/storage.ts`** — the storage seam that reads/writes either the plaintext typed tables or the encrypted `records` store, depending on whether a vault is active.
- **`src/data/export.ts`** — a single **version-5** JSON export blob covering every table plus preferences, with matching hard-delete parity.
- **Notable model decision:** `DailyLog` carries optional fields per stage (`bbt`/`lh`/`mucus`/`intercourse`, and `lochia`). **Lochia is deliberately separate from `flow`** — postpartum bleeding never feeds cycle statistics or predictions and never creates a `Cycle`.

### Privacy as an architecture, not a setting

Privacy is enforced by the shape of the system, not by a promise:

- **Local-first by default.** With no passcode and no sync, health data lives only in this browser's IndexedDB — there is nothing to breach server-side because nothing leaves the device.
- **At-rest encryption via a vault** (`src/crypto/vault.ts`, `src/security/vault-store.ts`). Setting a **16+ character passphrase** creates a **BIP-39 12-word recovery phrase** and wraps it with **PBKDF2-SHA256 (210,000 iterations)** under the passphrase; the wrapped blob is inert without the passphrase, which is never stored (a wrong passphrase fails AES-GCM authentication rather than yielding garbage keys). With a vault active, records are stored as **AES-256-GCM ciphertext** in the `records` table — even at rest, the on-device store reveals nothing about which stores or dates hold data. The app is gated behind a passphrase screen (`PasscodeGate`) with auto-lock.
- **No analytics or error monitoring in production** — an intentional tradeoff (see below) that keeps the zero-tracking guarantee literal.
- **One root secret.** The same recovery phrase that unlocks the vault is the sync credential — there is no second place a root secret could live.

### End-to-end encrypted sync

Sync is **opt-in** and layered on top of the local-first store. The design is a **blind server**: it can order and locate records but never holds the key to read them.

**Key derivation** (`src/crypto/keys.ts`) — HKDF-SHA256 over the BIP-39 seed derives a full hierarchy:

| Value | Role | Leaves device? |
|---|---|---|
| `accountId` | Opaque public locator | Yes (opaque) |
| `authSecret` | Bearer secret proving ownership | Yes — but the server stores only its **SHA-256 hash** |
| `encKey` | AES-256-GCM, encrypts record contents | **Never** (non-extractable `CryptoKey`) |
| `keyMacKey` | HMAC-SHA-256, produces opaque record keys | **Never** (non-extractable `CryptoKey`) |

**Envelopes** (`src/crypto/envelope.ts`) — each record becomes `{ recordKey: HMAC(keyMacKey, "store:key"), iv, ciphertext: AES-GCM(payload), updatedAt, deleted }`. The real store, key, and value live *inside* the ciphertext; tombstones carry no value. Plaintext is padded to exponential size buckets before encryption, so ciphertext length leaks only `log2(size)` — a full pregnancy profile and a one-line log don't fingerprint by size. The server never learns which dates or life stages a user has data for.

**Client engine** (`src/data/sync-engine.ts`) — a dirty **outbox** and tombstones live in the `syncMeta` sidecar. `push` drains the outbox in server-cap-sized chunks and adopts the server's canonicalized clock; `pull` pages through everything after a per-account `lastSeq` high-water mark and applies each envelope under **last-write-wins** on `updatedAt`. Enable/restore/disable/delete flows are all handled here, and preferences (life stage, units, reminders) sync as one snapshot pseudo-record so a restore lands in the right mode.

**Server** (`app/api/sync/*`, `src/server/*`) — four Route Handlers: `register`, `push`, `pull`, `delete-account`. Auth is a `Bearer accountId:authSecret` header verified against the stored hash. Postgres stores accounts, encrypted records, and privacy-preserving registration rate buckets; the schema self-applies lazily and idempotently on first query. `push` bounds future client-clock skew, returns the accepted clocks, upserts with an LWW guard, and bumps a `server_seq` so other devices see the change on incremental pull.

**Enforced, not just claimed.** `src/data/sync-privacy.test.ts` runs in CI and **fails the build** if any plaintext health field is ever found in a request body — the enforcement half of the zero-knowledge guarantee.

#### Trust boundary

The blind-server guarantee holds against a **stolen database** and a **passive or subpoenaed operator**: the key is never uploaded, so stored ciphertext is unreadable. It does **not** by itself defend against a **malicious or compromised server**, because Lumen is a web app — the browser fetches the encryption code from the server on each load, and backdoored code could capture plaintext before it's encrypted. Non-extractable `CryptoKey`s don't close this: first-party code still handles the raw recovery phrase and can use the keys as an oracle. Closing it requires moving the crypto path off per-load server delivery — a store-distributed installed app (Capacitor/Tauri wrap of this build) is the planned path; a code-transparency log is the web-only alternative (detection rather than prevention). Until then, the honest claim is "encrypted against DB theft and a curious operator," not "even we can't read it."

### Testing strategy

The domain core is developed **test-first** (TDD). The suite (**400+ tests**, Vitest) covers date utilities, cycle statistics, the full prediction engine (including the TTC-observed path), every insights/content/fertility/pregnancy/postpartum module, the EPDS scoring bands and crisis flag, the **crypto layer** (key derivation, envelope round-trips, vault wrap/unlock), the **sync engine and blind-server API** (LWW, tombstones, incremental pull, the zero-knowledge wire check), the repository (against `fake-indexeddb`), export/delete, the `useHealthData` hook per stage, and UI components. **Playwright** covers full user flows in a real browser.

```bash
npm test                 # all unit tests
npm test -- prediction   # focused file/pattern
npm run test:watch       # watch mode
npm run test:e2e         # Playwright end-to-end
```

> ⚠️ **Repo convention:** this project pins **Next.js 16**, which has breaking changes versus older mental models. Per [`AGENTS.md`](AGENTS.md), read the bundled guides in `node_modules/next/dist/docs/` before writing Next.js code, and heed deprecation notices. (Dynamic routes here use `generateStaticParams`, and `params` is a Promise.)

### Project layout

```
app/                      # Next.js App Router routes
  page.tsx                #   home dashboard (stage-aware)
  onboarding/  log/  calendar/  history/  insights/
  library/  library/[slug]/                 # content reader
  programs/  programs/[slug]/                # guided reading paths
  fertility/                                 # TTC + BBT chart
  pregnancy/  pregnancy/kicks/  pregnancy/contractions/
  postpartum/  postpartum/checkin/           # recovery + EPDS
  settings/  privacy/  report/               # doctor summary
  api/sync/               #   register · push · pull · delete-account (blind server)
src/
  domain/                 # pure logic — no React/IO/crypto (the IP)
    dates.ts  cycle-stats.ts  prediction.ts  calendar.ts  reminders.ts  log-options.ts  types.ts
    insights/  content/  fertility/  pregnancy/  postpartum/
  data/                   # Dexie schema (v6), repository, storage seam, export, sync-engine
  crypto/                 # keys (HKDF) · envelope (AES-GCM/HMAC) · vault (PBKDF2) · encoding
  server/                 # sync-db (schema) · sync-auth — server-only
  security/               # passcode gate · vault-store (persisted wrapped vault)
  storage/                # persistent-storage request
  state/                  # useHealthData hook (store ↔ domain)
  components/             # presentational React components
  content/                # bundled cited article + program corpus
  settings/               # local preferences (+ sync snapshot)
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
| Local storage | [Dexie](https://dexie.org/) over IndexedDB (schema v6) |
| Cryptography | Web Crypto (`crypto.subtle`): AES-256-GCM, PBKDF2, HKDF, HMAC · [`@scure/bip39`](https://github.com/paulmillr/scure-bip39) recovery phrases |
| Sync backend | Next.js Route Handlers + [`pg`](https://node-postgres.com/) → **Postgres** (target host: [Neon](https://neon.tech/)) |
| Dates | native `Date` helpers (`src/domain/dates.ts`) with timezone-safe ISO date strings |
| Markdown | `react-markdown` + `remark-gfm` (content library) |
| Testing | [Vitest](https://vitest.dev/) + Testing Library + `fake-indexeddb` + `pglite`; [Playwright](https://playwright.dev/) e2e |
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
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run test:e2e:ui` | Playwright interactive UI mode |
| `npm run test:e2e:report` | Open the last Playwright HTML report |
| `npm run lint` | ESLint |

---

## Deployment

Lumen is a standard Next.js App Router app and deploys to **Vercel**. The app itself needs **zero configuration** — import the GitHub repo and deploy; all health data is stored client-side and works with no backend.

**Optional: enabling sync.** Cross-device, end-to-end-encrypted sync requires a Postgres database. Provision one (Neon via the Vercel Marketplace is the intended host) and set a single environment variable:

```
DATABASE_URL=postgres://…
```

No migration step is required — the schema self-applies on first query. With no `DATABASE_URL`, the `/api/sync/*` endpoints are simply unused and the app remains fully functional local-first. Because the server is blind, provisioning it grants **no** access to any user's health data.

---

## Roadmap

Built phase by phase; each phase has a design spec and implementation plan in [`docs/superpowers/`](docs/superpowers/).

- ✅ **Phase 1 — Cycle tracking MVP**: logging, prediction engine, calendar, history, export/delete, PWA, passcode.
- ✅ **Phase 2A — Insights engine**: patterns, trends, anomalies, guidance.
- ✅ **Phase 2B — Content library**: cited article corpus + personalized deterministic feed.
- ✅ **Phase 2C — Courses / programs**: ordered, stage-scoped guided reading paths with local per-step progress.
- ✅ **Phase 3 — Fertility / TTC**: BBT, LH, cervical mucus, ovulation confirmation, BBT chart.
- ✅ **Phase 3 (sync) — E2E-encrypted sync**: passcode-encrypted vault, blind Postgres server, client sync engine (outbox, tombstones, LWW), settings UI, zero-knowledge CI check. *Live in production (Neon Postgres).*
- ✅ **Phase 4 — Pregnancy**: week-by-week, kick counter, contraction timer, compassionate loss flow.
- ✅ **Phase 5 — Postpartum**: recovery tracking + EPDS mental-health screening.
- ✅ **Phase 5b — Perimenopause**: stage toggle + onboarding goal, vasomotor symptom logging, softened predictions with fertile-window suppression, and a cited content program.
- ⬜ **Phase 6 — AI health assistant** (RAG over a vetted corpus, strict guardrails).
- ⬜ **Phase 7 — Community ("Circles")**, anonymous + moderated.
- ⬜ **Phase 8 — Native mobile** + TTC partner sharing (reusing the API + prediction core).
- ✅ **v1.x — Region-aware crisis resources**: curated national helplines in the EPDS crisis block, selected from the device locale (never geolocation) with a manual override and a directory fallback.

---

## Design notes & conscious tradeoffs

These are shipped *knowingly* and documented so reviewers don't mistake them for oversights:

- **No analytics or error monitoring in production.** This is the price of the zero-tracking guarantee — there is intentionally no production error visibility. Revisit only with a privacy-preserving approach.
- **EPDS crisis helplines are a curated shortlist, not exhaustive.** Well-established national lines for a handful of regions (region from device locale, user-overridable), with [findahelpline.com](https://findahelpline.com) as the fallback everywhere else. Numbers live in `src/domain/postpartum/crisis-resources.ts` and need periodic review.
- **The local DB is only encrypted with a passcode.** Without a passcode, the on-device store is plaintext IndexedDB (the app-lock and at-rest encryption are the same opt-in). The Settings copy states this plainly.
- **Sync uses whole-snapshot LWW for preferences** — two devices editing different preferences within the same window can lose one side. Split into per-preference records if it ever bites.
- **Sync restore merges rather than replaces.** The app pulls the encrypted account before seeding local records, so unique data already on a device joins the account while normal LWW rules resolve conflicts.

---

## Documentation

- **Engineering design doc** — [`docs/ENGINEERING.md`](docs/ENGINEERING.md) — architecture, invariants, prediction math, and the sync/crypto design for engineers
- **Product Requirements (PRD)** — [`docs/superpowers/specs/2026-06-17-womens-health-app-prd.md`](docs/superpowers/specs/2026-06-17-womens-health-app-prd.md)
- **Insights engine design** — [`docs/superpowers/specs/2026-06-17-insights-engine-design.md`](docs/superpowers/specs/2026-06-17-insights-engine-design.md)
- **Pregnancy mode design** — [`docs/superpowers/specs/2026-06-21-pregnancy-mode-design.md`](docs/superpowers/specs/2026-06-21-pregnancy-mode-design.md)
- **Postpartum mode design** — [`docs/superpowers/specs/2026-06-23-postpartum-mode-design.md`](docs/superpowers/specs/2026-06-23-postpartum-mode-design.md)
- **Implementation plans** — [`docs/superpowers/plans/`](docs/superpowers/plans/)
- **User guide** — [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)

---

## License

[MIT](LICENSE). Lumen is an independent personal/portfolio project. It is **not a medical device** and makes no diagnostic or contraceptive-efficacy claims. Always consult a qualified clinician for health decisions; in an emergency, contact your local emergency services.
