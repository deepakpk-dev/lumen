# Native Wrapper (Capacitor, Android-first) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Lumen as a store-distributable native app by wrapping the existing Next.js build in Capacitor — closing both the distribution gap (no App Store presence, PWA install friction) and the trust-boundary ceiling (a store-signed bundle means the crypto code is no longer re-fetched from the server on every load, so "even a malicious server can't read your data" becomes true for native users).

**Architecture:** The web app stays deployed on Vercel unchanged (it hosts the `/api/sync/*` routes). For native, the same codebase is built with Next's static export into `out/`, which Capacitor packages into an Android WebView app. The only runtime difference: sync requests go to an absolute origin (`NEXT_PUBLIC_SYNC_ORIGIN`) instead of same-origin paths, which in turn requires CORS on the sync routes.

**Tech Stack:** `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` (the three new dependencies this plan authorizes), Android Studio + SDK (user-installed), existing Next 16.2.9.

## Global Constraints

- **This repo's Next.js is a custom 16.2.9 build with breaking changes. Before Task 2, read the static-export guide in `node_modules/next/dist/docs/` (find it: `ls node_modules/next/dist/docs | grep -i export`) and follow what it says over anything remembered from public Next docs.**
- Android only in this plan — iOS requires macOS and this is a Windows machine. Structure nothing iOS-hostile, add nothing iOS-specific.
- The web deployment must be completely unaffected: same build command, same behavior, `NEXT_PUBLIC_SYNC_ORIGIN` unset ⇒ same-origin fetches as today.
- `npm run lint && npx tsc --noEmit && npm test` green before every commit.

---

### Task 1: Absolute sync origin + CORS on the sync routes

Do this first — it is pure web-side work, independently testable, and every later task depends on it.

**Files:**
- Modify: `src/data/sync-engine.ts` (two fetch call sites: `post()` ~line 107 and `registerAccount` ~line 123)
- Create: `src/server/cors.ts`
- Modify: `app/api/sync/register/route.ts`, `app/api/sync/push/route.ts`, `app/api/sync/pull/route.ts`, `app/api/sync/delete-account/route.ts`
- Test: `src/data/sync-engine.test.ts` (extend), new `app/api/sync/cors.test.ts` colocated with the existing endpoint tests (check where the 13 endpoint tests live and follow that pattern)

**Interfaces:**
- Produces: a module-private `syncUrl(path: string): string` in `sync-engine.ts`; `corsHeaders(req: Request): HeadersInit` in `src/server/cors.ts` (used by both the `OPTIONS` handlers and the `POST` responses).

- [ ] **Step 1 (client): failing test** — assert that with `process.env.NEXT_PUBLIC_SYNC_ORIGIN` stubbed to `https://lumen.example`, `registerAccount` fetches `https://lumen.example/api/sync/register`. Note: `NEXT_PUBLIC_*` vars are inlined at build time, so read it once at module scope.

- [ ] **Step 2 (client): implement** in `sync-engine.ts`:

```ts
// Native builds (Capacitor) serve the app from a local scheme, so sync must
// target the hosted origin. Web builds leave this unset → same-origin, as today.
const SYNC_ORIGIN = process.env.NEXT_PUBLIC_SYNC_ORIGIN ?? '';
const syncUrl = (path: string) => `${SYNC_ORIGIN}${path}`;
```

Wrap the URL in both fetch call sites: `fetch(syncUrl(path), …)` in `post()` and `fetch(syncUrl('/api/sync/register'), …)`.

- [ ] **Step 3 (server): implement CORS.** The native WebView origin is `https://localhost` (Capacitor Android default) — not the Vercel origin — so all four routes need CORS. In `src/server/cors.ts`:

```ts
// The native app's WebView serves from its own local origin, so the sync API
// must answer cross-origin. Allowlist, never '*': these endpoints carry a
// bearer credential.
const ALLOWED = new Set(['https://localhost', 'capacitor://localhost']);

export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin');
  if (!origin || !ALLOWED.has(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'POST, OPTIONS',
    vary: 'origin',
  };
}
```

In each route file add:

```ts
export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
```

and apply `corsHeaders(req)` to every `Response.json(...)` in the `POST` handlers (`Response.json(body, { status, headers: corsHeaders(req) })`).

- [ ] **Step 4: tests** — endpoint tests: an `OPTIONS` request with `origin: https://localhost` returns 204 with the allow headers; a `POST` with a disallowed origin still succeeds but carries no CORS headers (same-origin web is unaffected). Run full suite: **`sync-privacy.test.ts` must stay green** — it scans request bodies, and nothing here touches bodies.

- [ ] **Step 5: Commit** — `git commit -m "feat(sync): absolute sync origin + CORS for native builds"`

### Task 2: Static export build path

**Files:**
- Modify: `next.config.ts`
- Create: `scripts/build-native.mjs`
- Modify: `package.json` (add script `"build:native": "node scripts/build-native.mjs"`)

- [ ] **Step 1:** Read the static-export doc in `node_modules/next/dist/docs/` (Global Constraints). Confirm: the config key for export mode, whether route handlers (`app/api/**/route.ts`) are rejected by exports in this version, and image handling.

- [ ] **Step 2:** `next.config.ts` — export mode only when the native build asks for it:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_OUTPUT === 'export'
    ? { output: 'export' as const, images: { unoptimized: true } }
    : {}),
};

export default nextConfig;
```

- [ ] **Step 3:** `scripts/build-native.mjs` — API routes can't be part of a static export, so hide them for the duration of the build:

```js
#!/usr/bin/env node
// Build the static bundle Capacitor wraps. app/api can't exist in a static
// export, so it is set aside for the build and always restored (try/finally).
import { renameSync, existsSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

const API = 'app/api';
const HIDDEN = '.api-hidden';
if (!process.env.NEXT_PUBLIC_SYNC_ORIGIN) {
  console.error('Set NEXT_PUBLIC_SYNC_ORIGIN to the deployed web origin (e.g. https://lumen.example) so the native app can sync.');
  process.exit(2);
}
renameSync(API, HIDDEN);
try {
  rmSync('.next', { recursive: true, force: true }); // stale server-build artifacts confuse export
  execSync('npx next build', { stdio: 'inherit', env: { ...process.env, NEXT_OUTPUT: 'export' } });
} finally {
  renameSync(HIDDEN, API);
}
if (!existsSync('out/index.html')) {
  console.error('Export did not produce out/index.html');
  process.exit(1);
}
console.log('Native web bundle ready in out/');
```

- [ ] **Step 4:** Run: `NEXT_PUBLIC_SYNC_ORIGIN=https://example.com npm run build:native` (PowerShell: `$env:NEXT_PUBLIC_SYNC_ORIGIN='https://example.com'; npm run build:native`).
Expected: `out/` contains `index.html`, `log/`, `calendar/`, `settings/`, and one directory per article/program slug (both dynamic routes already have `generateStaticParams` — verified in `app/library/[slug]/page.tsx:8` and `app/programs/[slug]/page.tsx:7`). If the build fails on some other dynamic behavior, fix per the docs read in Step 1 — do not remove pages from the export.
Then run `npm run build` (normal web build) and confirm it still succeeds with `app/api` present.

- [ ] **Step 5: Commit** — `git commit -m "feat(native): static export build path (build:native)"`

### Task 3: Capacitor shell (Android)

**Files:**
- Modify: `package.json` (deps + scripts), `.gitignore` (add `out/`)
- Create: `capacitor.config.ts`
- Create: `android/` (generated by `npx cap add android`; commit it — it's the native project)

- [ ] **Step 1:** `npm install @capacitor/core && npm install -D @capacitor/cli && npm install @capacitor/android`

- [ ] **Step 2:** Create `capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lumen.health',
  appName: 'Lumen',
  webDir: 'out',
  android: { allowMixedContent: false },
};

export default config;
```

- [ ] **Step 3:** `npx cap add android`, then add package scripts:
`"cap:sync": "npm run build:native && npx cap sync android"` and `"cap:run": "npm run cap:sync && npx cap run android"`.

- [ ] **Step 4:** Guard the service worker — inside the native shell the bundle is local, and a SW would fight the packaged assets. In `src/components/ServiceWorkerRegistrar.tsx`, before registering:

```ts
// Capacitor injects window.Capacitor; the packaged app needs no SW (assets are
// local) and Android WebView SW support inside custom schemes is unreliable.
if ((window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) return;
```

(Adapt to the component's actual structure; there's a test file — extend it: mock `window.Capacitor` and assert `navigator.serviceWorker.register` is not called.)

- [ ] **Step 5 (USER ACTION):** Install Android Studio + an emulator or plug in a device with USB debugging. Then run `npm run cap:run`. Verify manually: onboarding completes → log a day → calendar shows it → kill the app, reopen, data persists → airplane mode: app still opens (bundle is local) → Settings: enable encryption, enable sync (needs PLAN-sync-go-live done) → data syncs against the hosted origin.

- [ ] **Step 6: Commit** — `git commit -m "feat(native): Capacitor Android shell"`

### Task 4: Docs + trust-boundary copy upgrade

**Files:**
- Modify: `README.md` ("Trust boundary" section), `app/privacy/page.tsx`, `docs/COMPETITIVE_BENCHMARKING.md` (§5.1(1), §5.3, matrix "Native mobile app" row), `docs/ENGINEERING.md`

- [ ] **Step 1:** Update the honest-E2E caveat: for the **native** app the code-delivery attack no longer applies (the bundle is store-signed and local); for the **web** app the caveat stands verbatim. Keep the tiered honesty — do not claim more than shipped. Matrix: Native app ❌ → ⚠️ (Android shipped, iOS pending) only after Task 3 Step 5 actually passes on a device.
- [ ] **Step 2: Commit** — `git commit -m "docs: native wrapper ships; scope trust-boundary caveat to web delivery"`

---

## Edge cases found while exploring (do not skip)

1. **CORS is mandatory, not optional.** The WebView origin (`https://localhost`) differs from the API origin. Without the `authorization` header in `access-control-allow-headers`, every sync call fails preflight — and only on device, where it's painful to debug. Task 1 exists because of this.
2. **`app/api` physically blocks static export** — route handlers aren't exportable. The rename-around-build trick is deliberate (ponytail: one build script beats splitting the repo into two packages). The `finally` restore matters: an aborted build must not leave the repo with `app/api` missing.
3. **`NEXT_PUBLIC_*` is inlined at build time.** Setting `NEXT_PUBLIC_SYNC_ORIGIN` at runtime does nothing; the build script hard-fails without it so nobody ships a native bundle that syncs against `''`.
4. **Both dynamic routes already have `generateStaticParams`** (`app/library/[slug]`, `app/programs/[slug]`) — this repo's Next skips prefetch on dynamic routes without it, and export requires it. If a future route breaks export, that's the pattern to follow.
5. **iOS is out of scope on this machine** (needs macOS/Xcode). Don't `npx cap add ios`.
6. **WebView storage ≠ browser storage.** IndexedDB/localStorage live in the app's WebView data dir — clearing browser data no longer nukes health data (good, and worth a copy tweak in the settings warning eventually), but uninstalling the app does. The export/restore + sync stories are unchanged.
7. **Stale `.next` artifacts** from a previous server build can poison an export build — hence the `rmSync('.next')` in the build script.

## Acceptance criteria

- `npm run build` (web) is byte-for-byte unaffected in behavior; CI stays green.
- `npm run build:native` produces a complete `out/` and always restores `app/api`, even on failure.
- `npm run cap:run` boots Lumen on an Android emulator/device; onboarding→log→calendar→reopen persistence works offline.
- Sync round-trips from the native app against the deployed origin (visible in Settings' last-synced timestamp, and the record appears on a second device/browser).
- OPTIONS preflight from origin `https://localhost` returns 204 + allow headers; web same-origin behavior unchanged.
- Privacy/README copy distinguishes native (code-delivery attack closed) from web (caveat stands).
