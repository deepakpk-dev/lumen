// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';

// Route the server's query() at an in-memory real Postgres (pglite) so the
// SQL — especially the LWW upsert guard — is exercised for real, no server.
vi.mock('@/src/server/sync-db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/server/sync-db')>();
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  const ready = db.exec(actual.SCHEMA_SQL);
  return {
    ...actual,
    query: async (text: string, params?: unknown[]) => {
      await ready;
      return db.query(text, params);
    },
  };
});

import { POST as register } from '@/app/api/sync/register/route';
import { POST as push } from '@/app/api/sync/push/route';
import { POST as pull } from '@/app/api/sync/pull/route';
import { POST as deleteAccount } from '@/app/api/sync/delete-account/route';
import { deriveKeys, authHash, type DerivedKeys } from '@/src/crypto/keys';
import { encryptRecord, decryptRecord, type SyncEnvelope } from '@/src/crypto/envelope';

const PHRASE = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
const OTHER_PHRASE = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';

let keys: DerivedKeys;
let hash: string;

function req(json: unknown, auth?: string): Request {
  return new Request('http://lumen.test/api/sync', {
    method: 'POST',
    headers: auth ? { authorization: auth } : {},
    body: JSON.stringify(json),
  });
}

function bearer(k: DerivedKeys): string {
  return `Bearer ${k.accountId}:${k.authSecret}`;
}

async function pullAll(k: DerivedKeys, since = 0) {
  const res = await pull(req({ since }, bearer(k)));
  expect(res.status).toBe(200);
  return (await res.json()) as { records: SyncEnvelope[]; since: number; more: boolean };
}

beforeAll(async () => {
  keys = await deriveKeys(PHRASE);
  hash = await authHash(keys.authSecret);
});

describe('register', () => {
  it('creates an account and is idempotent', async () => {
    expect((await register(req({ accountId: keys.accountId, authHash: hash }))).status).toBe(200);
    expect((await register(req({ accountId: keys.accountId, authHash: hash }))).status).toBe(200);
  });

  it('rejects re-registration with a different authHash', async () => {
    const res = await register(req({ accountId: keys.accountId, authHash: 'f'.repeat(64) }));
    expect(res.status).toBe(409);
  });

  it('rejects malformed ids', async () => {
    expect((await register(req({ accountId: 'nope', authHash: hash }))).status).toBe(400);
    expect((await register(req({})) ).status).toBe(400);
  });
});

describe('auth', () => {
  it('rejects a missing or malformed bearer', async () => {
    expect((await pull(req({ since: 0 }))).status).toBe(401);
    expect((await pull(req({ since: 0 }, 'Bearer junk'))).status).toBe(401);
  });

  it('rejects a wrong authSecret for a real account', async () => {
    const res = await pull(
      req({ since: 0 }, `Bearer ${keys.accountId}:${'0'.repeat(64)}`),
    );
    expect(res.status).toBe(401);
  });
});

describe('push + pull', () => {
  it('round-trips an encrypted record through the server', async () => {
    const env = await encryptRecord(
      keys,
      { store: 'dailyLogs', key: '2026-07-01', value: { flow: 'medium' } },
      { updatedAt: '2026-07-01T10:00:00.000Z' },
    );
    expect((await push(req({ records: [env] }, bearer(keys)))).status).toBe(200);

    const { records, since, more } = await pullAll(keys);
    expect(records).toHaveLength(1);
    expect(more).toBe(false);
    expect(since).toBeGreaterThan(0);
    // The stored row is ciphertext + opaque key only; decrypt recovers the record.
    expect(records[0].recordKey).toBe(env.recordKey);
    const plain = await decryptRecord(keys, records[0]);
    expect(plain).toEqual({ store: 'dailyLogs', key: '2026-07-01', value: { flow: 'medium' } });
  });

  it('last write wins: an older update cannot clobber a newer one', async () => {
    const record = { store: 'dailyLogs', key: '2026-07-02', value: { flow: 'light' } };
    const newer = await encryptRecord(keys, record, { updatedAt: '2026-07-02T12:00:00.000Z' });
    const older = await encryptRecord(
      keys,
      { ...record, value: { flow: 'stale' } },
      { updatedAt: '2026-07-02T08:00:00.000Z' },
    );
    await push(req({ records: [newer] }, bearer(keys)));
    const before = (await pullAll(keys)).since;

    await push(req({ records: [older] }, bearer(keys)));
    const { records, since } = await pullAll(keys);
    expect(since).toBe(before); // no new server_seq — the stale write was skipped
    const row = records.find((r) => r.recordKey === newer.recordKey)!;
    expect((await decryptRecord(keys, row)).value).toEqual({ flow: 'light' });
  });

  it('a newer write replaces the record and surfaces in an incremental pull', async () => {
    const record = { store: 'dailyLogs', key: '2026-07-02', value: { flow: 'heavy' } };
    const newest = await encryptRecord(keys, record, { updatedAt: '2026-07-03T09:00:00.000Z' });
    const before = (await pullAll(keys)).since;

    await push(req({ records: [newest] }, bearer(keys)));
    const { records } = await pullAll(keys, before);
    expect(records).toHaveLength(1);
    expect((await decryptRecord(keys, records[0])).value).toEqual({ flow: 'heavy' });
  });

  it('stores tombstones', async () => {
    const env = await encryptRecord(
      keys,
      { store: 'dailyLogs', key: '2026-07-01', value: null },
      { updatedAt: '2026-07-04T00:00:00.000Z', deleted: true },
    );
    await push(req({ records: [env] }, bearer(keys)));
    const { records } = await pullAll(keys);
    expect(records.find((r) => r.recordKey === env.recordKey)!.deleted).toBe(true);
  });

  it('an empty incremental pull returns the same high-water mark', async () => {
    const { since } = await pullAll(keys);
    const again = await pullAll(keys, since);
    expect(again.records).toHaveLength(0);
    expect(again.since).toBe(since);
  });

  it('rejects a push that would exceed the per-account storage cap', async () => {
    // The route counts current rows + incoming length against a 50k cap. Prove
    // the guard fires without inserting 50k rows: seed the count table directly,
    // then a single-record push must be rejected with 413 and stay unstored.
    const cap = await deriveKeys(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
    await register(req({ accountId: cap.accountId, authHash: await authHash(cap.authSecret) }, ));
    const { query } = await import('@/src/server/sync-db');
    await query(
      `insert into sync_records (account_id, record_key, iv, ciphertext, updated_at, deleted)
       select $1, lpad(to_hex(g), 64, '0'), 'AAAAAAAAAAAAAAAA', 'AAAA', now(), false
       from generate_series(1, 50000) g`,
      [cap.accountId],
    );
    const env = await encryptRecord(
      cap,
      { store: 'dailyLogs', key: '2026-08-01', value: { flow: 'light' } },
      { updatedAt: '2026-08-01T00:00:00.000Z' },
    );
    const res = await push(req({ records: [env] }, bearer(cap)));
    expect(res.status).toBe(413);
    // The record was not stored — the client's row stays dirty for retry.
    const { records } = await pullAll(cap);
    expect(records.find((r) => r.recordKey === env.recordKey)).toBeUndefined();
  });

  it('rejects malformed envelopes and bad since values', async () => {
    const bad = { recordKey: 'zz', iv: 'AAAAAAAAAAAAAAAA', ciphertext: 'AAAA', updatedAt: 'now', deleted: false };
    expect((await push(req({ records: [bad] }, bearer(keys)))).status).toBe(400);
    expect((await push(req({}, bearer(keys)))).status).toBe(400);
    expect((await pull(req({ since: -1 }, bearer(keys)))).status).toBe(400);
    expect((await pull(req({ since: 'later' }, bearer(keys)))).status).toBe(400);
  });
});

describe('account isolation + delete', () => {
  let other: DerivedKeys;

  beforeAll(async () => {
    other = await deriveKeys(OTHER_PHRASE);
    await register(req({ accountId: other.accountId, authHash: await authHash(other.authSecret) }));
  });

  it('one account never sees another account\'s records', async () => {
    const { records } = await pullAll(other);
    expect(records).toHaveLength(0);
  });

  it('delete-account wipes records and revokes the credential', async () => {
    const env = await encryptRecord(
      other,
      { store: 'cycles', key: 'abc', value: { start: '2026-06-01' } },
      { updatedAt: '2026-07-01T00:00:00.000Z' },
    );
    await push(req({ records: [env] }, bearer(other)));

    expect((await deleteAccount(req({}, bearer(other)))).status).toBe(200);
    // Account gone: the same bearer no longer authenticates.
    expect((await pull(req({ since: 0 }, bearer(other)))).status).toBe(401);
    // And the first account's data is untouched.
    expect((await pullAll(keys)).records.length).toBeGreaterThan(0);
  });
});
