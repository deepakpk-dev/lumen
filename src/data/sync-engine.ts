import { db, type SyncMetaRow } from './db';
import { encryptRecord, decryptRecord, type SyncEnvelope } from '@/src/crypto/envelope';
import { authHash, type DerivedKeys } from '@/src/crypto/keys';
import {
  getAllRecords,
  putRecordRaw,
  deleteRecordRaw,
  setSyncTracking,
  notifyOutboxChanged,
} from './storage';
import {
  exportPreferences,
  importPreferences,
  onPreferencesChanged,
  type PreferencesSnapshot,
} from '@/src/settings/preferences';

// Client sync engine (design doc §5). The local Dexie DB stays the source of
// truth; this module only reconciles it with the blind server. Push drains the
// dirty outbox (`syncMeta`), pull applies remote envelopes under per-record
// last-write-wins, `lastSeq` marks the incremental-pull high-water mark.

// Matches the server's MAX_RECORDS cap on /push.
const PUSH_CHUNK = 500;

// The 8 syncable Dexie stores and how to read each record's key (design §2).
const STORE_KEYS: Record<string, string> = {
  cycles: 'id',
  dailyLogs: 'date',
  pregnancyProfile: 'id',
  kickSessions: 'id',
  contractionSessions: 'id',
  postpartumProfile: 'id',
  epdsEntries: 'id',
  programProgress: 'programSlug',
};

// Preferences sync as one pseudo-record holding the whole snapshot.
// ponytail: whole-snapshot LWW — two devices editing different prefs in the
// same window lose one side; split into per-pref records if that ever bites.
const PREFS_STORE = 'prefs';
const PREFS_KEY = 'v1';

// Sync is opt-in and coupled to the passcode vault: the vault's recovery
// phrase IS the sync credential, so there is no second place a root secret
// could live. The flag just says "this device syncs"; the keys come from the
// unlocked vault session each app open.
const ENABLED_KEY = 'lumen.sync.enabled';
const SYNCED_AT_KEY = 'lumen.sync.lastSyncedAt';

export function isSyncEnabled(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(ENABLED_KEY) === '1';
}

export function lastSyncedAt(): string | null {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem(SYNCED_AT_KEY);
}

function lastSeqKey(keys: DerivedKeys): string {
  // Per-account so restoring a different phrase can't skip its history.
  return `lumen.sync.lastSeq.${keys.accountId}`;
}

function getLastSeq(keys: DerivedKeys): number {
  return Number(localStorage.getItem(lastSeqKey(keys))) || 0;
}

// Turn tracking on/off for the session. With keys set, every repository write
// lands in the outbox and preference changes are queued too. Call with null on
// lock/disable. (Enable/restore UI drives this in phase 3d.)
export function startSyncTracking(keys: DerivedKeys | null): void {
  setSyncTracking(keys);
  onPreferencesChanged(
    keys
      ? () => {
          // Listener is sync; queueing encrypts. Fire-and-forget — a lost
          // queue write self-heals on the next preference change or seed.
          void queueRecord(keys, PREFS_STORE, PREFS_KEY, exportPreferences()).catch(() => {});
        }
      : null,
  );
}

// Encrypt one record into the outbox as dirty.
async function queueRecord(
  keys: DerivedKeys,
  store: string,
  key: string,
  value: unknown,
): Promise<void> {
  const env = await encryptRecord(keys, { store, key, value }, { updatedAt: new Date().toISOString() });
  await db.syncMeta.put({ ...env, dirty: true });
  notifyOutboxChanged();
}

// Initial full push seed (enable-sync flow): queue every existing record and
// the preferences snapshot, so the first push uploads the whole health record.
export async function seedOutbox(keys: DerivedKeys): Promise<void> {
  for (const [store, keyField] of Object.entries(STORE_KEYS)) {
    const records = await getAllRecords<Record<string, unknown>>(store);
    for (const r of records) await queueRecord(keys, store, String(r[keyField]), r);
  }
  await queueRecord(keys, PREFS_STORE, PREFS_KEY, exportPreferences());
}

async function post(path: string, keys: DerivedKeys, body: unknown): Promise<unknown> {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${keys.accountId}:${keys.authSecret}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Sync request ${path} failed (${res.status})`);
  return res.json();
}

// Idempotent account creation on the server. 409 = phrase collision with a
// different auth hash, which deriveKeys makes cryptographically impossible —
// so any non-OK response is just surfaced.
export async function registerAccount(keys: DerivedKeys): Promise<void> {
  const res = await fetch('/api/sync/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accountId: keys.accountId, authHash: await authHash(keys.authSecret) }),
  });
  if (!res.ok) throw new Error(`Sync registration failed (${res.status})`);
}

// Push: drain dirty outbox rows in server-cap-sized chunks. Dirty clears only
// when the row is unchanged since it was read, so a write that lands mid-push
// stays queued for the next round.
export async function push(keys: DerivedKeys): Promise<void> {
  for (;;) {
    const dirty = await db.syncMeta.filter((r) => r.dirty).limit(PUSH_CHUNK).toArray();
    if (dirty.length === 0) return;
    const records = dirty.map<SyncEnvelope>(({ recordKey, iv, ciphertext, updatedAt, deleted }) => ({ recordKey, iv, ciphertext, updatedAt, deleted }));
    await post('/api/sync/push', keys, { records });
    for (const r of dirty) {
      await db.syncMeta
        .where('recordKey')
        .equals(r.recordKey)
        .modify((row: SyncMetaRow) => {
          if (row.updatedAt === r.updatedAt) row.dirty = false;
        });
    }
  }
}

// Apply one remote envelope under LWW: only strictly-newer remote wins, so a
// device's own echoes (equal timestamps) and stale writes are no-ops. Returns
// whether local data changed.
async function applyRemote(keys: DerivedKeys, env: SyncEnvelope): Promise<boolean> {
  const local = await db.syncMeta.get(env.recordKey);
  if (local && local.updatedAt >= env.updatedAt) return false;
  const { store, key, value } = await decryptRecord(keys, env);
  if (store === PREFS_STORE) {
    if (!env.deleted) importPreferences(value as Partial<PreferencesSnapshot>, false);
  } else if (STORE_KEYS[store]) {
    if (env.deleted) await deleteRecordRaw(store, key);
    else await putRecordRaw(store, key, value);
  }
  // Unknown store (newer app version elsewhere): keep the envelope's clock so
  // LWW stays correct, skip the table write (design open question 5).
  await db.syncMeta.put({ ...env, dirty: false });
  return true;
}

// Pull: page through everything after lastSeq, apply, persist the new
// high-water mark per page (a crash mid-pull resumes, LWW makes re-apply safe).
// Returns how many records changed local data so the caller knows to refresh().
export async function pull(keys: DerivedKeys): Promise<number> {
  let applied = 0;
  for (;;) {
    const page = (await post('/api/sync/pull', keys, { since: getLastSeq(keys) })) as {
      records: SyncEnvelope[];
      since: number;
      more: boolean;
    };
    for (const env of page.records) {
      if (await applyRemote(keys, env)) applied++;
    }
    localStorage.setItem(lastSeqKey(keys), String(page.since));
    if (!page.more) return applied;
  }
}

// One full reconciliation: push local changes, then pull the merged state.
// Runs on app open / tab focus (SyncRunner) and on "Sync now".
export async function syncNow(keys: DerivedKeys): Promise<{ applied: number }> {
  await push(keys);
  const applied = await pull(keys);
  localStorage.setItem(SYNCED_AT_KEY, new Date().toISOString());
  return { applied };
}

// Enable on this device (first device or an additional one). Pull BEFORE
// seeding: on a second device the remote state lands locally first, so the
// seed pushes the merged result instead of clobbering remote prefs/records
// with this device's fresh-clock copies.
export async function enableSync(keys: DerivedKeys): Promise<void> {
  await registerAccount(keys);
  startSyncTracking(keys);
  await pull(keys);
  await seedOutbox(keys);
  await push(keys);
  localStorage.setItem(ENABLED_KEY, '1');
  localStorage.setItem(SYNCED_AT_KEY, new Date().toISOString());
}

// Restore flow (fresh device, phrase just entered): no seed — there is nothing
// local worth pushing yet, and tracking picks up everything from here on.
// ponytail: data that existed on this device BEFORE the restore stays
// local-only; sync it by re-saving it. Fine for the fresh-device case this
// flow is for.
export async function restoreSync(keys: DerivedKeys): Promise<number> {
  await registerAccount(keys);
  startSyncTracking(keys);
  const applied = await pull(keys);
  localStorage.setItem(ENABLED_KEY, '1');
  localStorage.setItem(SYNCED_AT_KEY, new Date().toISOString());
  return applied;
}

// Server half of "Delete all data" and of "turn off sync + forget me".
export async function deleteAccount(keys: DerivedKeys): Promise<void> {
  await post('/api/sync/delete-account', keys, {});
}

// Stop syncing on this device. Local data is untouched; optionally wipe the
// server copy too (the caller confirms that with the user).
export async function disableSync(
  keys: DerivedKeys | null,
  opts: { deleteServerCopy: boolean },
): Promise<void> {
  if (opts.deleteServerCopy && keys) await deleteAccount(keys);
  startSyncTracking(null);
  localStorage.removeItem(ENABLED_KEY);
  localStorage.removeItem(SYNCED_AT_KEY);
  await db.syncMeta.clear();
}

// Forget all client-side sync state (enabled flag, outbox, pull cursors).
// Part of the local wipe; DataControls calls delete-account first when needed.
export async function clearSyncState(): Promise<void> {
  await db.syncMeta.clear();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(ENABLED_KEY);
    localStorage.removeItem(SYNCED_AT_KEY);
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('lumen.sync.lastSeq.')) localStorage.removeItem(key);
    }
  }
}
