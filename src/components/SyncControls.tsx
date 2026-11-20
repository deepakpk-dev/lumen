'use client';

import { useEffect, useState } from 'react';
import { hasVault, saveVault, VAULT_CHANGED_EVENT } from '@/src/security/vault-store';
import { MIN_VAULT_PASSPHRASE_LENGTH, restoreVault } from '@/src/crypto/vault';
import { encryptExistingData } from '@/src/data/repository';
import { getStorageKeys } from '@/src/data/storage';
import {
  enableSync,
  disableSync,
  isSyncEnabled,
  lastSyncedAt,
  restoreSync,
  syncNow,
} from '@/src/data/sync-engine';

type View = 'loading' | 'novault' | 'restore' | 'off' | 'on' | 'confirm-off';

// Settings section for end-to-end encrypted sync. Sync shares the vault's
// recovery phrase, so it requires encryption to be on — the phrase the user
// saved when enabling their passcode is the one that restores their data on a
// new device.
export function SyncControls({
  onRestored,
  onSynced,
}: {
  onRestored?: () => void | Promise<void>;
  onSynced?: () => void | Promise<void>;
}) {
  const [view, setView] = useState<View>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [phrase, setPhrase] = useState('');
  const [newCode, setNewCode] = useState('');

  useEffect(() => {
    // Re-derive on mount and whenever a vault is created/cleared elsewhere (the
    // Passcode section on the same page), without stomping the transient views
    // the user is actively in.
    const sync = () =>
      setView((v) =>
        v === 'restore' || v === 'confirm-off'
          ? v
          : !hasVault()
            ? 'novault'
            : isSyncEnabled()
              ? 'on'
              : 'off',
      );
    sync();
    window.addEventListener(VAULT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(VAULT_CHANGED_EVENT, sync);
  }, []);

  async function run(action: () => Promise<void>, failMsg: string) {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : failMsg);
    } finally {
      setBusy(false);
    }
  }

  function handleEnable() {
    void run(async () => {
      const keys = getStorageKeys();
      if (!keys) throw new Error('Unlock with your passcode first.');
      await enableSync(keys);
      await onSynced?.();
      setView('on');
    }, 'Couldn’t turn on sync. Check your connection and try again.');
  }

  function handleRestore(e: React.FormEvent) {
    e.preventDefault();
    void run(async () => {
      if (!newCode.trim()) throw new Error('Choose a passphrase for this device.');
      const { vault, unlocked } = await restoreVault(
        phrase.trim().toLowerCase().replace(/\s+/g, ' '),
        newCode,
      );
      // Sets up encryption on this device with the restored phrase (any data
      // already here is migrated into the encrypted store), then pulls.
      await encryptExistingData(unlocked.keys, () => saveVault(vault));
      await restoreSync(unlocked.keys);
      setPhrase('');
      setNewCode('');
      await onRestored?.();
      setView('on');
    }, 'Couldn’t restore synced data. Check your recovery phrase and connection, then try again.');
  }

  function handleSyncNow() {
    void run(async () => {
      const keys = getStorageKeys();
      if (!keys) throw new Error('Unlock with your passcode first.');
      const { applied } = await syncNow(keys);
      if (applied > 0) await onSynced?.();
      setStatus('Data synced.');
    }, 'Couldn’t sync. Check your connection and try again.');
  }

  function handleDisable(deleteServerCopy: boolean) {
    void run(async () => {
      await disableSync(getStorageKeys(), { deleteServerCopy });
      setView('off');
    }, 'Couldn’t turn off sync. Try again.');
  }

  if (view === 'loading') return null;

  if (view === 'novault') {
    return (
      <div className="space-y-3">
        <p className="lumen-help">
          Set a passcode to turn on sync. If you already sync on another device, you can
          restore your data using its recovery phrase.
        </p>
        <button
          type="button"
          onClick={() => setView('restore')}
          className="lumen-outline w-full"
        >
          Restore from another device
        </button>
      </div>
    );
  }

  if (view === 'restore') {
    return (
      <form onSubmit={handleRestore} className="space-y-3">
        <p className="lumen-help">
          Enter the 12-word recovery phrase from your other device. Choose a new passphrase
          of at least {MIN_VAULT_PASSPHRASE_LENGTH} characters to lock Lumen on this device.
        </p>
        <label className="setup-label" htmlFor="sync-recovery-phrase">Recovery phrase</label>
        <textarea
          id="sync-recovery-phrase"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          rows={3}
          className="lumen-field"
        />
        <label className="setup-label" htmlFor="sync-passphrase">New passphrase</label>
        <input
          id="sync-passphrase"
          type="password"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          className="lumen-field"
        />
        {error && <p className="lumen-note lumen-danger" role="alert">{error}</p>}
        <div className="lumen-actions">
          <button
            type="submit"
            disabled={busy}
            className="lumen-button"
          >
            {busy ? 'Restoring synced data…' : 'Restore synced data'}
          </button>
          <button
            type="button"
            onClick={() => {
              setView('novault');
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
    return (
      <div className="lumen-panel lumen-warning space-y-3">
        <p className="text-sm">
          Turn off sync on this device? Your local data stays here. If you also delete the
          encrypted server copy, you won’t be able to restore from that copy.
        </p>
        {error && <p className="lumen-note lumen-danger" role="alert">{error}</p>}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleDisable(false)}
            className="lumen-outline w-full"
          >
            Turn off sync
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleDisable(true)}
            className="lumen-button lumen-button-danger w-full"
          >
            Turn off and delete server copy
          </button>
          <button
            type="button"
            onClick={() => {
              setView('on');
              setError('');
            }}
            className="lumen-outline w-full"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (view === 'on') {
    const synced = lastSyncedAt();
    return (
      <div className="space-y-3">
        <p className="lumen-help">
          Sync is <span className="font-semibold">on</span>.
          {synced && (
            <span className="block text-xs lumen-muted">
              Last synced {new Date(synced).toLocaleString()}
            </span>
          )}
        </p>
        {error && <p className="lumen-note lumen-danger" role="alert">{error}</p>}
        {status && (
          <p className="lumen-note lumen-success" role="status">
            {status}
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={handleSyncNow}
          className="lumen-outline w-full"
        >
          {busy ? 'Syncing…' : 'Sync now'}
        </button>
        <button
          type="button"
          onClick={() => {
            setView('confirm-off');
            setError('');
          }}
          className="lumen-outline w-full"
        >
          Turn off sync
        </button>
      </div>
    );
  }

  // view === 'off': vault exists, sync not enabled yet.
  return (
    <div className="space-y-3">
      <p className="lumen-help">
        Sync is off. Keep your recovery phrase somewhere safe before turning it on.
      </p>
      {error && <p className="lumen-note lumen-danger" role="alert">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={handleEnable}
        className="lumen-button w-full"
      >
        {busy ? 'Turning on sync…' : 'Turn on sync'}
      </button>
    </div>
  );
}
