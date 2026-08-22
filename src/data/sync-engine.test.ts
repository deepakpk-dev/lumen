import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from './db';
import { deleteAll, addCycle, getCycles, getDailyLog, upsertDailyLog, clearPregnancyProfile, savePregnancyProfile, addKickSession } from './repository';
import {
  startSyncTracking,
  seedOutbox,
  push,
  pull,
  syncNow,
  registerAccount,
  enableSync,
  restoreSync,
  disableSync,
  isSyncEnabled,
} from './sync-engine';
import { deriveKeys, newRecoveryPhrase, authHash, type DerivedKeys } from '@/src/crypto/keys';
import type { SyncEnvelope } from '@/src/crypto/envelope';
import { clearPreferences, exportPreferences, setBbtUnit } from '@/src/settings/preferences';

// In-memory stand-in for the blind server: same LWW-upsert and server_seq
// semantics as app/api/sync/*, minus Postgres and auth.
let serverRows: Map<string, SyncEnvelope & { serverSeq: number }>;
let serverSeq: number;
let registered: { accountId: string; authHash: string } | null;

function json(x: unknown): Response {
  return new Response(JSON.stringify(x), { status: 200, headers: { 'content-type': 'application/json' } });
}

function fakeFetch(url: string, init?: RequestInit): Promise<Response> {
  const body = JSON.parse(String(init?.body ?? 'null')) as Record<string, unknown>;
  if (url.endsWith('/register')) {
    registered = body as { accountId: string; authHash: string };
    return Promise.resolve(json({ ok: true }));
  }
  if (url.endsWith('/push')) {
    for (const r of body.records as SyncEnvelope[]) {
      const cur = serverRows.get(r.recordKey);
      if (!cur || r.updatedAt > cur.updatedAt) serverRows.set(r.recordKey, { ...r, serverSeq: ++serverSeq });
    }
    return Promise.resolve(json({ ok: true }));
  }
  if (url.endsWith('/delete-account')) {
    serverRows = new Map();
    registered = null;
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
  throw new Error(`unexpected fetch ${url}`);
}

// LWW clocks have millisecond granularity; writes that must order land in
// distinct milliseconds.
const tick = () => new Promise((r) => setTimeout(r, 3));

let keys: DerivedKeys;

beforeEach(async () => {
  serverRows = new Map();
  serverSeq = 0;
  registered = null;
  vi.stubGlobal('fetch', vi.fn(fakeFetch));
  keys = await deriveKeys(newRecoveryPhrase());
  clearPreferences();
  await deleteAll();
});

afterEach(async () => {
  startSyncTracking(null);
  vi.unstubAllGlobals();
});

describe('sync engine', () => {
  it('registers with the auth hash, never the secret', async () => {
    await registerAccount(keys);
    expect(registered).toEqual({ accountId: keys.accountId, authHash: await authHash(keys.authSecret) });
    expect(JSON.stringify(registered)).not.toContain(keys.authSecret);
  });

  it('tracked writes land in the outbox as opaque dirty envelopes', async () => {
    startSyncTracking(keys);
    // Markers long enough that hex/base64 can't contain them by chance.
    await addCycle({ id: 'cycle-under-test', startDate: '2026-01-01' });
    const rows = await db.syncMeta.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].dirty).toBe(true);
    // Nothing readable at rest: no store name, id, or date in the row.
    expect(JSON.stringify(rows[0])).not.toMatch(/cycles:|cycle-under-test|2026-01-01/);
  });

  it('push drains the outbox and clears dirty; nothing readable reaches the server', async () => {
    startSyncTracking(keys);
    await addCycle({ id: 'c1', startDate: '2026-01-01' });
    await upsertDailyLog({ date: '2026-01-02', symptoms: ['cramps'], moods: [] });
    await push(keys);
    expect(serverRows.size).toBe(2);
    expect(JSON.stringify([...serverRows.values()])).not.toMatch(/cycles|dailyLogs|cramps|2026-01-0/);
    expect(await db.syncMeta.filter((r) => r.dirty).count()).toBe(0);
  });

  it('adopts the server clock returned for a future-skewed write', async () => {
    startSyncTracking(keys);
    await addCycle({ id: 'future-clock', startDate: '2026-01-01' });
    const row = (await db.syncMeta.toArray())[0];
    await db.syncMeta.update(row.recordKey, { updatedAt: '2999-01-01T00:00:00.000Z' });
    const canonical = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve(
        json({ ok: true, records: [{ recordKey: row.recordKey, updatedAt: canonical }] }),
      ),
    );

    await push(keys);
    expect(await db.syncMeta.get(row.recordKey)).toMatchObject({
      dirty: false,
      updatedAt: canonical,
    });
  });

  it('round-trips the full record set and prefs to a fresh device', async () => {
    // Device A: existing data, then sync enabled.
    setBbtUnit('F');
    await addCycle({ id: 'c1', startDate: '2026-01-01' });
    await upsertDailyLog({ date: '2026-01-02', symptoms: ['cramps'], moods: [] });
    startSyncTracking(keys);
    await seedOutbox(keys);
    await push(keys);

    // Device B: same phrase, empty DB.
    startSyncTracking(null);
    await deleteAll();
    clearPreferences();
    expect(await getCycles()).toHaveLength(0);

    startSyncTracking(keys);
    const applied = await pull(keys);
    expect(applied).toBe(3); // 2 records + prefs
    expect((await getCycles()).map((c) => c.id)).toEqual(['c1']);
    expect((await getDailyLog('2026-01-02'))?.symptoms).toEqual(['cramps']);
    expect(exportPreferences().bbtUnit).toBe('F');
    // Applying a pull must not re-dirty the outbox (no echo ping-pong).
    expect(await db.syncMeta.filter((r) => r.dirty).count()).toBe(0);
  });

  it('applies only strictly newer remote records (LWW)', async () => {
    startSyncTracking(keys);
    await addCycle({ id: 'c1', startDate: '2026-01-01' });
    await syncNow(keys);

    // A remote update wins…
    const local = await getCycles();
    await tick();
    await addCycle({ ...local[0], startDate: '2026-02-02' });
    await push(keys);
    // …but pulling our own echo back changes nothing.
    expect((await syncNow(keys)).applied).toBe(0);
    expect((await getCycles())[0].startDate).toBe('2026-02-02');

    // A stale envelope (older updatedAt) on the server can't clobber local.
    for (const [k, row] of serverRows) {
      serverRows.set(k, { ...row, updatedAt: '2000-01-01T00:00:00.000Z', serverSeq: ++serverSeq });
    }
    localStorage.removeItem(`lumen.sync.lastSeq.${keys.accountId}`); // force full re-pull
    expect((await pull(keys))).toBe(0);
    expect((await getCycles())[0].startDate).toBe('2026-02-02');
  });

  it('deletes travel as tombstones, including journey resets', async () => {
    startSyncTracking(keys);
    await savePregnancyProfile({ id: 'current', dueDate: '2026-09-01', createdAt: '2026-01-01' } as never);
    await addKickSession({ id: 'k1', date: '2026-06-01', startedAt: '2026-06-01T10:00:00Z', kicks: [] } as never);
    await syncNow(keys);
    expect([...serverRows.values()].every((r) => !r.deleted)).toBe(true);

    await tick();
    await clearPregnancyProfile(); // clearStore path → per-record tombstones
    await push(keys);
    expect([...serverRows.values()].filter((r) => r.deleted)).toHaveLength(2);

    // Fresh device pulls: tombstoned records never materialise.
    startSyncTracking(null);
    await deleteAll();
    startSyncTracking(keys);
    await pull(keys);
    expect(await db.pregnancyProfile.count()).toBe(0);
    expect(await db.kickSessions.count()).toBe(0);
  });

  it('a newer write resurrects a tombstoned record (update beats older delete)', async () => {
    startSyncTracking(keys);
    await addCycle({ id: 'c1', startDate: '2026-01-01' });
    await push(keys);
    await tick();
    const { deleteRecord } = await import('./storage');
    await deleteRecord('cycles', 'c1'); // tracked delete → tombstone
    await push(keys);
    await tick();
    await addCycle({ id: 'c1', startDate: '2026-05-05' }); // later re-add wins
    await push(keys);

    startSyncTracking(null);
    await deleteAll();
    startSyncTracking(keys);
    await pull(keys);
    expect((await getCycles()).map((c) => c.startDate)).toEqual(['2026-05-05']);
  });

  it('tolerates records from an unknown future store without dropping them', async () => {
    startSyncTracking(keys);
    await addCycle({ id: 'c1', startDate: '2026-01-01' });
    await push(keys);
    // A newer app version elsewhere synced a store this version doesn't know.
    const { encryptRecord } = await import('@/src/crypto/envelope');
    const future = await encryptRecord(
      keys,
      { store: 'futureStore', key: 'f1', value: { shiny: true } },
      { updatedAt: new Date().toISOString() },
    );
    serverRows.set(future.recordKey, { ...future, serverSeq: ++serverSeq });

    startSyncTracking(null);
    await deleteAll();
    startSyncTracking(keys);
    await pull(keys); // must not throw on the unknown store
    expect((await getCycles()).map((c) => c.id)).toEqual(['c1']); // known records applied
    // The unknown record's envelope and clock are kept, not silently dropped.
    expect(await db.syncMeta.get(future.recordKey)).toMatchObject({ dirty: false });
  });

  it('a failed push keeps rows dirty so a retry delivers them', async () => {
    startSyncTracking(keys);
    await addCycle({ id: 'c1', startDate: '2026-01-01' });
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve(new Response('{"error":"boom"}', { status: 500 })),
    );
    await expect(push(keys)).rejects.toThrow();
    expect(await db.syncMeta.filter((r) => r.dirty).count()).toBe(1);
    expect(serverRows.size).toBe(0);

    await push(keys); // retry succeeds
    expect(serverRows.size).toBe(1);
    expect(await db.syncMeta.filter((r) => r.dirty).count()).toBe(0);
  });

  it('queues a prefs record when a preference changes', async () => {
    startSyncTracking(keys);
    setBbtUnit('F');
    await vi.waitFor(async () => {
      expect(await db.syncMeta.filter((r) => r.dirty).count()).toBe(1);
    });
  });

  it('notifies the outbox listener on tracked writes (drives the debounced push)', async () => {
    const { onOutboxChanged } = await import('./storage');
    const listener = vi.fn();
    onOutboxChanged(listener);
    try {
      await addCycle({ id: 'c1', startDate: '2026-01-01' }); // tracking off → silent
      expect(listener).not.toHaveBeenCalled();
      startSyncTracking(keys);
      await addCycle({ id: 'c2', startDate: '2026-02-01' });
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      onOutboxChanged(null);
    }
  });

  it('enableSync on a second device pulls before seeding, so remote prefs survive', async () => {
    // Device A: sync on with non-default prefs and a cycle.
    setBbtUnit('F');
    startSyncTracking(keys);
    await seedOutbox(keys);
    await push(keys);

    // Device B: fresh, default prefs, enables sync with the same phrase.
    startSyncTracking(null);
    await deleteAll();
    clearPreferences();
    await tick();
    await enableSync(keys);

    expect(isSyncEnabled()).toBe(true);
    expect(exportPreferences().bbtUnit).toBe('F'); // remote prefs won, not clobbered
    const serverPayloads = await Promise.all(
      [...serverRows.values()].map(async (r) => (await import('@/src/crypto/envelope')).decryptRecord(keys, r)),
    );
    const prefRows = serverPayloads.filter((p) => p.store === 'prefs');
    expect(prefRows).toHaveLength(1);
    expect((prefRows[0].value as { bbtUnit: string }).bbtUnit).toBe('F');
  });

  it('restoreSync pulls the account onto a fresh device and enables tracking', async () => {
    startSyncTracking(keys);
    await addCycle({ id: 'c1', startDate: '2026-01-01' });
    await push(keys);

    startSyncTracking(null);
    await deleteAll();
    const applied = await restoreSync(keys);
    expect(applied).toBe(1);
    expect(isSyncEnabled()).toBe(true);
    expect((await getCycles()).map((c) => c.id)).toEqual(['c1']);
    // Tracking is live: a new write queues for the next push.
    await upsertDailyLog({ date: '2026-01-05', symptoms: [], moods: [] });
    expect(await db.syncMeta.filter((r) => r.dirty).count()).toBe(1);
  });

  it('disableSync with deleteServerCopy wipes the server and stops tracking', async () => {
    await enableSync(keys);
    await addCycle({ id: 'c1', startDate: '2026-01-01' });
    await push(keys);
    expect(serverRows.size).toBeGreaterThan(0);

    await disableSync(keys, { deleteServerCopy: true });
    expect(serverRows.size).toBe(0);
    expect(isSyncEnabled()).toBe(false);
    expect(await db.syncMeta.count()).toBe(0);
    // Writes no longer queue.
    await addCycle({ id: 'c2', startDate: '2026-02-01' });
    expect(await db.syncMeta.count()).toBe(0);
  });

  it('a mid-push write stays dirty for the next round', async () => {
    startSyncTracking(keys);
    await addCycle({ id: 'c1', startDate: '2026-01-01' });
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementationOnce(async (url, init) => {
      // A user write lands while the push request is in flight.
      await tick();
      await addCycle({ id: 'c1', startDate: '2026-03-03' });
      return fakeFetch(String(url), init as RequestInit);
    });
    await push(keys);
    // Drained in a later chunk, so the newer write reached the server.
    const decrypted = [...serverRows.values()];
    expect(decrypted).toHaveLength(1);
    const { decryptRecord } = await import('@/src/crypto/envelope');
    expect(((await decryptRecord(keys, decrypted[0])).value as { startDate: string }).startDate).toBe('2026-03-03');
  });
});
