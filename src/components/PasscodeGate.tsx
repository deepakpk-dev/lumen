'use client';

import { useEffect, useState } from 'react';
import { hasVault, loadVault, saveVault } from '@/src/security/vault-store';
import { unlockVault, restoreVault } from '@/src/crypto/vault';
import { setStorageKeys } from '@/src/data/storage';
import { isSyncEnabled, startSyncTracking } from '@/src/data/sync-engine';
import { hasPasscode, verifyPasscode } from '@/src/security/passcode';
import { LumenMark } from './LumenBrand';

// 'loading' until we know which lock (if any) applies; 'open' renders the app.
// 'vault' = encrypted device (unlock installs the key before children mount).
// 'legacy' = a pre-encryption screen-lock passcode, honored until upgraded.
type Mode = 'loading' | 'open' | 'vault' | 'legacy';

const IDLE_LOCK_MS = 5 * 60 * 1000;
const BACKGROUND_LOCK_MS = 60 * 1000;

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

  useEffect(() => {
    if (mode !== 'open' || (!hasVault() && !hasPasscode())) return;

    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let backgroundTimer: ReturnType<typeof setTimeout> | undefined;
    let backgroundedAt: number | undefined;

    const lock = () => {
      setStorageKeys(null);
      startSyncTracking(null);
      setCode('');
      setError('');
      setRecovering(false);
      setMode(hasVault() ? 'vault' : 'legacy');
    };
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(lock, IDLE_LOCK_MS);
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (idleTimer) clearTimeout(idleTimer);
        if (backgroundTimer) clearTimeout(backgroundTimer);
        backgroundedAt = Date.now();
        backgroundTimer = setTimeout(lock, BACKGROUND_LOCK_MS);
      } else {
        if (backgroundTimer) clearTimeout(backgroundTimer);
        const backgroundDeadlinePassed =
          backgroundedAt !== undefined && Date.now() - backgroundedAt >= BACKGROUND_LOCK_MS;
        backgroundedAt = undefined;
        if (backgroundDeadlinePassed) {
          lock();
          return;
        }
        resetIdleTimer();
      }
    };

    resetIdleTimer();
    const activityEvents = ['pointerdown', 'keydown', 'touchstart'];
    activityEvents.forEach((event) => window.addEventListener(event, resetIdleTimer));
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (backgroundTimer) clearTimeout(backgroundTimer);
      activityEvents.forEach((event) => window.removeEventListener(event, resetIdleTimer));
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [mode]);

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

  const inputClass = 'lumen-field text-center';

  if (mode === 'vault' && recovering) {
    return (
      <main className="lumen-app lumen-page lumen-lock">
        <form onSubmit={handleRestore} className="lumen-card space-y-4">
          <LumenMark className="lumen-lock-mark" alt="Lumen" />
          <h1 className="lumen-title text-center">Restore with recovery phrase</h1>
          <p className="lumen-help">
            Enter your 12-word recovery phrase and choose a new passcode.
          </p>
          <textarea
            aria-label="recovery phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            rows={3}
            className="lumen-field"
          />
          <input
            aria-label="new passcode"
            type="password"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="New passphrase (16+ characters)"
            className={inputClass}
          />
          {error && <p className="lumen-note lumen-danger text-center" role="alert">{error}</p>}
          <button type="submit" className="lumen-button w-full">
            Restore
          </button>
          <button
            type="button"
            onClick={() => {
              setRecovering(false);
              setError('');
            }}
            className="lumen-text-link w-full justify-center"
          >
            Back to passcode
          </button>
        </form>
      </main>
    );
  }

  const onUnlock = mode === 'vault' ? handleVaultUnlock : handleLegacyUnlock;
  return (
    <main className="lumen-app lumen-page lumen-lock">
      <form onSubmit={onUnlock} className="lumen-card space-y-4">
        <LumenMark className="lumen-lock-mark" alt="Lumen" />
        <h1 className="lumen-title text-center">Enter passcode</h1>
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
        {error && <p className="lumen-note lumen-danger text-center" role="alert">{error}</p>}
        <button type="submit" className="lumen-button w-full">
          Unlock
        </button>
        {mode === 'vault' && (
          <button
            type="button"
            onClick={() => {
              setRecovering(true);
              setError('');
            }}
            className="lumen-text-link w-full justify-center"
          >
            Forgot passcode?
          </button>
        )}
      </form>
    </main>
  );
}
