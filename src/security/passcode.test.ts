import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearPasscode,
  hashPasscode,
  hasPasscode,
  setPasscode,
  verifyPasscode,
} from './passcode';

beforeEach(() => {
  localStorage.clear();
});

describe('passcode', () => {
  it('reports no passcode initially', () => {
    expect(hasPasscode()).toBe(false);
  });

  it('sets and verifies a passcode without storing it in cleartext', async () => {
    await setPasscode('1234');
    expect(hasPasscode()).toBe(true);
    expect(await verifyPasscode('1234')).toBe(true);
    expect(await verifyPasscode('0000')).toBe(false);
    expect(JSON.stringify(localStorage)).not.toContain('1234');
  });

  it('does not store a fast unsalted hash of the passcode', async () => {
    await setPasscode('1234');
    const stored = localStorage.getItem('lumen.passcode.hash');
    expect(stored).toBeTruthy();
    expect(stored).not.toBe(await hashPasscode('1234'));
  });

  it('clears a passcode', async () => {
    await setPasscode('1234');
    clearPasscode();
    expect(hasPasscode()).toBe(false);
  });

  it('verifies and upgrades a legacy unsalted SHA-256 passcode', async () => {
    localStorage.setItem('lumen.passcode.hash', await hashPasscode('1234'));

    expect(await verifyPasscode('1234')).toBe(true);

    const upgraded = localStorage.getItem('lumen.passcode.hash');
    expect(upgraded?.startsWith('pbkdf2-sha256$')).toBe(true);
    // Still verifies after the silent upgrade.
    expect(await verifyPasscode('1234')).toBe(true);
    expect(await verifyPasscode('0000')).toBe(false);
  });

  it('verifies a passcode hashed with a different iteration count and re-hashes it', async () => {
    const record = await pbkdf2Record('1234', 1000);
    localStorage.setItem('lumen.passcode.hash', record);

    expect(await verifyPasscode('1234')).toBe(true);

    const upgraded = localStorage.getItem('lumen.passcode.hash');
    expect(upgraded).not.toBe(record);
    expect(upgraded?.startsWith('pbkdf2-sha256$100000$')).toBe(true);
  });
});

// Builds a valid PBKDF2 record string at an arbitrary iteration count, matching
// the storage format produced by setPasscode.
async function pbkdf2Record(code: string, iterations: number): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(code),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    256,
  );
  const b64 = (b: Uint8Array) =>
    btoa(String.fromCharCode(...Array.from(b)));
  return `pbkdf2-sha256$${iterations}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}
