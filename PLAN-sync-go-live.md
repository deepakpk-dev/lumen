# Sync Go-Live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the code-complete, dormant E2E-encrypted sync on in production: provision the database, prove the deployed endpoints work end-to-end with a smoke script, and update the docs that currently mark sync 💤 dormant.

**Architecture:** All sync code (client engine, 4 API routes, blind Postgres schema) is already shipped and tested. The only missing piece is a production `DATABASE_URL` (Neon Postgres via Vercel Marketplace) — `src/server/sync-db.ts` creates the schema idempotently on first query, so there is no migration step. The code work here is a repeatable production smoke test plus doc updates.

**Tech Stack:** Node ≥18 (built-in `fetch` + `node:crypto`), Vercel, Neon Postgres.

## Global Constraints

- This repo's Next.js is a custom 16.2.9 build with breaking changes — read the relevant guide in `node_modules/next/dist/docs/` before writing any Next-specific code (the smoke script is plain Node, so it doesn't need this).
- No new npm dependencies.
- `npm run lint`, `npx tsc --noEmit`, and `npm test` must pass before every commit.
- The smoke script must never send plaintext health data — it pushes random bytes only. The zero-knowledge property is enforced by `src/data/sync-privacy.test.ts`; do not weaken it.

---

### Task 1: Provision Neon Postgres (USER ACTION — cannot be done by an agent)

**Files:** none.

This needs the product owner's Vercel account. If you are an agent, output these instructions and pause until the user confirms:

- [ ] **Step 1:** Vercel dashboard → the Lumen project → **Storage** tab (or Marketplace) → add **Neon Postgres** (the design doc's choice, `docs/superpowers/specs/2026-07-05-e2e-sync-design.md` §4). Pick the region closest to expected users.
- [ ] **Step 2:** Confirm the integration injected `DATABASE_URL` into the project's environment variables (Settings → Environment Variables). **Use the pooled connection string** (host contains `-pooler`): serverless functions each open their own `pg.Pool`, and the unpooled endpoint will exhaust Neon's connection limit under modest load.
- [ ] **Step 3:** Redeploy. Env vars only apply to deployments made after they are set — the currently-live deployment will keep 500ing until redeployed.

### Task 1b: Edge rate limiting on the sync API (USER ACTION — platform config, not code)

**Files:** none (platform dashboard / `vercel.json` if using Vercel's WAF rules).

The app enforces a per-account storage cap in `app/api/sync/push/route.ts` (`MAX_RECORDS_PER_ACCOUNT`, returns 413), which bounds what an *authenticated* account can store. It does **not** rate-limit request frequency or the *unauthenticated* `register` endpoint — a serverless function has no shared state to enforce that, so it belongs at the platform edge.

- [ ] **Step 1:** Enable IP-based rate limiting in front of `/api/sync/*` (Vercel Firewall / WAF rate-limit rules, or Cloudflare if fronting it). Suggested starting limits: `register` ~10/min/IP (it's unauthenticated and only ever called once per device), `push`/`pull` ~60/min/IP.
- [ ] **Step 2:** Confirm the limits don't trip a legitimate first-sync: `enableSync` calls register once, then push chunks of ≤500 records — a large seed can fire several `push`/`pull` calls in quick succession. Set the `push`/`pull` window accordingly.

### Task 2: Production smoke script

**Files:**
- Create: `scripts/sync-smoke.mjs`

**Interfaces:**
- Consumes: the deployed `/api/sync/{register,push,pull,delete-account}` routes.
- Produces: a CLI check (`node scripts/sync-smoke.mjs <origin>`) that exits 0 on a healthy deployment, non-zero with a message otherwise.

Request/response contracts (verified against the route sources):

| Route | Auth | Body | OK response |
|---|---|---|---|
| `POST /api/sync/register` | none | `{ accountId: 32-hex, authHash: 64-hex }` (`authHash` = SHA-256 hex of `authSecret`) | `{ ok: true }` |
| `POST /api/sync/push` | `Bearer accountId:authSecret` | `{ records: [{ recordKey: 64-hex, iv: 16-char base64 (12 bytes), ciphertext: base64 ≤90000 chars, updatedAt: ISO, deleted: bool }] }` | `{ ok: true }` |
| `POST /api/sync/pull` | same | `{ since: number }` | `{ records: [...], since, more }` |
| `POST /api/sync/delete-account` | same | `{}` | `{ ok: true }` |

- [x] **Step 1: Write the script**

```js
#!/usr/bin/env node
// Production smoke test for the sync API. Registers a throwaway account,
// pushes one random-bytes envelope, pulls it back, deletes the account.
// Usage: node scripts/sync-smoke.mjs https://your-deployment.vercel.app
import { webcrypto as crypto } from 'node:crypto';

const origin = process.argv[2];
if (!origin) {
  console.error('usage: node scripts/sync-smoke.mjs <origin>');
  process.exit(2);
}

const hex = (n) =>
  [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
const b64 = (bytes) => Buffer.from(bytes).toString('base64');

const accountId = hex(16); // 32 hex chars, matches isHex(accountId, 32)
const authSecret = hex(32);
const authHash = Buffer.from(
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode(authSecret)),
).toString('hex');

async function post(path, body, auth = true) {
  const res = await fetch(`${origin}/api/sync/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(auth ? { authorization: `Bearer ${accountId}:${authSecret}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

// Random bytes only — the server never decrypts, and this script must never
// send anything that even looks like health data.
const envelope = {
  recordKey: hex(32),
  iv: b64(crypto.getRandomValues(new Uint8Array(12))),
  ciphertext: b64(crypto.getRandomValues(new Uint8Array(256))),
  updatedAt: new Date().toISOString(),
  deleted: false,
};

try {
  await post('register', { accountId, authHash }, false);
  console.log('register  OK');
  await post('push', { records: [envelope] });
  console.log('push      OK');
  const page = await post('pull', { since: 0 });
  const got = page.records.find((r) => r.recordKey === envelope.recordKey);
  if (!got || got.ciphertext !== envelope.ciphertext) {
    throw new Error('pull did not return the pushed record intact');
  }
  console.log('pull      OK (round-trip verified)');
  await post('delete-account', {});
  console.log('delete    OK');
  console.log(`\nSync is LIVE at ${origin}`);
} catch (err) {
  console.error(`\nSMOKE FAILED: ${err.message}`);
  process.exit(1);
}
```

- [x] **Step 2: Verify the failure path first** (before the DB exists, or against a bogus origin):

Run: `node scripts/sync-smoke.mjs https://example.invalid`
Expected: `SMOKE FAILED: ...`, exit code 1 (check with `echo $LASTEXITCODE` / `echo $?`).

- [x] **Step 3: Run against the redeployed production URL** (after Task 1) — passed 2026-07-09 against https://lumen-pi-one.vercel.app:

Run: `node scripts/sync-smoke.mjs https://<production-domain>`
Expected: four `OK` lines and `Sync is LIVE`. **Known wrinkle:** the very first request after deploy creates the schema (`sync-db.ts` runs `SCHEMA_SQL` lazily) and hits a Neon cold start — if `register` times out once, just re-run; a second consecutive failure is a real failure.

- [x] **Step 4: Commit**

```bash
git add scripts/sync-smoke.mjs
git commit -m "feat(sync): add production smoke test for sync go-live"
```

### Task 3: End-to-end verification in the real app (manual, ~5 min)

**Files:** none — this is verification, not code.

- [ ] **Step 1:** On the deployed site in a fresh browser profile: complete onboarding → log a period day → Settings → turn on encryption (save the recovery phrase) → **Turn on sync**. Expected: no error, "Sync is on", last-synced timestamp appears.
- [ ] **Step 2:** In a second fresh browser profile: Settings → Sync → **Restore from another device** → enter the phrase + a new passcode. Expected: the logged period from profile 1 appears on Home/Calendar.
- [ ] **Step 3:** In profile 2, Settings → Your data → delete all data, confirming server copy deletion. Re-run the smoke script to confirm the API is still healthy.

### Task 4: Update the docs that call sync dormant

**Files:**
- Modify: `docs/COMPETITIVE_BENCHMARKING.md` (matrix row "Cross-device sync + backup": `✅ 💤 (dormant)` → `✅`; §1 "code-complete but dormant" sentence; §5.1(2); §9 row 1 becomes done)
- Modify: `README.md` (search for any "dormant"/"not live"/"needs DATABASE_URL" wording and update)
- Modify: `docs/USER_GUIDE.md` (same check)

- [x] **Step 1:** Grep for stale claims: `dormant`, `DATABASE_URL`, `not live`, `500` across `README.md docs/*.md`. Update each to reflect live sync. Do NOT touch the "Trust boundary" honesty section in the README — the web-delivery caveat is still true.
- [x] **Step 2: Commit**

```bash
git add README.md docs
git commit -m "docs: mark E2E sync live in production"
```

---

## Edge cases found while exploring (do not skip)

1. **Pooled vs direct Neon connection string.** `sync-db.ts` uses a plain `pg.Pool` per serverless instance. With Neon's direct (non-pooler) host, concurrent cold instances can exhaust connections. Use the `-pooler` connection string in `DATABASE_URL`.
2. **Schema creation races are safe but slow on first hit.** `SCHEMA_SQL` is `create ... if not exists` and runs once per process — first request after deploy may take seconds. Don't misread that as failure; retry once.
3. **Env var requires redeploy.** Setting `DATABASE_URL` does not touch the running deployment.
4. **The smoke account must be deleted** (Task 2 script does this) — don't leave junk accounts, and never reuse a real recovery phrase's ids in the script.
5. **`iv.length === 16` is chars of base64, not bytes** — 12 random bytes encode to exactly 16 base64 chars. Padding the IV differently will 400.

## Acceptance criteria

- `node scripts/sync-smoke.mjs <prod-url>` prints `Sync is LIVE` and exits 0.
- Two-browser manual flow (Task 3) round-trips a logged record through the phrase restore.
- No doc in the repo still describes sync as dormant/pending, except the trust-boundary caveat which stays.
- `npm run lint && npx tsc --noEmit && npm test` all pass (the smoke script is plain .mjs, excluded from tsc, but lint must not flag it).
