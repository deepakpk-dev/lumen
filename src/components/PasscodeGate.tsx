'use client';

import { useEffect, useState } from 'react';
import { hasVault, loadVault, saveVault } from '@/src/security/vault-store';
import { unlockVault, restoreVault } from '@/src/crypto/vault';
import { setStorageKeys } from '@/src/data/storage';
import { isSyncEnabled, startSyncTracking } from '@/src/data/sync-engine';
import { hasPasscode, verifyPasscode } from '@/src/security/passcode';

// 'loading' until we know which lock (if any) applies; 'open' renders the app.
// 'vault' = encrypted device (unlock installs the key before children mount).
// 'legacy' = a pre-encryption screen-lock passcode, honored until upgraded.
type Mode = 'loading' | 'open' | 'vault' | 'legacy';

export function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('loading');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [newCode, setNewCode] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time lock detection from localStorage; SSR-safe via the loading gate
    setMode(hasVault() ? 'vault' : hasPasscode() ? 'legacy' : 'open');
  }, []);

  async function handleVaultUnlock(e: React.FormEvent) {
    e.preventDefault();
    const vault = loadVault();
    if (!vault) {
      // A vault exists (hasVault() gated us here) but won't parse. Opening the
      // app now would drop into plaintext mode and hide the encrypted data —
      // steer to recovery instead.
      setError('Your saved passcode data is unreadable. Restore with your recovery phrase.');
      return;
    }
    try {
      const { keys } = await unlockVault(code, vault);
      // Install the key BEFORE children (the data provider) mount, so the first
      // hydration reads the encrypted store. Same keys drive sync tracking, so
      // writes queue for push from the very first edit of the session.
      setStorageKeys(keys);
      if (isSyncEnabled()) startSyncTracking(keys);
      setCode('');
      setMode('open');
    } catch {
      setError('Incorrect passcode');
    }
  }

  async function handleRestore(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.trim()) {
      setError('Please choose a new passcode.');
      return;
    }
    try {
      const { vault, unlocked } = await restoreVault(
        phrase.trim().toLowerCase().replace(/\s+/g, ' '),
        newCode,
      );
      saveVault(vault); // re-wrap under the new passcode
      setStorageKeys(unlocked.keys);
      if (isSyncEnabled()) startSyncTracking(unlocked.keys);
      setMode('open');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore');
    }
  }

  async function handleLegacyUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (await verifyPasscode(code)) {
      setCode('');
      setMode('open');
    } else {
      setError('Incorrect passcode');
    }
  }

  if (mode === 'loading') return null;
  if (mode === 'open') return <>{children}</>;

  const inputClass =
    'w-full rounded-md border border-neutral-300 px-3 py-2 text-center dark:border-neutral-700';

  if (mode === 'vault' && recovering) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xs flex-col justify-center p-6">
        <form onSubmit={handleRestore} className="space-y-4">
          <h1 className="text-center text-lg font-semibold">Restore with recovery phrase</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Enter your 12-word recovery phrase and choose a new passcode.
          </p>
          <textarea
            aria-label="recovery phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          />
          <input
            aria-label="new passcode"
            type="password"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="New passphrase (16+ characters)"
            className={inputClass}
          />
          {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" className="w-full rounded-md bg-rose-600 px-4 py-3 text-white">
            Restore
          </button>
          <button
            type="button"
            onClick={() => {
              setRecovering(false);
              setError('');
            }}
            className="w-full text-center text-sm text-neutral-500 underline"
          >
            Back to passcode
          </button>
        </form>
      </main>
    );
  }

  const onUnlock = mode === 'vault' ? handleVaultUnlock : handleLegacyUnlock;
  return (
    <main className="mx-auto flex min-h-screen max-w-xs flex-col justify-center p-6">
      <form onSubmit={onUnlock} className="space-y-4">
        <h1 className="text-center text-lg font-semibold">Enter passcode</h1>
        <input
          aria-label="passcode"
          type="password"
          inputMode={mode === 'legacy' ? 'numeric' : 'text'}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError('');
          }}
          className={inputClass}
        />
        {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button type="submit" className="w-full rounded-md bg-rose-600 px-4 py-3 text-white">
          Unlock
        </button>
        {mode === 'vault' && (
          <button
            type="button"
            onClick={() => {
              setRecovering(true);
              setError('');
            }}
            className="w-full text-center text-sm text-neutral-500 underline"
          >
            Forgot passcode?
          </button>
        )}
      </form>
    </main>
  );
}
