# Encryption Hardening (Phase 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four open items from the at-rest-encryption review: (1) there is no way to turn encryption OFF, (2) the pre-encryption legacy screen-lock passcode is unmanageable and not cleared when the vault is enabled, (3) `PasscodeControls`/`SyncControls` show stale state when the vault is created by the *other* component on the same settings page, (4) the `PasscodeGate` unlock/escrow flow has no component test.

**Architecture:** `decryptExistingData` mirrors the existing `encryptExistingData` in `src/data/repository.ts` (same verify-before-destructive-step discipline, inverted). UI lives in the existing `PasscodeControls`. Cross-component staleness is fixed with one window event dispatched by `vault-store.ts`.

**Tech Stack:** existing stack only — Dexie, WebCrypto, Vitest + Testing Library, `fake-indexeddb`. No new dependencies.

## Global Constraints

- This repo's Next.js is a custom 16.2.9 build — read `node_modules/next/dist/docs/` before writing any Next-specific code.
- `npm run lint`, `npx tsc --noEmit`, `npm test` must pass before every commit.
- Never clear a data source before its replacement copy is **verified** — this is the invariant the whole encryption migration is built on.
- Match existing code style: comment only constraints the code can't show; `ponytail:` comments mark deliberate ceilings.

---

### Task 1: `decryptExistingData` — the reverse migration

**Files:**
- Modify: `src/data/repository.ts` (add function after `encryptExistingData`, ~line 202)
- Test: `src/data/repository.test.ts` (add cases; follow the existing `encryptExistingData` test setup in that file)

**Interfaces:**
- Consumes: `exportAll()`, `importAll()`, `storeCounts()`, `setStorageKeys`, `storageIsEncrypted` (all already in `repository.ts`/`storage.ts`); `isSyncEnabled` from `./sync-engine`; `setSyncTracking` from `./storage`.
- Produces: `export async function decryptExistingData(clearVaultPersisted: () => void): Promise<void>` — Task 2's UI calls this.

- [ ] **Step 1: Write the failing tests.** In `src/data/repository.test.ts` (reuse the file's existing helpers for creating keys — it already tests `encryptExistingData`, copy its `deriveKeys`-from-test-phrase setup):

```ts
describe('decryptExistingData', () => {
  it('round-trips: encrypted records land back in plaintext tables and ciphertext is gone', async () => {
    await addCycle({ id: 'c1', startDate: '2026-01-01' });
    await encryptExistingData(keys, () => {});
    expect(storageIsEncrypted()).toBe(true);

    let vaultCleared = false;
    await decryptExistingData(() => { vaultCleared = true; });

    expect(storageIsEncrypted()).toBe(false);
    expect(vaultCleared).toBe(true);
    expect((await getCycles()).map((c) => c.id)).toEqual(['c1']);
    expect(await db.records.count()).toBe(0);
  });

  it('throws if encryption is already off', async () => {
    await expect(decryptExistingData(() => {})).rejects.toThrow(/already off/i);
  });

  it('refuses while sync is enabled', async () => {
    await encryptExistingData(keys, () => {});
    localStorage.setItem('lumen.sync.enabled', '1');
    await expect(decryptExistingData(() => {})).rejects.toThrow(/sync/i);
    expect(storageIsEncrypted()).toBe(true); // untouched
  });

  it('rolls back to encrypted mode and clears plaintext residue on failure', async () => {
    await addCycle({ id: 'c1', startDate: '2026-01-01' });
    await encryptExistingData(keys, () => {});
    await expect(
      decryptExistingData(() => { throw new Error('quota'); }),
    ).rejects.toThrow('quota');
    // still encrypted, ciphertext intact, and no plaintext copy left behind
    expect(storageIsEncrypted()).toBe(true);
    expect((await getCycles()).map((c) => c.id)).toEqual(['c1']);
    expect(await db.cycles.count()).toBe(0); // typed table holds no residue
  });
});
```

- [ ] **Step 2:** Run: `npx vitest run src/data/repository.test.ts` — expect FAIL (`decryptExistingData is not defined`).

- [ ] **Step 3: Implement** in `src/data/repository.ts`:

```ts
// Turn encryption OFF: copy every record out of the encrypted store into the
// plaintext typed tables, then drop the ciphertext. Mirrors encryptExistingData
// with the verify-before-destructive-step order inverted: the plaintext copy is
// verified, the vault blob is removed (via `clearVaultPersisted`), and only
// then is `records` cleared — so a failure can never leave a vault that
// unlocks onto an empty store while the data sits in plaintext.
// On failure it rolls back to encrypted mode AND clears the typed tables,
// because a half-written plaintext copy is a privacy leak, not a convenience.
export async function decryptExistingData(clearVaultPersisted: () => void): Promise<void> {
  if (!storageIsEncrypted()) throw new Error('Encryption is already off.');
  // Sync's outbox envelopes and credentials are rooted in the vault phrase —
  // stripping the vault while sync runs would corrupt the outbox. UI enforces
  // this too; the guard makes it impossible, not just hidden.
  if (isSyncEnabled()) throw new Error('Turn off sync before turning off encryption.');
  setSyncTracking(null);
  const keys = getStorageKeys();
  const encrypted = await exportAll(); // session set → reads the encrypted store
  setStorageKeys(null);
  try {
    await importAll(encrypted); // session null → writes the typed tables
    const check = await exportAll(); // reads back from typed tables
    const before = storeCounts(encrypted);
    const after = storeCounts(check);
    if (before.some((n, i) => n !== after[i])) {
      throw new Error('Turning off encryption did not complete — your data is unchanged.');
    }
    clearVaultPersisted();
  } catch (err) {
    // Roll back: wipe the partial plaintext copy, restore the session key.
    await Promise.all([
      db.cycles.clear(),
      db.dailyLogs.clear(),
      db.pregnancyProfile.clear(),
      db.kickSessions.clear(),
      db.contractionSessions.clear(),
      db.postpartumProfile.clear(),
      db.epdsEntries.clear(),
      db.programProgress.clear(),
    ]);
    setStorageKeys(keys);
    throw err;
  }
  await db.records.clear();
}
```

Required import changes at the top of `repository.ts`: add `getStorageKeys`, `setSyncTracking` to the `./storage` import; add `isSyncEnabled` to the `./sync-engine` import (only `clearSyncState` is imported today).

- [ ] **Step 4:** Run: `npx vitest run src/data/repository.test.ts` — expect PASS. Also run the full suite (`npm test`): `sync-privacy.test.ts` and `storage.test.ts` must stay green.

- [ ] **Step 5: Commit**

```bash
git add src/data/repository.ts src/data/repository.test.ts
git commit -m "feat(crypto): add decryptExistingData reverse migration"
```

### Task 2: "Turn off encryption" UI + legacy passcode cleanup

**Files:**
- Modify: `src/components/PasscodeControls.tsx`
- Test: `src/components/PasscodeControls.test.tsx`

**Interfaces:**
- Consumes: `decryptExistingData` (Task 1), `unlockVault`/`loadVault`/`clearVault`, `isSyncEnabled` from `@/src/data/sync-engine`, `clearPasscode`/`hasPasscode` from `@/src/security/passcode`.
- Produces: user-visible "Turn off encryption" in the `view === 'on'` state; legacy passcode is cleared on vault enable.

Behavior spec:
1. In `view 'on'`, add a "Turn off encryption…" button → `'confirm-off'` view: warning copy ("Your records will be stored unencrypted on this device"), a current-passcode input, Cancel. If `isSyncEnabled()`, render the warning "Turn off sync first (in the Sync section below)" and disable the confirm button instead.
2. Confirm handler: `loadVault()` → `unlockVault(current, vault)` (verifies the passcode; the session key is already installed, but re-verifying stops someone at an unlocked device from silently stripping encryption) → `await decryptExistingData(() => clearVault())` → also `clearPasscode()` (belt-and-braces: a leftover legacy hash must not re-lock a now-plaintext device) → `setView('off')`.
3. In `handleEnable`, after `encryptExistingData(...)` succeeds, call `clearPasscode()` — today a legacy `lumen.passcode.hash` survives vault creation and `PasscodeGate` would fall back to it if the vault were ever cleared.
4. New `'legacy'` view: on mount, if `!hasVault() && hasPasscode()`, show "You have an old screen-lock passcode. It locks the screen but does not encrypt your data." with two buttons: "Upgrade to encryption" (switches to the normal enable form; enable clears the legacy hash per item 3) and "Remove old passcode" (input current passcode → `verifyPasscode` → `clearPasscode()` → `'off'` view).

- [ ] **Step 1: Write failing tests** (follow the existing test file's render/mocking patterns — it already tests the enable flow with fake-indexeddb):

```ts
it('turn off encryption decrypts data and clears the vault', async () => { /* enable first, then: click "Turn off encryption…", type passcode, click confirm; expect hasVault() false, storageIsEncrypted() false, view shows enable form again */ });
it('turn off is blocked while sync is enabled', async () => { /* set lumen.sync.enabled=1; expect disabled confirm + hint text */ });
it('enabling encryption clears a legacy passcode', async () => { /* await setPasscode('1234'); run enable flow; expect hasPasscode() false */ });
it('legacy passcode can be removed', async () => { /* setPasscode, render, click "Remove old passcode", enter code, expect hasPasscode() false */ });
```

- [ ] **Step 2:** Run `npx vitest run src/components/PasscodeControls.test.tsx` — expect FAIL.
- [ ] **Step 3:** Implement per the behavior spec. Keep the existing visual language (same button/input classes as the file's other views).
- [ ] **Step 4:** Run the test file, then `npm test` — expect PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(crypto): turn-off-encryption flow + legacy passcode cleanup"`

### Task 3: Vault-change event so Settings sections don't go stale

**Files:**
- Modify: `src/security/vault-store.ts`
- Modify: `src/components/PasscodeControls.tsx` (mount effect)
- Modify: `src/components/SyncControls.tsx` (mount effect)
- Test: extend both component test files

Problem (verified in code): both components read `hasVault()` once in a mount effect. `SyncControls`' restore flow creates a vault → `PasscodeControls` on the same page still shows "Turn on encryption" (running it would then throw). Conversely, enabling the passcode doesn't wake `SyncControls` out of `'novault'`. Same-tab `localStorage` writes do NOT fire the `storage` event, so an explicit event is needed.

- [ ] **Step 1: Failing test** (in `PasscodeControls.test.tsx`): render, then `saveVault(someVault)` + assert the component now shows the encryption-on view. Mirror test in `SyncControls.test.tsx` (novault → off).
- [ ] **Step 2: Implement.** In `vault-store.ts`:

```ts
// Same-tab localStorage writes don't fire 'storage', so settings sections that
// gate on hasVault() listen for this instead.
export const VAULT_CHANGED_EVENT = 'lumen:vault-changed';

function emitChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(VAULT_CHANGED_EVENT));
}
```

Call `emitChanged()` at the end of `saveVault` and `clearVault`. In each component's mount effect, extract the view computation into a function and re-run it on the event:

```ts
useEffect(() => {
  const sync = () => setView(hasVault() ? 'on' : 'off'); // (each component's own mapping)
  sync();
  window.addEventListener(VAULT_CHANGED_EVENT, sync);
  return () => window.removeEventListener(VAULT_CHANGED_EVENT, sync);
}, []);
```

Careful in `SyncControls`: the mapping is `!hasVault() ? 'novault' : isSyncEnabled() ? 'on' : 'off'`, and the listener must not stomp transient views (`'restore'`, `'confirm-off'`) — only re-derive when the current view is one of `'loading' | 'novault' | 'off' | 'on'`. Use the functional-state form: `setView((v) => (v === 'restore' || v === 'confirm-off' ? v : next))`.

- [ ] **Step 3:** Tests pass; full `npm test` green.
- [ ] **Step 4: Commit** — `git commit -m "fix(settings): vault-change event keeps passcode/sync sections in step"`

### Task 4: PasscodeGate component test (deferred phase-3 gap)

**Files:**
- Create: `src/components/PasscodeGate.test.tsx`

The unlock/escrow wiring is only build-verified today. Write one focused test file (jsdom + fake-indexeddb are already configured in `vitest.setup.ts`):

- [ ] **Step 1: Write the tests:**

```ts
// setup: const { vault, unlocked } = await createVault('pw'); saveVault(vault);
it('renders the lock, rejects a wrong passcode, unlocks on the right one', async () => {
  render(<PasscodeGate><p>app</p></PasscodeGate>);
  // children hidden while locked
  expect(screen.queryByText('app')).toBeNull();
  await user.type(screen.getByLabelText('passcode'), 'nope');
  await user.click(screen.getByRole('button', { name: /unlock/i }));
  expect(await screen.findByText(/incorrect passcode/i)).toBeInTheDocument();
  await user.clear(screen.getByLabelText('passcode'));
  await user.type(screen.getByLabelText('passcode'), 'pw');
  await user.click(screen.getByRole('button', { name: /unlock/i }));
  expect(await screen.findByText('app')).toBeInTheDocument();
  expect(storageIsEncrypted()).toBe(true); // key installed before children mount
});
it('restore path: valid phrase + new passcode re-wraps the vault and opens', async () => { /* click "Forgot passcode?", paste unlocked.mnemonic, set new code, expect open + unlockVault('newpw', loadVault()!) resolves */ });
it('corrupt vault blob steers to recovery instead of opening plaintext', async () => {
  localStorage.setItem('lumen.vault', '{not json');
  /* submit any passcode; expect the "unreadable"/restore error, and children still hidden */
});
```

Cleanup between tests: `localStorage.clear()`, `setStorageKeys(null)`, `setSyncTracking(null)` in `afterEach` — the storage session is module-level state and WILL leak across tests otherwise.

- [ ] **Step 2:** Run: `npx vitest run src/components/PasscodeGate.test.tsx` — expect PASS (this task documents existing behavior; a failure here is a real bug — investigate before changing the test).
- [ ] **Step 3: Commit** — `git commit -m "test(crypto): cover PasscodeGate unlock, restore, and corrupt-vault paths"`

---

## Edge cases found while exploring (do not skip)

1. **Order of destruction in `decryptExistingData` is load-bearing.** Clear the vault blob BEFORE `db.records.clear()`. If the order were reversed and the vault clear failed, the next app open would unlock the vault onto an *empty* encrypted store while the real data sits in plaintext tables — the app would look wiped. With the chosen order, a failed `records.clear()` merely leaves inert ciphertext behind (no key exists to read it).
2. **Rollback must wipe plaintext residue.** `importAll` is additive and non-transactional (documented ponytail ceiling). A mid-failure leaves a partial plaintext copy of encrypted health data — that's a privacy regression, so the catch block clears all 8 typed tables (they are guaranteed empty in encrypted mode, so nothing legitimate is lost).
3. **Sync coupling.** The vault phrase IS the sync credential (`SyncControls`), and `syncMeta` outbox rows are envelopes encrypted with the vault keys. Turning encryption off while sync is on would orphan both — hence the hard guard, not just UI hiding. `setSyncTracking(null)` is called defensively even though the guard should make it moot.
4. **`trackWrite` during migration.** If sync tracking were somehow active, every `importAll` write inside the migration would spew outbox entries. The `setSyncTracking(null)` call closes this.
5. **Legacy passcode shadowing.** `PasscodeGate` checks `hasVault()` before `hasPasscode()`, so a stale legacy hash is invisible *until* the vault is removed — at which point the user is prompted for a passcode they set months ago. That's why disable clears BOTH.
6. **Same-tab `storage` events don't fire** — the naive fix (listening to `window.onstorage`) silently does nothing; the custom event is required.
7. **Module-level session state in tests.** `src/data/storage.ts` holds `session`/`tracking` in module scope; tests that enable encryption must reset them in `afterEach` or later tests read the wrong mode.

## Acceptance criteria

- Settings shows "Turn off encryption…" when encryption is on; completing it returns the device to plaintext with all records visible, `lumen.vault` and `lumen.passcode.hash` removed, `db.records` empty.
- The button path is blocked with a clear message while sync is enabled.
- Enabling encryption removes any legacy `lumen.passcode.hash`.
- A legacy-passcode-only user sees upgrade/remove options in Settings.
- Creating a vault via sync-restore immediately flips the Passcode section to "on" without navigation (and vice versa for the Sync section).
- New `PasscodeGate.test.tsx` passes; full `npm run lint && npx tsc --noEmit && npm test` green.
