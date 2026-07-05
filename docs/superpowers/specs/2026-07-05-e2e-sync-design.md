# End-to-End Encrypted Sync — Design

**Date:** 2026-07-05
**Status:** Draft for review (pre-implementation)
**Phase:** 3 (the one big architectural bet from the competitor analysis)

## Summary

Optional, opt-in **zero-knowledge sync** so a user can carry their Lumen data to
a new phone or browser without ever handing readable health data to a server.
The device holds the keys; the server stores **ciphertext it cannot decrypt**,
keyed by **opaque identifiers it cannot reverse**. This removes the single
biggest weakness of the local-first model — *"switch phones and your data is
gone"* — without spending the privacy moat that makes Lumen worth using.

Default stays **local-only**. Sync is a toggle in Settings, off until the user
turns it on and saves a recovery phrase. It is the realisation of the PRD's
"Anonymous Mode" and the prerequisite for future partner sharing.

## Goals

- Cross-device continuity: restore all health data on a new device from a
  recovery phrase.
- **Zero-knowledge:** a compromised, subpoenaed, or malicious server yields only
  ciphertext and opaque keys — no period dates, life stage, symptoms, or even
  *which dates have data*. This is the post-*Dobbs* guarantee, made structural.
- No account, no email, no password. A **recovery phrase** is the only credential.
- Reuse existing patterns: WebCrypto (no hand-rolled crypto), Dexie local store as
  source of truth, `useHealthData` for reactive UI, hard delete that really deletes.
- Correct multi-device merge (edit day 3 on your phone, day 4 on your laptop → both
  survive).

## Non-goals (YAGNI)

- **Partner sharing** — built *on* sync later, not now.
- Real-time / live collaboration; CRDTs or operational transform (single-user data
  → per-record last-write-wins is sufficient).
- Email/password or OAuth accounts; server-side key escrow / account recovery
  (would break zero-knowledge — losing the phrase means losing synced data, stated
  plainly).
- Server-side search, analytics, or any plaintext processing.
- Selective/partial sync, multi-profile, key rotation, sharing between accounts.
- Background delivery guarantees — sync runs on app open and on demand (same
  serverless-PWA ceiling as reminders).

## Locked design decisions

1. **Opt-in, local-first stays default.** No behaviour changes for users who never
   enable sync; the pure-local moat is preserved.
2. **Zero-knowledge, always.** Plaintext never leaves the device. No mode, flag, or
   "convenience" path uploads readable data. Enforced by CI (no plaintext health
   field in any request body).
3. **Recovery phrase is the root secret.** A BIP39 mnemonic is the *only* thing that
   can decrypt synced data. The server never sees it.
4. **Opaque record keys.** The server sees HMAC'd keys, never `dailyLogs:2026-07-01`
   — so it can't learn dates, store names, or life stage from the key space.
5. **Per-record last-write-wins.** Simple, correct for single-user multi-device. No
   CRDT.

---

## 1. Key hierarchy

All keys derive from the recovery phrase; only the phrase (and keys derived on
device) can read data.

```
recovery phrase (BIP39, 12 words, 128-bit entropy)
        │  @scure/bip39: mnemonicToSeed  (PBKDF2-HMAC-SHA512, per BIP39)
        ▼
    root seed (64 bytes)
        │  HKDF-SHA-256, distinct `info` labels
        ├── accountId   = HKDF(seed, "lumen/account-id/v1")   → base32, PUBLIC locator
        ├── authSecret  = HKDF(seed, "lumen/auth/v1")         → bearer secret, proves ownership
        ├── encKey      = HKDF(seed, "lumen/enc/v1")          → AES-256-GCM, NEVER leaves device
        └── keyMacKey   = HKDF(seed, "lumen/keymac/v1")       → HMAC-SHA-256 for opaque record keys
```

- **Primitives:** WebCrypto only for HKDF / AES-GCM / HMAC. Mnemonic generation +
  seed derivation via **`@scure/bip39`** and **`@noble/hashes`** (audited,
  dependency-light, by paulmillr). *ponytail: do not hand-roll mnemonic/checksum
  or KDF — this is the one place "write less code" loses to "be correct on the
  edge cases". Two small audited deps, not a custom wordlist.*
- **Why the phrase, not a password:** 128 bits of real entropy sidesteps the weak
  human-password problem, so BIP39's PBKDF2 seed derivation is adequate.
  *ponytail: PBKDF2 (via @scure) now; Argon2id only if a future threat model wants
  brute-force hardening on a shorter/user-chosen passphrase.*

## 2. What syncs

| Source | Syncs? | Notes |
|---|---|---|
| `cycles`, `dailyLogs`, `pregnancyProfile`, `kickSessions`, `contractionSessions`, `postpartumProfile`, `epdsEntries`, `programProgress` | ✅ | The 8 IndexedDB stores — the health record |
| prefs: `lifeStage`, `bbtUnit`, `ttcStartDate`, `reminders` | ✅ | Small; synced as pseudo-records |
| passcode (`PasscodeControls`) | ❌ | Device-level gate, deliberately not portable |
| `lumen.notify.fired` | ❌ | Ephemeral per-day dedupe |

Each syncable item maps to one **record** identified by `store:key`
(e.g. `cycles:<uuid>`, `dailyLogs:2026-07-01`, `pref:reminders`).

## 3. Record envelope & sync metadata

Domain types stay clean. Sync wraps each record in an envelope. The plaintext is
the existing domain object, JSON-serialised.

```ts
// Plaintext (never sent): { store, key, value }  — value = the domain object
// On the wire / at rest on the server:
interface SyncEnvelope {
  recordKey: string;   // HMAC-SHA256(keyMacKey, `${store}:${key}`) → hex. Opaque.
  iv: string;          // base64, random 96-bit per write
  ciphertext: string;  // base64 AES-256-GCM( encKey, iv, plaintext )
  updatedAt: string;   // ISO timestamp, device clock — the LWW clock
  deleted: boolean;    // tombstone
}
```

Local bookkeeping needs `updatedAt`/`deleted` too. Rather than pollute every
domain type, add one Dexie sidecar table:

```ts
// db.version(5): syncMeta: 'recordKey'  (recordKey = `${store}:${key}`, PLAINTEXT locally)
interface SyncMetaRow { recordKey: string; updatedAt: string; deleted: boolean; dirty: boolean; }
```

- Every write through the repository bumps the row's `updatedAt = now`, sets
  `dirty = true`. `dirty` is the outbox: records needing push.
- Deletes set `deleted = true` (kept as a tombstone) instead of vanishing.

*ponytail: no new field on Cycle/DailyLog/etc.; one sidecar table + a thin write
wrapper. Repository already funnels every write through a handful of `put`/`clear`
functions — hook there, one place.*

## 4. Server

Minimal, dumb, blind. Postgres (Neon via Vercel Marketplace, per PRD §15).

```sql
create table sync_records (
  account_id  text        not null,   -- opaque, from HKDF
  record_key  text        not null,   -- opaque, HMAC'd
  iv          text        not null,
  ciphertext  text        not null,
  updated_at  timestamptz not null,   -- client LWW clock (informational to server)
  deleted     boolean     not null default false,
  server_seq  bigserial,              -- server-assigned ordering for incremental pull
  primary key (account_id, record_key)
);
create index on sync_records (account_id, server_seq);

create table sync_accounts (
  account_id   text primary key,
  auth_hash    text not null,          -- SHA-256(authSecret); server can't derive authSecret back
  created_at   timestamptz default now()
);
```

**Endpoints** (Vercel Fluid Compute functions):

- `POST /api/sync/register` — `{ accountId, authHash }`. Idempotent create.
- `POST /api/sync/pull` — `{ since }` (last `server_seq` seen) → rows with
  `server_seq > since`, ascending. Returns new high-water `server_seq`.
- `POST /api/sync/push` — `{ records: SyncEnvelope[] }`. Upsert per `record_key`
  with **LWW guard**: reject/skip an incoming row whose `updated_at` ≤ the stored
  one (last writer wins, older writes can't clobber newer). Assigns fresh
  `server_seq`.
- `POST /api/sync/delete-account` — wipes all `sync_records` + `sync_accounts` for
  the account. This is the server side of "Delete all data".

**Auth:** `Authorization: Bearer <accountId>:<authSecret>`; server compares
`SHA-256(authSecret)` to `auth_hash`. The server can locate and overwrite only
what a caller proves the phrase for; it still can't *read* anything.
*ponytail: bearer secret over TLS for MVP; upgrade path is HMAC-signed request
bodies if replay/MITM hardening is wanted.*

## 5. Sync engine (client)

Source of truth is always the local Dexie DB. Sync reconciles, never overrides
the local UX flow.

**Push** (dirty → server): collect `syncMeta` rows where `dirty`, encrypt each
(re-read plaintext from its store, or send tombstone), `POST /push`, clear
`dirty` on success.

**Pull** (server → local): `POST /pull { since: lastSeq }`. For each envelope:
1. Decrypt with `encKey`; recover `{ store, key, value }`.
2. Compare `updatedAt` to local `syncMeta`. **Apply only if remote is newer**
   (LWW). Ties broken deterministically by `recordKey` hash.
3. If newer: write `value` into its Dexie store (or delete on tombstone), update
   `syncMeta` (`dirty = false`).
4. Persist new `lastSeq`.
Then `refresh()` the `useHealthData` context so the UI reflects merged data.

**When it runs:** on app open (if enabled), after local writes (debounced), and a
manual "Sync now". *Same ceiling as notifications — a serverless PWA can't
guarantee background sync; Periodic Background Sync is best-effort only.*

**Clock skew:** `updatedAt` is a device clock, so LWW can mis-order across badly
skewed devices. Accepted for single-user data; `server_seq` still gives a stable
pull order. Documented, not solved. *ponytail: a Lamport/logical clock is the
upgrade if skew ever bites; not worth it now.*

## 6. UX flows

**Enable sync (first device):**
Settings → "Sync across devices" → generate 12-word phrase → **force save/confirm**
(re-enter a couple of words) → `register` → initial full push. Copy is explicit:
*"This phrase is the only key to your data. We can't recover it. Anyone with it can
read your data. Write it down and keep it safe."*

**Restore (new device):** onboarding/settings → "I have a recovery phrase" → enter
12 words → derive keys → full pull → decrypt → populate Dexie → land on Home.

**Disable sync:** stop syncing; offer *"also delete my data from the server"*
(`delete-account`). Local data untouched.

**Delete all data:** existing local wipe **plus** `delete-account` when sync is on,
so the hard-delete promise holds server-side too.

**Passcode** stays an independent local gate (unchanged).

## 7. Threat model

| Adversary | Gets | Protected? |
|---|---|---|
| Server operator / subpoena / breach | Ciphertext, opaque account + record keys, row counts, timestamps | ✅ No health content, no dates, no life stage. The core promise. |
| Network (MITM) | TLS-encrypted traffic | ✅ TLS; upgrade to signed requests available |
| Lost device | Local Dexie (unencrypted at rest today) | ⚠️ Passcode is an app gate, not encryption — unchanged, pre-existing limitation, called out in-app |
| Lost recovery phrase | — | ❌ By design: synced data unrecoverable (zero-knowledge tradeoff, stated plainly) |
| Malicious server | Can withhold/delete rows (availability) | ⚠️ Can't forge readable data the client trusts; can't decrypt. Availability, not confidentiality. |

**Residual metadata leak:** the server learns *how many* records exist, their
sizes, and write timestamps — not their content, dates, or types. Acceptable;
noted. (Padding ciphertext to fixed buckets is a future option if even size leak
matters.)

## 8. Phasing

- **3a — Crypto core:** key derivation, mnemonic gen/validate, encrypt/decrypt,
  opaque record keys. Pure, fully unit-tested, **no network**. (Highest-risk code;
  land and test it in isolation first.)
- **3b — Server:** Postgres schema + register/pull/push/delete endpoints + auth.
- **3c — Sync engine:** `syncMeta` sidecar table (db v5), repository write-hook for
  dirty/tombstones, push/pull reconciliation with LWW, `lastSeq` persistence.
- **3d — UI:** enable/restore/disable flows, phrase display + confirm, sync status,
  wire `delete-account` into the existing delete flow.
- **3e — Hardening:** delete-account coverage, conflict/tombstone edge tests,
  optional signed requests, CI check that no request body carries a plaintext
  health field.

## 9. Open questions

1. Mnemonic length: 12 words (128-bit) vs 24 (256-bit). Recommend 12 — ample, less
   to write down.
2. Where does "restore from phrase" live in onboarding — a third welcome option
   next to "Track my cycle" / "I'm pregnant"?
3. Encryption at rest for the *local* Dexie DB — out of scope here but related; the
   recovery-phrase key could also encrypt the local store later (closes the
   lost-device gap). Track separately.
4. Sync trigger cadence beyond "on open + manual" — how hard to lean on Periodic
   Background Sync (Chromium-only, unreliable)?
5. Cross-version safety: two devices on different app versions with different Dexie
   schema versions — pull must tolerate unknown stores/fields (forward-compatible
   envelope; never drop unknown records).

---

*Recommended next step: build Phase 3a (crypto core) behind tests before any
server or UI work — it is the part that must be exactly right, and it's verifiable
with zero backend.*
