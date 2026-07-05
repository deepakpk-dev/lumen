import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from './db';
import { setStorageKeys, putRecord, getRecord, getAllRecords, deleteRecord, clearStore } from './storage';
import { createVault } from '@/src/crypto/vault';
import type { DerivedKeys } from '@/src/crypto/keys';

beforeEach(async () => {
  await db.cycles.clear();
  await db.records.clear();
});
afterEach(() => setStorageKeys(null));

describe('storage (plaintext mode)', () => {
  it('round-trips through the typed tables when no keys are set', async () => {
    setStorageKeys(null);
    await putRecord('cycles', 'a', { id: 'a', startDate: '2026-01-01' });
    expect(await getRecord('cycles', 'a')).toMatchObject({ startDate: '2026-01-01' });
    expect(await getAllRecords('cycles')).toHaveLength(1);
    // Plaintext mode writes to the real table, not the encrypted store.
    expect(await db.cycles.count()).toBe(1);
    expect(await db.records.count()).toBe(0);
    await deleteRecord('cycles', 'a');
    expect(await getRecord('cycles', 'a')).toBeUndefined();
  });
});

describe('storage (encrypted mode)', () => {
  let keys: DerivedKeys;
  beforeEach(async () => {
    keys = (await createVault('1234')).unlocked.keys;
    setStorageKeys(keys);
  });

  it('round-trips values through the encrypted store', async () => {
    await putRecord('dailyLogs', '2026-01-01', { date: '2026-01-01', symptoms: ['cramps'], moods: [] });
    expect(await getRecord('dailyLogs', '2026-01-01')).toMatchObject({ symptoms: ['cramps'] });
    await putRecord('dailyLogs', '2026-01-02', { date: '2026-01-02', symptoms: [], moods: ['low'] });
    expect(await getAllRecords('dailyLogs')).toHaveLength(2);
  });

  it('encrypts at rest: neither the date nor the content is readable in the row', async () => {
    await putRecord('dailyLogs', '2026-01-01', { date: '2026-01-01', symptoms: ['cramps'], moods: [] });
    const raw = JSON.stringify(await db.records.toArray());
    expect(raw).not.toContain('2026-01-01'); // the date key is HMAC'd, not stored
    expect(raw).not.toContain('cramps'); // content is inside the ciphertext
    expect(await db.dailyLogs.count()).toBe(0); // nothing in the plaintext table
  });

  it('scopes reads and clears to a single store', async () => {
    await putRecord('cycles', 'c1', { id: 'c1', startDate: '2026-01-01' });
    await putRecord('dailyLogs', '2026-01-01', { date: '2026-01-01', symptoms: [], moods: [] });
    expect(await getAllRecords('cycles')).toHaveLength(1);
    await clearStore('cycles');
    expect(await getAllRecords('cycles')).toHaveLength(0);
    expect(await getAllRecords('dailyLogs')).toHaveLength(1); // untouched
  });

  it('cannot read another vault\'s records', async () => {
    await putRecord('cycles', 'c1', { id: 'c1', startDate: '2026-01-01' });
    setStorageKeys((await createVault('1234')).unlocked.keys); // different phrase → different keys
    expect(await getAllRecords('cycles')).toHaveLength(0);
  });
});
