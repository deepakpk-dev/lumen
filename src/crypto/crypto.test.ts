import { describe, it, expect } from 'vitest';
import {
  deriveKeys,
  newRecoveryPhrase,
  isValidRecoveryPhrase,
  authHash,
} from './keys';
import { encryptRecord, decryptRecord, opaqueRecordKey } from './envelope';

// A fixed valid BIP39 mnemonic (the canonical all-"abandon" test vector).
const PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const OTHER = 'legal winner thank year wave sausage worth useful legal winner thank yellow';

describe('recovery phrase', () => {
  it('generates a valid 12-word phrase', () => {
    const m = newRecoveryPhrase();
    expect(m.trim().split(/\s+/)).toHaveLength(12);
    expect(isValidRecoveryPhrase(m)).toBe(true);
  });

  it('rejects a tampered phrase', () => {
    expect(isValidRecoveryPhrase('abandon abandon abandon')).toBe(false);
    expect(isValidRecoveryPhrase(PHRASE.replace('about', 'zebra'))).toBe(false);
  });
});

describe('deriveKeys', () => {
  it('is deterministic for the same phrase', async () => {
    const a = await deriveKeys(PHRASE);
    const b = await deriveKeys(PHRASE);
    expect(a.accountId).toBe(b.accountId);
    expect(a.authSecret).toBe(b.authSecret);
    // hex of 128-bit accountId / 256-bit authSecret
    expect(a.accountId).toMatch(/^[0-9a-f]{32}$/);
    expect(a.authSecret).toMatch(/^[0-9a-f]{64}$/);
  });

  it('gives different accounts for different phrases', async () => {
    const a = await deriveKeys(PHRASE);
    const b = await deriveKeys(OTHER);
    expect(a.accountId).not.toBe(b.accountId);
    expect(a.authSecret).not.toBe(b.authSecret);
  });

  it('separates accountId from authSecret (distinct HKDF branches)', async () => {
    const { accountId, authSecret } = await deriveKeys(PHRASE);
    expect(authSecret.startsWith(accountId)).toBe(false);
  });

  it('throws on an invalid phrase instead of deriving garbage', async () => {
    await expect(deriveKeys('not a real phrase')).rejects.toThrow(/invalid/i);
  });

  it('authHash is a deterministic SHA-256 that is not the secret itself', async () => {
    const { authSecret } = await deriveKeys(PHRASE);
    const h = await authHash(authSecret);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toBe(authSecret);
    expect(await authHash(authSecret)).toBe(h);
  });
});

describe('record encryption', () => {
  const record = {
    store: 'dailyLogs',
    key: '2026-07-01',
    value: { date: '2026-07-01', flow: 'medium', symptoms: ['Cramps'], moods: ['Sad'] },
  };

  it('round-trips store/key/value through encrypt → decrypt', async () => {
    const keys = await deriveKeys(PHRASE);
    const env = await encryptRecord(keys, record, { updatedAt: '2026-07-01T10:00:00.000Z' });
    const back = await decryptRecord(keys, env);
    expect(back).toEqual({ ...record });
  });

  it('leaks nothing in the clear: content is absent from the encrypted fields', async () => {
    const keys = await deriveKeys(PHRASE);
    const env = await encryptRecord(keys, record, { updatedAt: '2026-07-01T10:00:00.000Z' });
    // Only the encrypted parts are checked — updatedAt is deliberately-visible
    // LWW metadata (a timestamp), not record content.
    const encrypted = env.recordKey + env.iv + env.ciphertext;
    expect(encrypted).not.toContain('2026-07-01');
    expect(encrypted).not.toContain('dailyLogs');
    expect(encrypted).not.toContain('Cramps');
    expect(env.recordKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it('uses a fresh IV each time (same plaintext → different ciphertext)', async () => {
    const keys = await deriveKeys(PHRASE);
    const meta = { updatedAt: '2026-07-01T10:00:00.000Z' };
    const a = await encryptRecord(keys, record, meta);
    const b = await encryptRecord(keys, record, meta);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.recordKey).toBe(b.recordKey); // but the record identity is stable
  });

  it('cannot be decrypted with keys from a different phrase', async () => {
    const keys = await deriveKeys(PHRASE);
    const attacker = await deriveKeys(OTHER);
    const env = await encryptRecord(keys, record, { updatedAt: '2026-07-01T10:00:00.000Z' });
    await expect(decryptRecord(attacker, env)).rejects.toThrow();
  });

  it('fails closed on tampered ciphertext (AES-GCM auth)', async () => {
    const keys = await deriveKeys(PHRASE);
    const env = await encryptRecord(keys, record, { updatedAt: '2026-07-01T10:00:00.000Z' });
    const tampered = { ...env, ciphertext: 'AAAA' + env.ciphertext.slice(4) };
    await expect(decryptRecord(keys, tampered)).rejects.toThrow();
  });

  it('carries a tombstone with no value for deletes', async () => {
    const keys = await deriveKeys(PHRASE);
    const env = await encryptRecord(keys, record, {
      updatedAt: '2026-07-02T10:00:00.000Z',
      deleted: true,
    });
    expect(env.deleted).toBe(true);
    const back = await decryptRecord(keys, env);
    expect(back.value).toBeNull();
    expect(back.key).toBe('2026-07-01'); // identity still recoverable
  });

  it('opaqueRecordKey is stable per record and differs across records', async () => {
    const keys = await deriveKeys(PHRASE);
    const k1 = await opaqueRecordKey(keys, 'dailyLogs', '2026-07-01');
    const k2 = await opaqueRecordKey(keys, 'dailyLogs', '2026-07-02');
    const k3 = await opaqueRecordKey(keys, 'cycles', '2026-07-01');
    expect(k1).toBe(await opaqueRecordKey(keys, 'dailyLogs', '2026-07-01'));
    expect(new Set([k1, k2, k3]).size).toBe(3);
  });
});
