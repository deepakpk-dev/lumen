import { describe, it, expect } from 'vitest';
import { createVault, unlockVault, rewrapVault, restoreVault } from './vault';
import { isValidRecoveryPhrase } from './keys';

describe('vault', () => {
  it('round-trips: unlock recovers the same phrase and key hierarchy', async () => {
    const { vault, unlocked } = await createVault('1234');
    expect(isValidRecoveryPhrase(unlocked.mnemonic)).toBe(true);
    const reopened = await unlockVault('1234', vault);
    expect(reopened.mnemonic).toBe(unlocked.mnemonic);
    // Same phrase → deterministically the same keys (proves keys.ts hierarchy).
    expect(reopened.keys.accountId).toBe(unlocked.keys.accountId);
  });

  it('rejects a wrong passcode without leaking a phrase', async () => {
    const { vault } = await createVault('1234');
    await expect(unlockVault('9999', vault)).rejects.toThrow(/Incorrect passcode/);
  });

  it('re-wraps under a new passcode: new works, old fails, phrase unchanged', async () => {
    const { unlocked } = await createVault('1234');
    const rewrapped = await rewrapVault(unlocked.mnemonic, '5678');
    const reopened = await unlockVault('5678', rewrapped);
    expect(reopened.mnemonic).toBe(unlocked.mnemonic);
    await expect(unlockVault('1234', rewrapped)).rejects.toThrow(/Incorrect passcode/);
  });

  it('restores from the phrase alone (escrow) and validates it', async () => {
    const { unlocked } = await createVault('1234');
    const { vault } = await restoreVault(unlocked.mnemonic, 'newcode');
    const reopened = await unlockVault('newcode', vault);
    expect(reopened.keys.accountId).toBe(unlocked.keys.accountId);
    await expect(restoreVault('not a real phrase', '0000')).rejects.toThrow(/Invalid recovery phrase/);
  });
});
