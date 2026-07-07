import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasscodeControls } from './PasscodeControls';
import { hasVault } from '@/src/security/vault-store';
import { setStorageKeys, storageIsEncrypted } from '@/src/data/storage';
import { deleteAll } from '@/src/data/repository';
import { setPasscode, hasPasscode } from '@/src/security/passcode';

// Drive the whole "turn on encryption" flow and land on the steady 'on' view.
async function enableEncryption(passcode = '1234') {
  await userEvent.type(await screen.findByLabelText('new passcode'), passcode);
  await userEvent.click(screen.getByRole('button', { name: /turn on encryption/i }));
  await userEvent.click(await screen.findByRole('button', { name: /saved my recovery phrase/i }));
}

beforeEach(async () => {
  localStorage.clear();
  setStorageKeys(null);
  await deleteAll();
});
afterEach(() => setStorageKeys(null));

describe('PasscodeControls', () => {
  it('turning on encryption creates a vault, shows the recovery phrase, and never stores the passcode', async () => {
    render(<PasscodeControls />);

    await userEvent.type(await screen.findByLabelText('new passcode'), '1234');
    await userEvent.click(screen.getByRole('button', { name: /turn on encryption/i }));

    await waitFor(() => expect(hasVault()).toBe(true));
    // Recovery-phrase screen shown for the user to save before continuing.
    await screen.findByRole('button', { name: /saved my recovery phrase/i });
    expect(JSON.stringify(localStorage)).not.toContain('1234'); // passcode never persisted
  });

  it('rejects a wrong current passcode when changing it', async () => {
    render(<PasscodeControls />);
    await userEvent.type(await screen.findByLabelText('new passcode'), '1234');
    await userEvent.click(screen.getByRole('button', { name: /turn on encryption/i }));
    await userEvent.click(await screen.findByRole('button', { name: /saved my recovery phrase/i }));

    await userEvent.click(await screen.findByRole('button', { name: /change passcode/i }));
    await userEvent.type(await screen.findByLabelText('current passcode'), 'wrong');
    await userEvent.type(screen.getByLabelText('new passcode'), '5678');
    await userEvent.click(screen.getByRole('button', { name: /change passcode/i }));

    await screen.findByText(/current passcode is incorrect/i);
  });

  it('turn off encryption decrypts data and clears the vault', async () => {
    render(<PasscodeControls />);
    await enableEncryption();
    expect(storageIsEncrypted()).toBe(true);

    await userEvent.click(await screen.findByRole('button', { name: /turn off encryption/i }));
    await userEvent.type(await screen.findByLabelText('current passcode'), '1234');
    await userEvent.click(screen.getByRole('button', { name: /decrypt and turn off/i }));

    await waitFor(() => expect(hasVault()).toBe(false));
    expect(storageIsEncrypted()).toBe(false);
    // Back at the enable form.
    await screen.findByRole('button', { name: /turn on encryption/i });
  });

  it('turn off is blocked while sync is enabled', async () => {
    render(<PasscodeControls />);
    await enableEncryption();
    localStorage.setItem('lumen.sync.enabled', '1');

    await userEvent.click(await screen.findByRole('button', { name: /turn off encryption/i }));
    await screen.findByText(/turn off sync/i);
    expect(screen.getByRole('button', { name: /decrypt and turn off/i })).toBeDisabled();
  });

  it('enabling encryption clears a legacy passcode', async () => {
    await setPasscode('9999');
    expect(hasPasscode()).toBe(true);
    render(<PasscodeControls />);

    await userEvent.click(await screen.findByRole('button', { name: /upgrade to encryption/i }));
    await enableEncryption();

    expect(hasPasscode()).toBe(false);
  });

  it('legacy passcode can be removed', async () => {
    await setPasscode('9999');
    render(<PasscodeControls />);

    await userEvent.click(await screen.findByRole('button', { name: /remove old passcode/i }));
    await userEvent.type(await screen.findByLabelText('current passcode'), '9999');
    await userEvent.click(screen.getByRole('button', { name: /remove passcode/i }));

    await waitFor(() => expect(hasPasscode()).toBe(false));
    await screen.findByRole('button', { name: /turn on encryption/i });
  });
});
