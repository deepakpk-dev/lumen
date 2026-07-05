import { generateMnemonic, mnemonicToSeed, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { bytesToHex } from './encoding';

// Everything a device needs to sync. `encKey` and `keyMacKey` are non-extractable
// CryptoKeys that never leave the device; `accountId` and `authSecret` are the
// only values the server ever sees (and it stores only a hash of authSecret).
export interface DerivedKeys {
  accountId: string; // opaque public locator (hex)
  authSecret: string; // bearer secret proving ownership (hex)
  encKey: CryptoKey; // AES-256-GCM, never leaves the device
  keyMacKey: CryptoKey; // HMAC-SHA-256 for opaque record keys
}

// Fixed application salt for HKDF domain separation. Public by design — HKDF
// security rests on the seed's entropy, not salt secrecy.
const HKDF_SALT = new TextEncoder().encode('lumen/hkdf/salt/v1');

// ponytail: accountId/authSecret use hex, not base32 — an opaque string is an
// opaque string, and hex needs no encoder. Swap to base32 only if these ever
// need to be human-transcribed.

export function newRecoveryPhrase(): string {
  return generateMnemonic(wordlist, 128); // 12 words, 128-bit entropy
}

export function isValidRecoveryPhrase(mnemonic: string): boolean {
  return validateMnemonic(mnemonic, wordlist);
}

function label(s: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(s);
}

async function hkdfBase(seed: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', seed, 'HKDF', false, ['deriveBits', 'deriveKey']);
}

async function deriveBits(base: CryptoKey, info: string, bits: number): Promise<Uint8Array> {
  const buf = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: HKDF_SALT, info: label(info) },
    base,
    bits,
  );
  return new Uint8Array(buf);
}

// Derive the full key hierarchy from a recovery phrase. Throws on an invalid
// phrase rather than silently deriving garbage keys.
export async function deriveKeys(mnemonic: string, passphrase = ''): Promise<DerivedKeys> {
  if (!isValidRecoveryPhrase(mnemonic)) {
    throw new Error('Invalid recovery phrase');
  }
  // Copy into an ArrayBuffer-backed view so it satisfies WebCrypto's BufferSource.
  const seed = new Uint8Array(await mnemonicToSeed(mnemonic, passphrase));
  const base = await hkdfBase(seed);

  const accountId = bytesToHex(await deriveBits(base, 'lumen/account-id/v1', 128));
  const authSecret = bytesToHex(await deriveBits(base, 'lumen/auth/v1', 256));

  const encKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: HKDF_SALT, info: label('lumen/enc/v1') },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  const keyMacKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: HKDF_SALT, info: label('lumen/keymac/v1') },
    base,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  return { accountId, authSecret, encKey, keyMacKey };
}

// What the server stores for auth: it can verify a caller owns the account
// without ever being able to recover authSecret (and thus the seed).
export async function authHash(authSecret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(authSecret));
  return bytesToHex(new Uint8Array(digest));
}
