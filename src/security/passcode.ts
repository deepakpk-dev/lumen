const KEY = 'lumen.passcode.hash';
const PBKDF2_PREFIX = 'pbkdf2-sha256';
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;

export async function hashPasscode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function derivePasscodeHash(
  code: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(code),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      iterations,
    },
    keyMaterial,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function setPasscode(code: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derivePasscodeHash(code, salt);
  localStorage.setItem(
    KEY,
    `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${hash}`,
  );
}

export function hasPasscode(): boolean {
  return localStorage.getItem(KEY) !== null;
}

export async function verifyPasscode(code: string): Promise<boolean> {
  const stored = localStorage.getItem(KEY);
  if (!stored) return false;
  const [prefix, iterations, salt, hash] = stored.split('$');
  if (prefix !== PBKDF2_PREFIX || !iterations || !salt || !hash) {
    // Legacy unsalted SHA-256 record: verify, then upgrade to PBKDF2 on success.
    const ok = constantTimeEqual(stored, await hashPasscode(code));
    if (ok) await setPasscode(code);
    return ok;
  }
  const iterCount = Number(iterations);
  if (!Number.isInteger(iterCount) || iterCount < 1) return false;
  try {
    const candidate = await derivePasscodeHash(code, base64ToBytes(salt), iterCount);
    const ok = constantTimeEqual(hash, candidate);
    // Re-hash with the current parameters if the stored record used an older
    // iteration count, so a future PBKDF2_ITERATIONS bump never locks users out.
    if (ok && iterCount !== PBKDF2_ITERATIONS) await setPasscode(code);
    return ok;
  } catch {
    return false;
  }
}

export function clearPasscode(): void {
  localStorage.removeItem(KEY);
}
