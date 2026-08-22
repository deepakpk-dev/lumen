'use client';

import { useEffect, useState } from 'react';
import { createVault, unlockVault, rewrapVault } from '@/src/crypto/vault';
import {
  hasVault,
  loadVault,
  saveVault,
  clearVault,
  VAULT_CHANGED_EVENT,
} from '@/src/security/vault-store';
import { encryptExistingData, decryptExistingData } from '@/src/data/repository';
import { isSyncEnabled } from '@/src/data/sync-engine';
import { hasPasscode, verifyPasscode, clearPasscode } from '@/src/security/passcode';

type View =
  | 'loading'
  | 'off'
  | 'phrase'
  | 'on'
  | 'change'
  | 'confirm-off'
  | 'legacy'
  | 'legacy-remove';

export function PasscodeControls() {
  const [view, setView] = useState<View>('loading');
  const [code, setCode] = useState('');
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [phrase, setPhrase] = useState('');

  useEffect(() => {
    // Re-derive on mount and whenever a vault is created/cleared elsewhere (e.g.
    // the Sync section's restore flow on the same page). Don't stomp the
    // transient in-flow views the user is actively in.
    const sync = () =>
      setView((v) =>
        v === 'phrase' || v === 'change' || v === 'confirm-off' || v === 'legacy-remove'
          ? v
          : hasVault()
            ? 'on'
            : hasPasscode()
              ? 'legacy'
              : 'off',
      );
    sync();
    window.addEventListener(VAULT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(VAULT_CHANGED_EVENT, sync);
  }, []);

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return setError('Please choose a passcode.');
    setBusy(true);
    setError('');
    try {
      const { vault, unlocked } = await createVault(code);
      // Encrypt everything already on the device. The vault is persisted (via
      // this callback) after the encrypted copy is verified but BEFORE the
      // plaintext is cleared, so a failed key write can't lose data.
      await encryptExistingData(unlocked.keys, () => saveVault(vault));
      // A stale pre-encryption screen-lock passcode would resurface (and shadow
      // the vault) if the vault were ever removed — drop it now that the vault
      // supersedes it.
      clearPasscode();
      setCode('');
      setPhrase(unlocked.mnemonic);
      setView('phrase');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not turn on encryption.');
    } finally {
      setBusy(false);
    }
  }

  async function handleChange(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return setError('Please choose a new passcode.');
    setBusy(true);
    setError('');
    try {
      const vault = loadVault();
      if (!vault) throw new Error('No vault found.');
      const { mnemonic } = await unlockVault(current, vault); // verifies current passcode
      saveVault(await rewrapVault(mnemonic, code));
      setCurrent('');
      setCode('');
      setView('on');
    } catch {
      setError('Current passcode is incorrect.');
    } finally {
      setBusy(false);
    }
  }

  async function handleTurnOff(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const vault = loadVault();
      if (!vault) throw new Error('No vault found.');
      // Re-verify the passcode even though the session is already unlocked, so
      // someone at an unlocked device can't silently strip encryption.
      await unlockVault(current, vault);
      await decryptExistingData(() => clearVault());
      // Belt-and-braces: a leftover legacy hash must not re-lock a now-plaintext
      // device.
      clearPasscode();
      setCurrent('');
      setView('off');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not turn off encryption.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveLegacy(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!(await verifyPasscode(current))) {
        setError('Current passcode is incorrect.');
        return;
      }
      clearPasscode();
      setCurrent('');
      setView('off');
    } finally {
      setBusy(false);
    }
  }

  if (view === 'loading') return null;

  if (view === 'legacy') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          You have an old screen-lock passcode. It locks the screen but does{' '}
          <span className="font-medium">not</span> encrypt your data on this device.
        </p>
        <button
          type="button"
          onClick={() => {
            setView('off');
            setError('');
          }}
          className="w-full rounded-md bg-rose-600 px-4 py-3 text-white"
        >
          Upgrade to encryption
        </button>
        <button
          type="button"
          onClick={() => {
            setView('legacy-remove');
            setError('');
          }}
          className="w-full rounded-md border px-4 py-3"
        >
          Remove old passcode
        </button>
      </div>
    );
  }

  if (view === 'legacy-remove') {
    return (
      <form onSubmit={handleRemoveLegacy} className="space-y-3">
        <input
          aria-label="current passcode"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current passcode"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-md bg-rose-600 px-4 py-3 text-white disabled:opacity-60"
          >
            Remove passcode
          </button>
          <button
            type="button"
            onClick={() => {
              setView('legacy');
              setError('');
            }}
            className="flex-1 rounded-md border px-4 py-3"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  if (view === 'confirm-off') {
    const syncOn = isSyncEnabled();
    return (
      <form onSubmit={handleTurnOff} className="space-y-3">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Your records will be stored <span className="font-medium">unencrypted</span> on this
          device, readable by anyone with access to it.
        </p>
        {syncOn && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Turn off sync first (in the Sync section below) — sync uses your recovery phrase, so it
            can&apos;t stay on without encryption.
          </p>
        )}
        {!syncOn && (
          <input
            aria-label="current passcode"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current passcode"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          />
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy || syncOn}
            className="flex-1 rounded-md bg-red-600 px-4 py-3 text-white disabled:opacity-60"
          >
            Decrypt and turn off
          </button>
          <button
            type="button"
            onClick={() => {
              setView('on');
              setCurrent('');
              setError('');
            }}
            className="flex-1 rounded-md border px-4 py-3"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  if (view === 'phrase') {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-green-700 dark:text-green-400">
          Encryption is on. Your data is now stored encrypted on this device.
        </p>
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-xs text-amber-900 dark:text-amber-200">
            Write down your recovery phrase and keep it somewhere safe. It is the{' '}
            <span className="font-semibold">only</span> way back in if you forget your passcode — we
            can&apos;t reset it for you.
          </p>
          <p className="mt-2 select-all font-mono text-sm leading-relaxed">{phrase}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPhrase('');
            setView('on');
          }}
          className="w-full rounded-md bg-rose-600 px-4 py-3 text-white"
        >
          I&apos;ve saved my recovery phrase
        </button>
      </div>
    );
  }

  if (view === 'change') {
    return (
      <form onSubmit={handleChange} className="space-y-3">
        <input
          aria-label="current passcode"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current passcode"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
        />
        <input
          aria-label="new passcode"
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        placeholder="New passphrase (16+ characters)"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-md bg-rose-600 px-4 py-3 text-white disabled:opacity-60"
          >
            Change passcode
          </button>
          <button
            type="button"
            onClick={() => {
              setView('on');
              setError('');
            }}
            className="flex-1 rounded-md border px-4 py-3"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  if (view === 'on') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Encryption is <span className="font-medium text-green-700 dark:text-green-400">on</span>.
          Your data is unlocked with your passcode each time you open Lumen.
        </p>
        <button
          type="button"
          onClick={() => {
            setView('change');
            setError('');
          }}
          className="w-full rounded-md border px-4 py-3"
        >
          Change passcode
        </button>
        <button
          type="button"
          onClick={() => {
            setView('confirm-off');
            setError('');
          }}
          className="w-full rounded-md border px-4 py-3 text-red-700 dark:text-red-400"
        >
          Turn off encryption
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleEnable} className="space-y-3">
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        Encrypt your data with a passcode. Without it, your data is readable by anyone with access to
        this device.
      </p>
      <input
        aria-label="new passcode"
        type="password"
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setError('');
        }}
        placeholder="Choose a passphrase (16+ characters)"
        className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-rose-600 px-4 py-3 text-white disabled:opacity-60"
      >
        {busy ? 'Encrypting…' : 'Turn on encryption'}
      </button>
    </form>
  );
}
