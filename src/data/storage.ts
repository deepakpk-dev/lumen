import { db } from './db';
import type { DerivedKeys } from '@/src/crypto/keys';
import { encryptRecord, decryptRecord, opaqueRecordKey } from '@/src/crypto/envelope';

// Generic per-record storage that transparently encrypts when a session is
// unlocked. repository.ts routes every read/write through these primitives so
// it never has to know which mode is active.
//
// - No session keys  -> plaintext: the original typed Dexie tables, unchanged.
// - Session keys set -> encrypted: one opaque-keyed `records` table. The store
//   name and record key both become HMACs, so nothing about which dates/ids/
//   stages a user has data for is readable at rest.
//
// The key lives in module memory for the session only, set on unlock (phase 3)
// and never persisted.
let session: DerivedKeys | null = null;

// Sync tracking (phase 3c): when set, every write/delete through this funnel
// also drops a ready-to-push encrypted envelope into `syncMeta` (the outbox).
// Same DerivedKeys as the vault when both are on — one recovery phrase roots
// both — so the envelope built for the encrypted store is reused verbatim.
let tracking: DerivedKeys | null = null;

export function setStorageKeys(keys: DerivedKeys | null): void {
  session = keys;
}

export function storageIsEncrypted(): boolean {
  return session !== null;
}

export function setSyncTracking(keys: DerivedKeys | null): void {
  tracking = keys;
}

// Opaque index value for a whole store. Reserved '__store__' namespace can't
// collide with a real record's `${store}:${key}` recordKey.
function storeIndex(keys: DerivedKeys, store: string): Promise<string> {
  return opaqueRecordKey(keys, '__store__', store);
}

// Raw write/delete without sync tracking. The sync engine applies remote
// records through these so a pull can never re-dirty its own outbox.
export async function putRecordRaw(store: string, key: string, value: unknown): Promise<void> {
  const keys = session;
  if (!keys) {
    await db.table(store).put(value);
    return;
  }
  const env = await encryptRecord(keys, { store, key, value }, { updatedAt: new Date().toISOString() });
  await db.records.put({ ...env, storeKey: await storeIndex(keys, store) });
}

export async function deleteRecordRaw(store: string, key: string): Promise<void> {
  const keys = session;
  if (!keys) {
    await db.table(store).delete(key);
    return;
  }
  await db.records.delete(await opaqueRecordKey(keys, store, key));
}

// Outbox entry for a local write or delete. Tombstones carry value: null.
async function trackWrite(store: string, key: string, value: unknown, deleted: boolean): Promise<void> {
  const keys = tracking;
  if (!keys) return;
  const env = await encryptRecord(
    keys,
    { store, key, value },
    { updatedAt: new Date().toISOString(), deleted },
  );
  await db.syncMeta.put({ ...env, dirty: true });
}

export async function putRecord(store: string, key: string, value: unknown): Promise<void> {
  await putRecordRaw(store, key, value);
  await trackWrite(store, key, value, false);
}

export async function getRecord<T>(store: string, key: string): Promise<T | undefined> {
  const keys = session;
  if (!keys) return (await db.table(store).get(key)) as T | undefined;
  const row = await db.records.get(await opaqueRecordKey(keys, store, key));
  if (!row) return undefined;
  return (await decryptRecord(keys, row)).value as T;
}

export async function getAllRecords<T>(store: string): Promise<T[]> {
  const keys = session;
  if (!keys) return (await db.table(store).toArray()) as T[];
  const rows = await db.records.where('storeKey').equals(await storeIndex(keys, store)).toArray();
  return Promise.all(rows.map(async (row) => (await decryptRecord(keys, row)).value as T));
}

export async function deleteRecord(store: string, key: string): Promise<void> {
  await deleteRecordRaw(store, key);
  await trackWrite(store, key, null, true);
}

// Plaintext keys of every record in a store, regardless of mode. In vault mode
// the primary keys are opaque HMACs, so the payloads are decrypted to recover
// the real keys (rare path: journey resets and sync-enable seeding).
export async function listRecordKeys(store: string): Promise<string[]> {
  const keys = session;
  if (!keys) return (await db.table(store).toCollection().primaryKeys()) as string[];
  const rows = await db.records.where('storeKey').equals(await storeIndex(keys, store)).toArray();
  return Promise.all(rows.map(async (row) => (await decryptRecord(keys, row)).key));
}

export async function clearStore(store: string): Promise<void> {
  if (tracking) {
    // Per-record deletes so every record leaves a tombstone for other devices.
    for (const key of await listRecordKeys(store)) await deleteRecord(store, key);
    return;
  }
  const keys = session;
  if (!keys) {
    await db.table(store).clear();
    return;
  }
  await db.records.where('storeKey').equals(await storeIndex(keys, store)).delete();
}
