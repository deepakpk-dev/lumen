import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
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
  vi.useRealTimers();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
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

  it('locks an unlocked vault and clears its session key after five idle minutes', async () => {
    const user = userEvent.setup();
    const { vault } = await createVault(TEST_PASSPHRASE);
    saveVault(vault);

    render(
      <PasscodeGate>
        <p>app</p>
      </PasscodeGate>,
    );

    await user.type(await screen.findByLabelText('passcode'), TEST_PASSPHRASE);
    await user.click(screen.getByRole('button', { name: /unlock/i }));
    expect(await screen.findByText('app')).toBeInTheDocument();

    vi.useFakeTimers();
    window.dispatchEvent(new Event('pointerdown'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });

    expect(screen.queryByText('app')).toBeNull();
    expect(screen.getByLabelText('passcode')).toBeInTheDocument();
    expect(storageIsEncrypted()).toBe(false);
  });

  it('locks an unlocked vault after one minute in the background', async () => {
    const user = userEvent.setup();
    const { vault } = await createVault(TEST_PASSPHRASE);
    saveVault(vault);

    render(
      <PasscodeGate>
        <p>app</p>
      </PasscodeGate>,
    );

    await user.type(await screen.findByLabelText('passcode'), TEST_PASSPHRASE);
    await user.click(screen.getByRole('button', { name: /unlock/i }));
    expect(await screen.findByText('app')).toBeInTheDocument();

    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    expect(document.hidden).toBe(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60 * 1000);
    });

    expect(screen.queryByText('app')).toBeNull();
    expect(storageIsEncrypted()).toBe(false);
  });

  it('locks on return when the browser suspended the background timer past its deadline', async () => {
    const user = userEvent.setup();
    const { vault } = await createVault(TEST_PASSPHRASE);
    saveVault(vault);

    render(
      <PasscodeGate>
        <p>app</p>
      </PasscodeGate>,
    );

    await user.type(await screen.findByLabelText('passcode'), TEST_PASSPHRASE);
    await user.click(screen.getByRole('button', { name: /unlock/i }));
    expect(await screen.findByText('app')).toBeInTheDocument();

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-17T12:00:00.000Z'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    vi.setSystemTime(new Date('2026-06-17T12:01:00.000Z'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.queryByText('app')).toBeNull();
    expect(storageIsEncrypted()).toBe(false);
  });
});
