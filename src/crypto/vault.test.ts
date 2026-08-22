import { describe, it, expect } from 'vitest';
import { createVault, unlockVault, rewrapVault, restoreVault } from './vault';
import { isValidRecoveryPhrase } from './keys';

const PASSPHRASE = 'violet-river-sunrise';
const OTHER_PASSPHRASE = 'marigold-cloud-path';

describe('vault', () => {
  it('round-trips: unlock recovers the same phrase and key hierarchy', async () => {
    const { vault, unlocked } = await createVault(PASSPHRASE);
    expect(isValidRecoveryPhrase(unlocked.mnemonic)).toBe(true);
    const reopened = await unlockVault(PASSPHRASE, vault);
    expect(reopened.mnemonic).toBe(unlocked.mnemonic);
    // Same phrase → deterministically the same keys (proves keys.ts hierarchy).
    expect(reopened.keys.accountId).toBe(unlocked.keys.accountId);
  });

  it('rejects a wrong passcode without leaking a phrase', async () => {
    const { vault } = await createVault(PASSPHRASE);
    await expect(unlockVault(OTHER_PASSPHRASE, vault)).rejects.toThrow(/Incorrect passcode/);
  });

  it('re-wraps under a new passcode: new works, old fails, phrase unchanged', async () => {
    const { unlocked } = await createVault(PASSPHRASE);
    const rewrapped = await rewrapVault(unlocked.mnemonic, OTHER_PASSPHRASE);
    const reopened = await unlockVault(OTHER_PASSPHRASE, rewrapped);
    expect(reopened.mnemonic).toBe(unlocked.mnemonic);
    await expect(unlockVault(PASSPHRASE, rewrapped)).rejects.toThrow(/Incorrect passcode/);
  });

  it('restores from the phrase alone (escrow) and validates it', async () => {
    const { unlocked } = await createVault(PASSPHRASE);
    const { vault } = await restoreVault(unlocked.mnemonic, OTHER_PASSPHRASE);
    const reopened = await unlockVault(OTHER_PASSPHRASE, vault);
    expect(reopened.keys.accountId).toBe(unlocked.keys.accountId);
    await expect(restoreVault('not a real phrase', OTHER_PASSPHRASE)).rejects.toThrow(/Invalid recovery phrase/);
  });

  it('rejects short passphrases for new and re-wrapped vaults', async () => {
    await expect(createVault('123456789012345')).rejects.toThrow(/at least 16 characters/);
    const { unlocked } = await createVault(PASSPHRASE);
    await expect(rewrapVault(unlocked.mnemonic, 'short')).rejects.toThrow(/at least 16 characters/);
  });
});
