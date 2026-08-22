import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncControls } from './SyncControls';
import { saveVault } from '@/src/security/vault-store';
import type { WrappedVault } from '@/src/crypto/vault';
import { db } from '@/src/data/db';
import { addCycle, deleteAll, getCycles } from '@/src/data/repository';
import { setStorageKeys } from '@/src/data/storage';
import { startSyncTracking, push, isSyncEnabled } from '@/src/data/sync-engine';
import { deriveKeys, newRecoveryPhrase } from '@/src/crypto/keys';
import type { SyncEnvelope } from '@/src/crypto/envelope';

// Same in-memory blind server as sync-engine.test.ts, trimmed to what these
// flows touch.
let serverRows: Map<string, SyncEnvelope & { serverSeq: number }>;
let serverSeq: number;

function json(x: unknown): Response {
  return new Response(JSON.stringify(x), { status: 200 });
}

function fakeFetch(url: string, init?: RequestInit): Promise<Response> {
  const body = JSON.parse(String(init?.body ?? 'null')) as Record<string, unknown>;
  if (url.endsWith('/register')) return Promise.resolve(json({ ok: true }));
  if (url.endsWith('/push')) {
    for (const r of body.records as SyncEnvelope[]) {
      const cur = serverRows.get(r.recordKey);
      if (!cur || r.updatedAt > cur.updatedAt) serverRows.set(r.recordKey, { ...r, serverSeq: ++serverSeq });
    }
    return Promise.resolve(json({ ok: true }));
  }
  if (url.endsWith('/pull')) {
    const since = Number(body.since);
    const rows = [...serverRows.values()].filter((r) => r.serverSeq > since).sort((a, b) => a.serverSeq - b.serverSeq);
    return Promise.resolve(
      json({
        records: rows.map(({ recordKey, iv, ciphertext, updatedAt, deleted }) => ({ recordKey, iv, ciphertext, updatedAt, deleted })),
        since: rows.at(-1)?.serverSeq ?? since,
        more: false,
      }),
    );
  }
  if (url.endsWith('/delete-account')) {
    serverRows = new Map();
    return Promise.resolve(json({ ok: true }));
  }
  throw new Error(`unexpected fetch ${url}`);
}

beforeEach(async () => {
  serverRows = new Map();
  serverSeq = 0;
  vi.stubGlobal('fetch', vi.fn(fakeFetch));
  localStorage.clear();
  setStorageKeys(null);
  await deleteAll();
});

afterEach(() => {
  startSyncTracking(null);
  setStorageKeys(null);
  vi.unstubAllGlobals();
});

describe('SyncControls', () => {
  it('requires encryption before sync can be enabled', () => {
    render(<SyncControls />);
    expect(screen.getByText(/sync needs encryption/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: /turn on sync/i })).toBeNull();
  });

  it('enables sync for an unlocked vault and pushes the existing data', async () => {
    const keys = await deriveKeys(newRecoveryPhrase());
    localStorage.setItem('lumen.vault', '{}'); // hasVault() only checks presence
    setStorageKeys(keys);
    await addCycle({ id: 'c1', startDate: '2026-01-01' });

    const onSynced = vi.fn();
    render(<SyncControls onSynced={onSynced} />);
    await userEvent.click(await screen.findByRole('button', { name: /turn on sync/i }));

    await screen.findByText(/sync is/i);
    expect(isSyncEnabled()).toBe(true);
    expect(onSynced).toHaveBeenCalled();
    // The cycle and the prefs pseudo-record reached the (blind) server.
    expect(serverRows.size).toBe(2);
    expect(await db.syncMeta.filter((r) => r.dirty).count()).toBe(0);
  });

  it('restores a whole account onto a fresh device from the recovery phrase', async () => {
    // "Device A": push one cycle under a real phrase.
    const mnemonic = newRecoveryPhrase();
    const keys = await deriveKeys(mnemonic);
    startSyncTracking(keys);
    await addCycle({ id: 'from-device-a', startDate: '2026-01-01' });
    await push(keys);

    // Fresh device: no vault, no data.
    startSyncTracking(null);
    setStorageKeys(null);
    await deleteAll();
    localStorage.clear();

    const onRestored = vi.fn();
    render(<SyncControls onRestored={onRestored} />);
    await userEvent.click(screen.getByRole('button', { name: /restore from another device/i }));
    await userEvent.click(screen.getByLabelText(/recovery phrase/i));
    await userEvent.paste(mnemonic);
    await userEvent.type(screen.getByLabelText(/new passcode/i), 'sync-restore-passphrase');
    await userEvent.click(screen.getByRole('button', { name: /restore my data/i }));

    await waitFor(() => expect(onRestored).toHaveBeenCalled(), { timeout: 20_000 });
    expect(isSyncEnabled()).toBe(true);
    expect(localStorage.getItem('lumen.vault')).not.toBeNull(); // device is now encrypted
    expect((await getCycles()).map((c) => c.id)).toEqual(['from-device-a']);
  });

  it('turn off + delete server copy wipes the server and stops syncing', async () => {
    const keys = await deriveKeys(newRecoveryPhrase());
    localStorage.setItem('lumen.vault', '{}');
    localStorage.setItem('lumen.sync.enabled', '1');
    setStorageKeys(keys);
    startSyncTracking(keys);
    await addCycle({ id: 'c1', startDate: '2026-01-01' });
    await push(keys);
    expect(serverRows.size).toBe(1);

    render(<SyncControls />);
    await userEvent.click(await screen.findByRole('button', { name: /^turn off sync$/i }));
    await userEvent.click(screen.getByRole('button', { name: /turn off and delete server copy/i }));

    await waitFor(() => expect(isSyncEnabled()).toBe(false));
    expect(serverRows.size).toBe(0);
    // Local data untouched.
    expect(await getCycles()).toHaveLength(1);
  });

  it('reflects a vault created elsewhere on the same page', async () => {
    render(<SyncControls />);
    await screen.findByText(/sync needs encryption/i); // 'novault'
    act(() => saveVault({} as WrappedVault)); // e.g. the Passcode section enabling
    await screen.findByRole('button', { name: /turn on sync/i }); // now 'off'
  });
});
