import {
  deriveKeys,
  isValidRecoveryPhrase,
  newRecoveryPhrase,
  type DerivedKeys,
} from './keys';
import { base64ToBytes, bytesToBase64 } from './encoding';

// The passcode-wrapped recovery phrase, persisted on-device. The mnemonic is
// the root of the whole key hierarchy; the passcode only unwraps it, and is
// never itself stored. Safe to persist in the clear because it's useless
// without the passcode — AES-GCM auth means a wrong passcode fails to decrypt
// rather than yielding garbage keys.
export interface WrappedVault {
  v: 1;
  iterations: number;
  salt: string; // base64, per-vault
  iv: string; // base64, per-wrap
  ciphertext: string; // base64 AES-256-GCM of the mnemonic (UTF-8)
}

// Material held in memory for an unlocked session. Never persisted.
export interface UnlockedVault {
  mnemonic: string;
  keys: DerivedKeys;
}

// OWASP 2023 floor for PBKDF2-SHA256. Higher than passcode.ts's 100k because
// this KEK guards every record, not just a screen lock. ponytail: bump when the
// floor moves; unlock re-reads the stored count so old vaults keep working.
const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
export const MIN_VAULT_PASSPHRASE_LENGTH = 16;
const enc = new TextEncoder();
const dec = new TextDecoder();

function assertStrongPassphrase(passcode: string): void {
  if (passcode.trim().length < MIN_VAULT_PASSPHRASE_LENGTH) {
    throw new Error(`Passphrase must be at least ${MIN_VAULT_PASSPHRASE_LENGTH} characters.`);
  }
}

async function deriveKek(
  passcode: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    enc.encode(passcode),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function wrap(
  mnemonic: string,
  passcode: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<WrappedVault> {
  const kek = await deriveKek(passcode, salt, PBKDF2_ITERATIONS);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, enc.encode(mnemonic));
  return {
    v: 1,
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

// Create a brand-new vault: fresh phrase wrapped under `passcode`. Returns the
// blob to persist plus the unlocked material, so the caller can start using the
// keys and show the phrase for escrow without a second passcode prompt.
export async function createVault(
  passcode: string,
): Promise<{ vault: WrappedVault; unlocked: UnlockedVault }> {
  assertStrongPassphrase(passcode);
  const mnemonic = newRecoveryPhrase();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  return { vault: await wrap(mnemonic, passcode, salt), unlocked: { mnemonic, keys: await deriveKeys(mnemonic) } };
}

// Unlock an existing vault. Throws on a wrong passcode (AES-GCM auth failure) —
// the only signal we have, since the passcode itself is never stored.
export async function unlockVault(passcode: string, vault: WrappedVault): Promise<UnlockedVault> {
  const kek = await deriveKek(passcode, base64ToBytes(vault.salt), vault.iterations);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(vault.iv) },
      kek,
      base64ToBytes(vault.ciphertext),
    );
  } catch {
    throw new Error('Incorrect passcode');
  }
  const mnemonic = dec.decode(plaintext);
  return { mnemonic, keys: await deriveKeys(mnemonic) };
}

// Re-wrap the same phrase under a new passcode (change-passcode). Fresh salt+iv;
// the caller already holds the mnemonic from an unlocked session.
export async function rewrapVault(mnemonic: string, newPasscode: string): Promise<WrappedVault> {
  assertStrongPassphrase(newPasscode);
  return wrap(mnemonic, newPasscode, crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}

// Escrow recovery: restore from the phrase alone and set a new passcode.
// Validates the phrase first so a typo can't create a vault whose keys silently
// mismatch the encrypted data.
export async function restoreVault(
  mnemonic: string,
  newPasscode: string,
): Promise<{ vault: WrappedVault; unlocked: UnlockedVault }> {
  if (!isValidRecoveryPhrase(mnemonic)) throw new Error('Invalid recovery phrase');
  return { vault: await rewrapVault(mnemonic, newPasscode), unlocked: { mnemonic, keys: await deriveKeys(mnemonic) } };
}
