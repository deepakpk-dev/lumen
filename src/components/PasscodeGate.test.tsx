import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasscodeGate } from './PasscodeGate';
import { createVault, unlockVault } from '@/src/crypto/vault';
import { saveVault, loadVault } from '@/src/security/vault-store';
import { setStorageKeys, setSyncTracking, storageIsEncrypted } from '@/src/data/storage';

const TEST_PASSPHRASE = 'violet-river-sunrise';
const NEW_PASSPHRASE = 'marigold-cloud-path';

// The storage session/tracking are module-level; leaking them flips later tests
// into the wrong mode.
beforeEach(() => {
  localStorage.clear();
  setStorageKeys(null);
  setSyncTracking(null);
});
afterEach(() => {
  localStorage.clear();
  setStorageKeys(null);
  setSyncTracking(null);
});

describe('PasscodeGate', () => {
  it('renders the lock, rejects a wrong passcode, unlocks on the right one', async () => {
    const { vault } = await createVault(TEST_PASSPHRASE);
    saveVault(vault);

    render(
      <PasscodeGate>
        <p>app</p>
      </PasscodeGate>,
    );

    // Children hidden while locked.
    expect(await screen.findByLabelText('passcode')).toBeInTheDocument();
    expect(screen.queryByText('app')).toBeNull();

    await userEvent.type(screen.getByLabelText('passcode'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: /unlock/i }));
    expect(await screen.findByText(/incorrect passcode/i)).toBeInTheDocument();
    expect(screen.queryByText('app')).toBeNull();

    await userEvent.clear(screen.getByLabelText('passcode'));
    await userEvent.type(screen.getByLabelText('passcode'), TEST_PASSPHRASE);
    await userEvent.click(screen.getByRole('button', { name: /unlock/i }));

    expect(await screen.findByText('app')).toBeInTheDocument();
    expect(storageIsEncrypted()).toBe(true); // key installed before children mount
  });

  it('restore path: valid phrase + new passcode re-wraps the vault and opens', async () => {
    const { vault, unlocked } = await createVault(TEST_PASSPHRASE);
    saveVault(vault);

    render(
      <PasscodeGate>
        <p>app</p>
      </PasscodeGate>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /forgot passcode/i }));
    await userEvent.click(screen.getByLabelText(/recovery phrase/i));
    await userEvent.paste(unlocked.mnemonic);
    await userEvent.type(screen.getByLabelText(/new passcode/i), NEW_PASSPHRASE);
    await userEvent.click(screen.getByRole('button', { name: /^restore$/i }));

    expect(await screen.findByText('app')).toBeInTheDocument();
    expect(storageIsEncrypted()).toBe(true);
    // The vault was re-wrapped under the new passcode.
    await expect(unlockVault(NEW_PASSPHRASE, loadVault()!)).resolves.toBeDefined();
  });

  it('corrupt vault blob steers to recovery instead of opening plaintext', async () => {
    localStorage.setItem('lumen.vault', '{not json'); // hasVault() true, loadVault() null

    render(
      <PasscodeGate>
        <p>app</p>
      </PasscodeGate>,
    );

    await userEvent.type(await screen.findByLabelText('passcode'), 'anything');
    await userEvent.click(screen.getByRole('button', { name: /unlock/i }));

    expect(await screen.findByText(/unreadable|restore/i)).toBeInTheDocument();
    expect(screen.queryByText('app')).toBeNull(); // never silently opens plaintext
    expect(storageIsEncrypted()).toBe(false);
  });
});
