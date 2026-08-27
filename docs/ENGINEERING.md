# Lumen — Engineering Design Document

**Audience:** a senior engineer joining or reviewing this codebase.
**Purpose:** explain how Lumen is built, the invariants that hold it together, the non-obvious decisions, and where to extend it — at a depth the [README](../README.md) intentionally stops short of.

Read the [README](../README.md) first for the product framing and the phase roadmap. This document assumes you know *what* Lumen is and focuses on *how* and *why*.

---

## 1. System in one paragraph

Lumen is a **local-first PWA**. The browser's IndexedDB (via Dexie) is the **source of truth** for all health data; the React tree is a pure projection of it. The high-value logic — prediction, fertility, pregnancy, postpartum, insights, content selection — is **pure, IO-free, framework-free TypeScript** in `src/domain`, so it is exhaustively unit-tested in isolation. Two orthogonal privacy features layer on top, both rooted in a single BIP-39 recovery phrase: an **at-rest encryption vault** (passcode-gated), and an **opt-in, end-to-end-encrypted, zero-knowledge sync** to a blind Postgres server that only ever stores ciphertext. There is **no LLM and no analytics** anywhere in the product.

---

## 2. Design principles (the non-negotiables)

These are load-bearing. Violating one is a design regression, not a style nit.

1. **The domain layer is pure.** `src/domain/**` imports no React, no Dexie, no crypto, no `fetch`, and touches no `Date.now()`-style ambient state except through injected `today`. If you need IO in a domain function, you're in the wrong layer.
2. **IndexedDB is the source of truth.** React state is a cache of it. Every mutation persists first, then re-reads (`refresh()`); the UI never holds authoritative state the DB doesn't have.
3. **Predictions are deterministic and explainable.** Same inputs → same output, always, with a human-readable `explanation`. No ML, no network, no LLM in the prediction path — ever.
4. **Privacy is structural, not a toggle.** The default (no passcode, no sync) means data physically cannot leave the device. Encryption and sync only ever *add* protection; they never open a plaintext egress. The zero-knowledge guarantee is enforced by a CI test, not a promise.
5. **One root secret.** The BIP-39 recovery phrase roots both the at-rest vault and the sync key hierarchy. There is deliberately no second place a root secret can live.
6. **Compassion is a requirement, not copy.** Loss/postpartum paths are first-class code paths (dedicated lifecycle transitions, suppressed nudges, crisis flags), not conditional styling.

---

## 3. Architecture & the dependency rule

```
┌──────────────────────────────────────────────────────────────┐
│  UI            app/* routes  ·  src/components/*               │  Next.js App Router, React 19, Tailwind v4
├──────────────────────────────────────────────────────────────┤
│  State         src/state/useHealthData.tsx                     │  one context: store ↔ domain, memoized derivations
├──────────────────────────────────────────────────────────────┤
│  Domain        src/domain/*  — PURE TS (the IP)                │  prediction · cycle-stats · insights · content
│                                                                 │  fertility · pregnancy · postpartum · reminders
├──────────────────────────────────────────────────────────────┤
│  Data          src/data/*  (Dexie v6 / IndexedDB)             │  repository · storage seam · export · sync-engine
│  Crypto        src/crypto/*  (Web Crypto)                     │  keys (HKDF) · envelope (AES-GCM/HMAC) · vault (PBKDF2)
│  Server        src/server/* + app/api/sync/*  (blind PG)      │  ciphertext-only, opt-in
└──────────────────────────────────────────────────────────────┘
```

Dependencies point **inward and downward**: UI → state → domain → (nothing). Data/Crypto/Server sit beside the domain, not above it — the domain never imports them. The state layer is the *only* place the domain meets IO: it loads records from the repository, hands plain data to domain functions, and stores derived values back into React.

This is why the domain is cheap to test and safe to change: a prediction-algorithm edit can't accidentally depend on IndexedDB, and a storage change can't silently alter a forecast.

---

## 4. The domain core

Every subsystem is a set of small pure functions. Highlights and the parts that surprise people:

### 4.1 Cycle statistics — `src/domain/cycle-stats.ts`

Given `Cycle[]` (each has a `startDate`, optionally `endDate`):

- **Cycle lengths** = day-diffs between *consecutive sorted start dates*. So *N* recorded cycles yield *N−1* lengths. This is why `CycleStats.cycleCount` (number of lengths) differs from `inputCycleCount` (number of `Cycle` rows) — a distinction the confidence logic leans on.
- **Period lengths** = `endDate − startDate + 1`, only for cycles that have an `endDate`.
- **Averages** round to integers; fall back to `DEFAULT_CYCLE_LENGTH` (28) / `DEFAULT_PERIOD_LENGTH` (5) when there's no data.
- **`cycleLengthStdDev`** is the **population** standard deviation (÷N), fixed to 2 decimals, and `0` when fewer than 2 lengths exist.
- **`isRegular`** = at least 2 lengths **and** `stdDev ≤ REGULARITY_STDDEV_THRESHOLD` (3 days).

### 4.2 Prediction — `src/domain/prediction.ts`

`generatePrediction(cycles, observed?)` returns `null` for zero cycles, else:

| Output | Formula |
|---|---|
| `nextPeriodStart` | `lastStart + averageCycleLength` |
| `nextPeriodStartRange` | `nextPeriodStart ± margin`, where `margin = max(1, round(stdDev))` |
| `ovulationDate` | `observed.currentCycleOvulation.ovulationDate` **if present**, else `nextPeriodStart − luteal` |
| `fertileWindow` | `[ovulationDate − 5, ovulationDate + 1]` |
| `predictedPeriodLength` | `averagePeriodLength` |
| `confidence` | see below |
| `explanation` | human-readable, notes when refined by logged signals |

`luteal` defaults to `LUTEAL_PHASE_LENGTH` (14) but is overridden by `observed.lutealLength` (from TTC mode). **Confidence** (`predictionConfidence`):

- `cycleCount ≥ 3 && isRegular` → **high**
- `cycleCount === 0` (only a single period logged, no full cycle measured) → **low**
- `inputCycleCount ≥ 3 && !isRegular` → **low**
- otherwise → **medium**

The whole point is *honest uncertainty*: irregular histories widen the range and drop confidence rather than inventing precision.

**`getCyclePhase(cycleDay, stats)`** derives the phase from `ovulationDay = averageCycleLength − 14`: menstrual (`day ≤ averagePeriodLength`), ovulation (`within ±1 of ovulationDay`), follicular (before), luteal (after).

### 4.3 The TTC "observed fertility" path

TTC mode feeds real signals back into the generic engine via the optional `ObservedFertility` argument — a clean seam that leaves the default path byte-for-byte unchanged:

- `src/domain/fertility/bbt.ts` — biphasic thermal-shift detection (3-over-6 rule).
- `src/domain/fertility/confirmation.ts` — combines BBT shift + LH + mucus into an `OvulationConfirmation` (`ovulationDate`, method, confidence).
- `src/domain/fertility/luteal.ts` — estimates real luteal length from confirmed cycles, clamped to 9–17 days.

`useHealthData` computes these only in TTC mode and passes them to `generatePrediction`.

### 4.4 Insights — `src/domain/insights/*`

Four independent generators (`patterns`, `trends`, `anomalies`, `guidance`) each return `[]` when there isn't enough data (so the UI never shows a weak insight). An aggregator ranks them (attention-worthy first) and `topInsight` picks one for the home screen. Anomalies are non-alarmist and educational.

### 4.5 Content — `src/domain/content/*`

`context → feed → daily`: `deriveContentContext(state, lifeStage)` builds the user's current context, `buildContentFeed(ARTICLES, context)` scores the bundled corpus, `selectDailyContent(feed, today)` picks the daily card. The feed is **scoped to the active life stage**, which is why a pregnant user never sees PMS material. `content/programs/` computes guided-path progress from `ProgramProgress` rows.

### 4.6 Pregnancy & postpartum

`pregnancy/gestation.ts` converts between EDD and LMP and derives age/trimester/countdown/progress. `postpartum/epds.ts` implements the Edinburgh Postnatal Depression Scale: `scoreEpds(responses)` → `{ total, band, riskFlag }`, where a **high band (≥13) or any non-zero self-harm answer** raises the crisis flag. Both stages have explicit `lifecycle.ts` transition helpers (start/edit/end) that the state layer calls — the *only* legitimate ways to move a profile between statuses.

---

## 5. Reactive layer — `src/state/useHealthData.tsx`

A single React context (`HealthDataProvider` in `app/layout.tsx`) exposes all health data and every mutation. Consumers call `useHealthData()`. Key mechanics:

- **Reload-everything-on-write.** Every mutation persists via the repository, then calls `refresh()`, which re-loads *all eight stores* with one `Promise.all` and recomputes derived state. This is deliberately simple and correct; the personal-data scale (dozens of cycles, hundreds of logs) makes the cost irrelevant. **Ceiling:** if a single account's data ever grew large, this becomes the first thing to make incremental. It is not a bug — it's a chosen simplicity.
- **Reactive `today`.** Nearly every derivation keys off `today` (an `ISODate` in state, not a fresh `todayISO()` per render). A timer rolls it at local midnight (+1s cushion) and re-checks on `visibilitychange`/`focus`, because a backgrounded PWA's timer may not fire. Without this, an app left open overnight would show yesterday until a manual reload.
- **Derivations are memoized** off `{cycles, dailyLogs, stats, prediction, today, lifeStage, …}`. `stats → prediction → insights/content/conception` form a clean derivation chain; TTC's `observed` slots into `prediction`.
- **`refresh()` vs `refreshSettings()`.** `refresh()` reloads DB records; `refreshSettings()` re-reads localStorage preferences (life stage, BBT unit, TTC start). Life-stage-changing mutations call both — writing the preference alone leaves the live context stale.
- **Life-stage transitions live here.** `completeOnboarding`, `startPregnancyMode`, `endPregnancyBirth`, `endPregnancyLoss`, `endPostpartumMode` are the transition surface; they call the domain `lifecycle` helpers, set the life-stage preference, and refresh. `completeOnboarding` defensively clears any carried-over pregnancy/postpartum profile because the provider outlives navigation and the onboarding route has no guard.

---

## 6. Data & persistence — `src/data/*`

### 6.1 Dexie schema — `db.ts`

Database `lumen-health`, **version 6**, migrated additively (never destructively):

| Version | Adds |
|---|---|
| v1 | `cycles`, `dailyLogs` |
| v2 | `pregnancyProfile`, `kickSessions`, `contractionSessions` |
| v3 | `postpartumProfile`, `epdsEntries` |
| v4 | `programProgress` |
| v5 | `records` — encrypted envelope store (used only when a vault is active) |
| v6 | `syncMeta` — dirty outbox + tombstones + LWW clocks |

The eight typed tables above `records`/`syncMeta` are the plaintext stores. **Adding a store is a new `version(n).stores({...})` block** carrying all prior tables forward — see the existing chain.

### 6.2 The storage seam — `storage.ts` (the clever part)

`repository.ts` never touches Dexie directly for syncable records. It routes every read/write through generic primitives in `storage.ts` that transparently do one of two things based on module-level session keys:

- **No session keys (default):** read/write the original typed table in plaintext. Nothing changed from a pre-encryption Lumen.
- **Session keys set (vault unlocked):** read/write a single opaque `records` table where **both** the store name and the record key are HMACs (`recordKey = HMAC(keyMacKey, "store:key")`, `storeKey = HMAC(keyMacKey, "__store__:store")`), and the value is AES-GCM ciphertext. At rest, nothing reveals which dates/ids/stages hold data.

Two independent module-level key holders:

- `session` (set via `setStorageKeys`) — drives **at-rest encryption** (which table, plaintext vs. ciphertext).
- `tracking` (set via `setSyncTracking`) — drives the **sync outbox**: when set, every write/delete *also* drops a ready-to-push envelope into `syncMeta` marked `dirty`.

When both are on they hold the *same* `DerivedKeys` (one recovery phrase), so the envelope built for the encrypted store is reused verbatim for the outbox. `putRecordRaw`/`deleteRecordRaw` are the **untracked** variants the sync engine uses when applying remote records, so a pull can never re-dirty its own outbox. `clearStore` under tracking issues per-record deletes so each leaves a tombstone for other devices.

### 6.3 Export — `export.ts`

`buildExportBlob(...)` produces a single **version-5** JSON blob covering every table **plus the preferences snapshot** (life stage, units, reminders). Delete has parity. The preferences inclusion matters: without it, restoring a pregnancy/postpartum backup would land in the default `cycle` stage and the restored profile would be invisible.

---

## 7. Security — the at-rest vault

`src/crypto/vault.ts` + `src/security/vault-store.ts`.

- Setting a 16+ character passphrase creates a vault: generate a fresh **BIP-39 12-word phrase**, wrap it under the passphrase with **PBKDF2-SHA256, 210,000 iterations** (the stored iteration count is re-read on unlock so old vaults keep working), AES-256-GCM. Existing shorter passcodes still unlock, but new and re-wrapped vaults enforce the stronger minimum.
- The wrapped blob (`WrappedVault`) is persisted in the clear in localStorage (`lumen.vault`) — it's **inert without the passcode**. A wrong passcode fails AES-GCM authentication (the only signal, since the passcode is never stored) rather than yielding garbage keys.
- Unlock decrypts the phrase, derives the full key hierarchy (§8), and installs `session` keys via `setStorageKeys`, at which point the `records` table becomes the live store.
- `restoreVault` / `rewrapVault` handle recovery-from-phrase and change-passcode; `restoreVault` validates the phrase first so a typo can't create a vault whose keys silently mismatch the data.
- `PasscodeGate` (in `app/layout.tsx`) is the screen lock / auto-lock in front of the app.

**Consequence:** enabling sync requires an unlocked vault, because sync reuses the same derived keys.

---

## 8. Sync — end-to-end encrypted, zero-knowledge

Opt-in, layered on the local-first store. The server is **blind**: it can locate and order records, never read them.

### 8.1 Key derivation — `src/crypto/keys.ts`

HKDF-SHA256 over the BIP-39 seed (fixed public app salt; domain-separated `info` labels) derives:

| Value | Type | Role | Leaves device? |
|---|---|---|---|
| `accountId` | 128-bit hex | opaque public locator | yes (opaque) |
| `authSecret` | 256-bit hex | bearer secret proving ownership | yes — server stores only its **SHA-256** |
| `encKey` | AES-256-GCM `CryptoKey` | encrypts record contents | **never** (non-extractable) |
| `keyMacKey` | HMAC-SHA-256 `CryptoKey` | derives opaque record keys | **never** (non-extractable) |

`authHash(authSecret)` = SHA-256, is what the server persists — a DB dump cannot be replayed as credentials.

### 8.2 Envelope — `src/crypto/envelope.ts`

Wire/at-rest shape:

```ts
interface SyncEnvelope {
  recordKey: string;   // HMAC(keyMacKey, `${store}:${key}`) as hex — stable per phrase
  iv: string;          // base64, random 96-bit per write
  ciphertext: string;  // base64 AES-256-GCM of JSON { store, key, value }
  updatedAt: string;   // ISO timestamp — the LWW clock
  deleted: boolean;    // tombstone (value is null inside the ciphertext)
}
```

The real `store`, `key`, and `value` live **inside** the ciphertext. The server never learns which dates or life stages a user has. `recordKey` is deterministic for a given phrase, so the same logical record lands on the same server row across devices.

### 8.3 Client engine — `src/data/sync-engine.ts`

- **Outbox:** the `syncMeta` table holds full envelopes with a `dirty` flag. Every tracked write/delete queues one. `notifyOutboxChanged()` lets `SyncRunner` push soon after a write.
- **`push`:** drains dirty rows in `PUSH_CHUNK` (500)-sized batches. A row's `dirty` clears **only if its `updatedAt` is unchanged** since it was read — so a write that lands mid-push stays queued for the next round.
- **`pull`:** pages by a per-account `lastSeq` high-water mark (stored per `accountId` so restoring a different phrase can't skip history). Applies each envelope under LWW: `applyRemote` skips when local `updatedAt ≥ remote`; otherwise decrypts and writes via the **untracked** `putRecordRaw`/`deleteRecordRaw` (or `importPreferences(..., notify=false)` for the prefs pseudo-record), then records the envelope's clock so LWW stays correct even for unknown stores from a newer app version.
- **`syncNow` = push then pull.** Runs on app open / tab focus (`SyncRunner`) and on "Sync now".

**Preferences** sync as a single `prefs/v1` snapshot pseudo-record. (Known tradeoff — see §10.)

### 8.4 Flows (order matters)

- **`enableSync`:** register → start tracking → **pull first** → seed outbox with all existing records → push. Pulling before seeding means a *second* device merges remote state in before pushing, instead of clobbering it with fresh-clock copies.
- **`restoreSync`:** register → start tracking → **pull first** → seed outbox → push. Pulling first preserves the account's LWW state, then unique local records are added to the encrypted account.
- **`disableSync`:** optionally delete the server copy, stop tracking, clear `syncMeta` and flags. Local data untouched.
- **`deleteAccount`:** server half of "delete all data" — wipes the account's rows and record.

### 8.5 Server — `app/api/sync/*` + `src/server/*`

Four Route Handlers. Auth is `Authorization: Bearer <accountId>:<authSecret>` (`/^Bearer ([0-9a-f]{32}):([0-9a-f]{64})$/`), verified against the stored hash with `timingSafeEqual`.

- **`register`** — idempotent account create (`accountId`, `authHash`), protected by database-backed per-client and global hourly registration budgets. Client IPs are HMACed before persistence.
- **`push`** — validates each envelope at the trust boundary (hex/base64/length caps: `MAX_RECORDS` 500, `MAX_CIPHERTEXT_CHARS` 90k), clamps clocks more than five minutes in the future, returns the canonical clocks to the sender, then upserts with an **LWW guard**: `... on conflict do update ... where excluded.updated_at > sync_records.updated_at`, bumping `server_seq` so other devices see the change on incremental pull. One statement per record, no transaction — LWW upserts are idempotent and the client only clears `dirty` on a 200, so a partial failure is a harmless re-push.
- **`pull`** — `select ... where account_id = $1 and server_seq > $2 order by server_seq asc limit 1000`, returning `{ records, since, more }`.
- **`delete-account`** — hard delete.

Schema (`sync-db.ts`) is two tables (`sync_accounts`, `sync_records`) applied **lazily and idempotently on first query** — no migration step while the schema is this small. Connection is one pooled `pg` client per serverless instance via `DATABASE_URL`.

### 8.6 The zero-knowledge guarantee is tested

`src/data/sync-privacy.test.ts` runs in CI (`.github/workflows/ci.yml`) and **fails the build** if any plaintext health field appears in a sync request body. This is the enforcement half of the design — treat it as a tripwire, not a formality.

---

## 9. Data model reference

| Entity | Store / key | Notes |
|---|---|---|
| `Cycle` | `cycles` / `id` | `startDate` = day 1; optional `endDate`. |
| `DailyLog` | `dailyLogs` / `date` | flow, symptoms[], moods[], notes; TTC fields (`bbt`/`lh`/`mucus`/`intercourse`); **`lochia` kept separate from `flow`** so postpartum bleeding never feeds cycle stats or creates a `Cycle`. |
| `PregnancyProfile` | `pregnancyProfile` / `'current'` | singleton; `status` active/ended, `endReason` birth/loss. |
| `KickSession`, `ContractionSession` | `kickSessions`/`contractionSessions` / `id` | pregnancy tools. |
| `PostpartumProfile` | `postpartumProfile` / `'current'` | singleton; `breastfeeding` is content-only, **never a prediction input**. |
| `EpdsEntry` | `epdsEntries` / `id` | raw responses + `total` + `band`. |
| `ProgramProgress` | `programProgress` / `programSlug` | only progress is persisted; program *definitions* are bundled content. |

Preferences (life stage, BBT unit, TTC start date, reminders) live in **localStorage**, not Dexie, and are snapshotted into export/sync separately.

---

## 10. Known limitations & deliberate tradeoffs

Search the codebase for `ponytail:` comments — each names a shortcut and its upgrade path. The load-bearing ones:

- **No production analytics or error monitoring.** The price of the literal zero-tracking guarantee. There is intentionally no server-side error visibility.
- **Preferences sync as a whole snapshot (LWW).** Two devices editing *different* preferences in the same window lose one side. Split into per-preference records if it bites.
- **`refresh()` reloads all stores on every write.** Correct and simple; the first thing to make incremental if a single account's data ever grows large.
- **EPDS crisis helplines are a curated shortlist** (`src/domain/postpartum/crisis-resources.ts`) — region from the device locale only (privacy: no geolocation), manual override, findahelpline.com fallback for unlisted regions. Numbers need periodic review.
- **Perimenopause mode suppresses fertility UI by design** — no fertile-window display, calendar markers, or reminders in the `menopause` stage (erratic ovulation makes them imply false precision and risks contraceptive misreading); period prediction stays, with its normal confidence machinery. The `/report` doctor summary stays factual and unfiltered.
- **No transaction around multi-record server push** — intentional; see §8.5.

---

## 11. Testing

- **Unit (`npm test`, Vitest):** ~400 tests, the bulk of the codebase. Domain logic, the crypto layer (key derivation, envelope round-trips, vault wrap/unlock), the sync engine and blind-server API (LWW, tombstones, incremental pull, the zero-knowledge check), the repository (against `fake-indexeddb`), `useHealthData` per stage, and components. Server logic tests use `pglite` as a Postgres stand-in. Test files are co-located `*.test.ts(x)`.
- **E2E (`npm run test:e2e`, Playwright):** full flows in a real browser.
- **CI:** lint → typecheck (`tsc --noEmit`) → unit suite on every push/PR to `main`; a separate workflow runs e2e.
- **Local gotchas** (from experience on slower machines): check for a stale dev server on **port 3000** before an e2e run; retry a flaky e2e file in isolation before diagnosing.

```bash
npm test                 # all unit tests
npm test -- prediction   # focused file/pattern
npm run test:e2e         # end-to-end
```

---

## 12. Operations & deployment

- Standard Next.js App Router app on **Vercel**; deploys from `main`.
- **The app needs zero configuration** — it's fully functional local-first with no backend.
- **Sync requires one env var:** `DATABASE_URL` (Postgres; Neon via the Vercel Marketplace is the intended host). No migration step — schema self-applies on first query. With no `DATABASE_URL`, `/api/sync/*` is simply unused. Provisioning the DB grants **no** access to health data (the server is blind).
- **PWA:** `public/sw.js` service worker + `app/manifest.ts`; `navigator.storage.persist()` is requested on bootstrap to reduce eviction risk. Note the standalone-PWA viewport handling (`viewportFit: cover` + safe-area insets) in `app/layout.tsx`.
- **Next.js caveat:** this repo pins a build of Next.js 16 whose conventions differ from upstream mental models — read `node_modules/next/dist/docs/` before framework-level changes (per `AGENTS.md`). Dynamic routes use `generateStaticParams`; `params` is a `Promise`.

---

## 13. Extension guide

**Add a new synced store:**
1. Add the entity type to `src/domain/types.ts`.
2. Add a Dexie `version(7)` block in `db.ts` carrying all prior tables forward + the new one.
3. Add repository CRUD in `repository.ts` routing through the `storage.ts` primitives (not raw Dexie) so encryption + sync tracking come for free.
4. Register the store in `STORE_KEYS` in `sync-engine.ts` with its key field.
5. Include it in `buildExportBlob` / delete for parity.
6. Wire it into `useHealthData` (`refresh()` load + any derivations).

**Add a life-stage mode:** add the value to `LifeStage`, a `lifecycle.ts` with explicit transitions, derivations + a home card branch in `useHealthData`/`app/page.tsx`, content scoped by the feed, and a settings control. Model the loss/compassion path as a real transition if applicable.

**Add an insight or content:** drop a pure generator into `src/domain/insights/*` (return `[]` when data is thin) and register it in the aggregator; or add a bundled article to `src/content/` with correct life-stage/phase tags and citations.

**Change the prediction model:** it's all in `prediction.ts` + `cycle-stats.ts`. Keep the `explanation` honest and the `ObservedFertility` seam intact, and update the extensive prediction tests.

---

## 14. Glossary

- **Blind server / zero-knowledge sync** — the server stores ciphertext and opaque HMAC keys only; it cannot read health data or infer which dates/stages exist.
- **Envelope** — the encrypted unit of sync/at-rest storage (`SyncEnvelope`).
- **LWW** — last-write-wins conflict resolution on `updatedAt`, enforced on both client and server.
- **Vault** — the passcode-wrapped recovery phrase enabling at-rest encryption.
- **Observed fertility** — real TTC signals (luteal length, confirmed ovulation) fed into the generic prediction engine.
- **`ponytail:` comment** — a deliberately-marked simplification with a named upgrade path.

---

*Keep this document honest. If you change an invariant in §2, a formula in §4, or a sync flow in §8, update the corresponding section in the same PR.*
