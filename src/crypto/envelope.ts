import type { DerivedKeys } from './keys';
import { base64ToBytes, bytesToBase64, bytesToHex } from './encoding';

// The shape stored on the server / sent on the wire. `recordKey` is opaque; the
// real store+key live inside the ciphertext, so the server never learns which
// dates or life stages a user has data for.
export interface SyncEnvelope {
  recordKey: string; // HMAC(keyMacKey, `${store}:${key}`) as hex
  iv: string; // base64, random 96-bit per write
  ciphertext: string; // base64 AES-256-GCM
  updatedAt: string; // ISO timestamp — the last-write-wins clock
  deleted: boolean; // tombstone
}

export interface PlainRecord {
  store: string;
  key: string;
  value: unknown; // the domain object (null for tombstones)
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Stable, opaque server-side key for a record. Deterministic for a given phrase
// so writes to the same record land on the same row across devices.
export async function opaqueRecordKey(
  keys: DerivedKeys,
  store: string,
  key: string,
): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', keys.keyMacKey, encoder.encode(`${store}:${key}`));
  return bytesToHex(new Uint8Array(sig));
}

export async function encryptRecord(
  keys: DerivedKeys,
  record: PlainRecord,
  meta: { updatedAt: string; deleted?: boolean },
): Promise<SyncEnvelope> {
  const recordKey = await opaqueRecordKey(keys, record.store, record.key);
  const deleted = meta.deleted ?? false;
  // Tombstones carry no value — nothing about a deleted record's content leaks.
  const payload: PlainRecord = { store: record.store, key: record.key, value: deleted ? null : record.value };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    keys.encKey,
    encoder.encode(JSON.stringify(payload)),
  );
  return {
    recordKey,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    updatedAt: meta.updatedAt,
    deleted,
  };
}

// Recovers the real store/key/value from an envelope. Throws (AES-GCM auth
// failure) if the ciphertext was tampered with or decrypted with the wrong key.
export async function decryptRecord(keys: DerivedKeys, env: SyncEnvelope): Promise<PlainRecord> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(env.iv) },
    keys.encKey,
    base64ToBytes(env.ciphertext),
  );
  return JSON.parse(decoder.decode(plaintext)) as PlainRecord;
}
