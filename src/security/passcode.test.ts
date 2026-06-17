import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearPasscode,
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

  it('clears a passcode', async () => {
    await setPasscode('1234');
    clearPasscode();
    expect(hasPasscode()).toBe(false);
  });
});
