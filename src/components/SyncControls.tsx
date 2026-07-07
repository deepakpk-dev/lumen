'use client';

import { useEffect, useState } from 'react';
import { hasVault, saveVault } from '@/src/security/vault-store';
import { restoreVault } from '@/src/crypto/vault';
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time hydration from localStorage; SSR-safe via the loading gate
    setView(!hasVault() ? 'novault' : isSyncEnabled() ? 'on' : 'off');
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
    }, 'Could not turn on sync.');
  }

  function handleRestore(e: React.FormEvent) {
    e.preventDefault();
    void run(async () => {
      if (!newCode.trim()) throw new Error('Please choose a passcode.');
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
    }, 'Could not restore.');
  }

  function handleSyncNow() {
    void run(async () => {
      const keys = getStorageKeys();
      if (!keys) throw new Error('Unlock with your passcode first.');
      const { applied } = await syncNow(keys);
      if (applied > 0) await onSynced?.();
      setStatus('Up to date.');
    }, 'Sync failed — check your connection.');
  }

  function handleDisable(deleteServerCopy: boolean) {
    void run(async () => {
      await disableSync(getStorageKeys(), { deleteServerCopy });
      setView('off');
    }, 'Could not turn off sync.');
  }

  if (view === 'loading') return null;

  if (view === 'novault') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Sync needs encryption: turn on a passcode above first. Your recovery phrase becomes the
          only key to your synced data, and it never reaches our servers.
        </p>
        <button
          type="button"
          onClick={() => setView('restore')}
          className="w-full rounded-md border px-4 py-3"
        >
          Restore from another device
        </button>
      </div>
    );
  }

  if (view === 'restore') {
    return (
      <form onSubmit={handleRestore} className="space-y-3">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Enter the 12-word recovery phrase from your other device and choose a passcode for this
          one.
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
          placeholder="Choose a passcode"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-md bg-rose-600 px-4 py-3 text-white disabled:opacity-60"
          >
            {busy ? 'Restoring…' : 'Restore my data'}
          </button>
          <button
            type="button"
            onClick={() => {
              setView('novault');
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
    return (
      <div className="space-y-2 rounded-md border border-red-300 p-3 dark:border-red-900">
        <p className="text-sm text-red-700 dark:text-red-400">
          Stop syncing this device? Your data here is untouched. You can also delete the encrypted
          copy from the server.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleDisable(false)}
            className="w-full rounded-md border px-4 py-3 disabled:opacity-60"
          >
            Turn off sync
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleDisable(true)}
            className="w-full rounded-md bg-red-600 px-4 py-3 text-white disabled:opacity-60"
          >
            Turn off and delete server copy
          </button>
          <button
            type="button"
            onClick={() => {
              setView('on');
              setError('');
            }}
            className="w-full rounded-md border px-4 py-3"
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
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Sync is <span className="font-medium text-green-700 dark:text-green-400">on</span>. Your
          key stays on your devices, so the server only ever holds encrypted data.
          {synced && (
            <span className="block text-xs text-neutral-500 dark:text-neutral-400">
              Last synced {new Date(synced).toLocaleString()}
            </span>
          )}
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {status && (
          <p className="text-sm text-green-700 dark:text-green-400" role="status">
            {status}
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={handleSyncNow}
          className="w-full rounded-md border px-4 py-3 disabled:opacity-60"
        >
          {busy ? 'Syncing…' : 'Sync now'}
        </button>
        <button
          type="button"
          onClick={() => {
            setView('confirm-off');
            setError('');
          }}
          className="w-full rounded-md border px-4 py-3"
        >
          Turn off sync
        </button>
      </div>
    );
  }

  // view === 'off': vault exists, sync not enabled yet.
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        Carry your data to another device. Everything is encrypted with your recovery phrase before
        it leaves this device — losing the phrase means losing the synced copy.
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={handleEnable}
        className="w-full rounded-md bg-rose-600 px-4 py-3 text-white disabled:opacity-60"
      >
        {busy ? 'Turning on…' : 'Turn on sync'}
      </button>
    </div>
  );
}
