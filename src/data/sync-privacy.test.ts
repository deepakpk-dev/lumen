import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  addContractionSession,
  addCycle,
  addEpdsEntry,
  addKickSession,
  clearPregnancyProfile,
  deleteAll,
  savePostpartumProfile,
  savePregnancyProfile,
  saveProgramProgress,
  upsertDailyLog,
} from './repository';
import { disableSync, enableSync, startSyncTracking, syncNow } from './sync-engine';
import { deriveKeys, newRecoveryPhrase } from '@/src/crypto/keys';
import type { SyncEnvelope } from '@/src/crypto/envelope';
import { clearPreferences, setLifeStage, setReminderPrefs, DEFAULT_REMINDER_PREFS } from '@/src/settings/preferences';

// THE zero-knowledge guarantee, enforced in CI (design doc, locked decision 2):
// run a full sync lifecycle over every store and inspect every byte that
// would have gone to the server — URLs, headers, and bodies. None of it may
// contain a store name, record id, health date, symptom, or preference value.
// If any code path ever ships plaintext (a "convenience" field, a debug log
// in a body, an unencrypted pseudo-record), this fails.

// Distinctive values planted across all 8 stores + prefs. Long enough that
// random base64/hex can't contain them by chance. Health dates are kept away
// from "today" because envelope updatedAt timestamps legitimately carry the
// current date — timestamps are accepted metadata, contents are not.
const MARKERS = [
  // store names (the wire must only see HMAC'd record keys)
  'cycles',
  'dailyLogs',
  'pregnancyProfile',
  'kickSessions',
  'contractionSessions',
  'postpartumProfile',
  'epdsEntries',
  'programProgress',
  'prefs',
  // record keys and health dates
  'cycle-marker-id',
  'kick-marker-id',
  'contraction-marker-id',
  'epds-marker-id',
  '2025-03-10',
  '2025-03-11',
  '2025-11-20',
  // field values
  'cramps-marker',
  'anxious-marker',
  'very-private-note',
  'understanding-your-cycle',
  'lifeStage',
  'breastfeeding',
];

let requests: string[]; // every request, serialized: url + headers + body

let serverRows: Map<string, SyncEnvelope & { serverSeq: number }>;
let serverSeq: number;

function fakeFetch(url: string, init?: RequestInit): Promise<Response> {
  requests.push(JSON.stringify({ url, headers: init?.headers, body: init?.body ?? null }));
  const body = JSON.parse(String(init?.body ?? 'null')) as Record<string, unknown>;
  const json = (x: unknown) => new Response(JSON.stringify(x), { status: 200 });
  if (url.endsWith('/register') || url.endsWith('/delete-account')) {
    if (url.endsWith('/delete-account')) serverRows = new Map();
    return Promise.resolve(json({ ok: true }));
  }
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
  throw new Error(`unexpected fetch ${url}`);
}

beforeEach(async () => {
  requests = [];
  serverRows = new Map();
  serverSeq = 0;
  vi.stubGlobal('fetch', vi.fn(fakeFetch));
  localStorage.clear();
  await deleteAll();
});

afterEach(() => {
  startSyncTracking(null);
  clearPreferences();
  vi.unstubAllGlobals();
});

describe('zero-knowledge wire format', () => {
  it('a full lifecycle over every store leaks no plaintext to the server', async () => {
    const keys = await deriveKeys(newRecoveryPhrase());

    // Existing data in every store, then enable (exercises the seed path).
    await addCycle({ id: 'cycle-marker-id', startDate: '2025-03-10' });
    await savePregnancyProfile({ id: 'current', dueDate: '2025-11-20', createdAt: '2025-03-10' } as never);
    await saveProgramProgress({ programSlug: 'understanding-your-cycle', completed: ['w1'] } as never);
    setLifeStage('pregnancy', '2025-03-10');
    await enableSync(keys);

    // Live writes through the tracked funnel (exercises the write-hook path).
    await upsertDailyLog({
      date: '2025-03-11',
      symptoms: ['cramps-marker'],
      moods: ['anxious-marker'],
      notes: 'very-private-note',
    } as never);
    await addKickSession({ id: 'kick-marker-id', date: '2025-03-11', startedAt: '2025-03-11T08:00:00Z' } as never);
    await addContractionSession({ id: 'contraction-marker-id', date: '2025-03-11' } as never);
    await savePostpartumProfile({ id: 'current', birthDate: '2025-11-20', breastfeeding: true } as never);
    await addEpdsEntry({ id: 'epds-marker-id', date: '2025-03-11', score: 7 } as never);
    setReminderPrefs({ ...DEFAULT_REMINDER_PREFS, periodReminder: false });

    // Deletes (tombstone path), a reconcile, and account deletion.
    await clearPregnancyProfile();
    await syncNow(keys);
    await disableSync(keys, { deleteServerCopy: true });

    // Every endpoint got traffic, so every request-building path is covered.
    const urls = requests.map((r) => (JSON.parse(r) as { url: string }).url);
    for (const endpoint of ['register', 'push', 'pull', 'delete-account']) {
      expect(urls.some((u) => u.endsWith(`/${endpoint}`)), endpoint).toBe(true);
    }

    // The actual guarantee: nothing readable in any request, ever.
    expect(requests.length).toBeGreaterThan(0);
    for (const req of requests) {
      for (const marker of MARKERS) {
        expect(req, `plaintext "${marker}" leaked to the server`).not.toContain(marker);
      }
    }
  });
});
