import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasscodeControls } from './PasscodeControls';
import { hasVault } from '@/src/security/vault-store';
import { setStorageKeys } from '@/src/data/storage';
import { deleteAll } from '@/src/data/repository';

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
});
