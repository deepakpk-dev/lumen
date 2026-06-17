const KEY = 'lumen.passcode.hash';

export async function hashPasscode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function setPasscode(code: string): Promise<void> {
  localStorage.setItem(KEY, await hashPasscode(code));
}

export function hasPasscode(): boolean {
  return localStorage.getItem(KEY) !== null;
}

export async function verifyPasscode(code: string): Promise<boolean> {
  const stored = localStorage.getItem(KEY);
  if (!stored) return false;
  return stored === (await hashPasscode(code));
}

export function clearPasscode(): void {
  localStorage.removeItem(KEY);
}
