'use client';

import { useEffect, useState } from 'react';
import { createVault, unlockVault, rewrapVault, MIN_VAULT_PASSPHRASE_LENGTH } from '@/src/crypto/vault';
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
        <p className="lumen-help">
          You have an old screen-lock passcode. It locks the screen but does{' '}
          <span className="font-medium">not</span> encrypt your data on this device.
        </p>
        <button
          type="button"
          onClick={() => {
            setView('off');
            setError('');
          }}
          className="lumen-button w-full"
        >
          Upgrade to encryption
        </button>
        <button
          type="button"
          onClick={() => {
            setView('legacy-remove');
            setError('');
          }}
          className="lumen-outline w-full"
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
          className="lumen-field"
        />
        {error && <p className="lumen-note lumen-danger" role="alert">{error}</p>}
        <div className="lumen-actions">
          <button
            type="submit"
            disabled={busy}
            className="lumen-button"
          >
            Remove passcode
          </button>
          <button
            type="button"
            onClick={() => {
              setView('legacy');
              setError('');
            }}
            className="lumen-outline"
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
        <p className="lumen-help">
          Your records will be stored <span className="font-medium">unencrypted</span> on this
          device, readable by anyone with access to it.
        </p>
        {syncOn && (
          <p className="lumen-note lumen-warning">
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
            className="lumen-field"
          />
        )}
        {error && <p className="lumen-note lumen-danger" role="alert">{error}</p>}
        <div className="lumen-actions">
          <button
            type="submit"
            disabled={busy || syncOn}
            className="lumen-button lumen-button-danger"
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
            className="lumen-outline"
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
        <p className="lumen-note lumen-success" role="status">
          Encryption is on. Your data is now stored encrypted on this device.
        </p>
        <div className="lumen-panel lumen-warning">
          <p className="text-sm">
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
          className="lumen-button w-full"
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
          className="lumen-field"
        />
        <input
          aria-label="new passcode"
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        placeholder="New passphrase (16+ characters)"
          className="lumen-field"
        />
        {error && <p className="lumen-note lumen-danger" role="alert">{error}</p>}
        <div className="lumen-actions">
          <button
            type="submit"
            disabled={busy}
            className="lumen-button"
          >
            Change passcode
          </button>
          <button
            type="button"
            onClick={() => {
              setView('on');
              setError('');
            }}
            className="lumen-outline"
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
        <p className="lumen-help">
          Encryption is <span className="font-semibold">on</span>.
          Your data is unlocked with your passcode each time you open Lumen.
        </p>
        <button
          type="button"
          onClick={() => {
            setView('change');
            setError('');
          }}
          className="lumen-outline w-full"
        >
          Change passcode
        </button>
        <button
          type="button"
          onClick={() => {
            setView('confirm-off');
            setError('');
          }}
          className="lumen-outline lumen-outline-danger w-full"
        >
          Turn off encryption
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleEnable} className="space-y-3">
      <p className="lumen-help">
        Encrypt your data with a passcode. Without it, your data is readable by anyone with access to
        this device.
      </p>
      <label className="setup-label" htmlFor="enable-passphrase">New passcode</label>
      <p className="lumen-help" id="enable-passphrase-hint">
        Use a passphrase with at least {MIN_VAULT_PASSPHRASE_LENGTH} characters.
      </p>
      <input
        id="enable-passphrase"
        aria-label="new passcode"
        aria-describedby="enable-passphrase-hint"
        type="password"
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setError('');
        }}
        className="lumen-field"
      />
      {error && <p className="lumen-note lumen-danger" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="lumen-button w-full"
      >
        {busy ? 'Encrypting…' : 'Turn on encryption'}
      </button>
    </form>
  );
}
