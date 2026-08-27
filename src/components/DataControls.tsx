'use client';

import { useRef, useState } from 'react';
import { deleteAll, exportAll, importAll } from '@/src/data/repository';
import { buildExportBlob, parseImport } from '@/src/data/export';
import { clearPreferences } from '@/src/settings/preferences';
import { clearPasscode } from '@/src/security/passcode';
import { clearVault } from '@/src/security/vault-store';
import { getStorageKeys, setStorageKeys } from '@/src/data/storage';
import { deleteAccount, isSyncEnabled, startSyncTracking } from '@/src/data/sync-engine';
import { clearFiredReminderNotifications } from '@/src/notifications/notify';

export function DataControls({
  onDeleted,
  onImported,
}: {
  onDeleted?: () => void;
  onImported?: () => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [confirmingExport, setConfirmingExport] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleExport() {
    const data = await exportAll();
    const { filename, json } = buildExportBlob(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file after an error
    if (!file) return;
    setStatus(null);
    try {
      await importAll(parseImport(await file.text()));
      await onImported?.();
      setStatus({ ok: true, msg: 'Data restored from your backup.' });
    } catch (err) {
      setStatus({ ok: false, msg: err instanceof Error ? err.message : 'Import failed.' });
    }
  }

  async function handleDelete() {
    // Server copy first: after the local wipe the keys are gone and nothing
    // could ever delete it. If the server is unreachable, keep local data and
    // let the user retry — a half-delete that strands ciphertext breaks the
    // hard-delete promise.
    if (isSyncEnabled()) {
      const keys = getStorageKeys();
      try {
        if (keys) await deleteAccount(keys);
      } catch {
        setStatus({
          ok: false,
          msg: 'Could not delete your synced copy from the server — check your connection and try again. Nothing was deleted.',
        });
        setConfirming(false);
        return;
      }
    }
    await deleteAll();
    clearPreferences();
    clearFiredReminderNotifications();
    clearPasscode();
    clearVault();
    setStorageKeys(null);
    startSyncTracking(null);
    setConfirming(false);
    onDeleted?.();
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setConfirmingExport(true)}
        className="w-full rounded-md border px-4 py-3"
      >
        Export my data
      </button>

      {confirmingExport && (
        <div className="space-y-2 rounded-md border border-amber-300 p-3 dark:border-amber-800">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            This download is an unencrypted JSON file containing sensitive health data. Save
            or share it only somewhere you trust.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="flex-1 rounded-md bg-amber-700 px-4 py-3 text-white"
            >
              Download unencrypted export
            </button>
            <button
              type="button"
              onClick={() => setConfirmingExport(false)}
              className="flex-1 rounded-md border px-4 py-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        onChange={handleImport}
        className="sr-only"
      />
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className="w-full rounded-md border px-4 py-3"
      >
        Restore from a backup
      </button>

      {status && (
        <p
          className={`text-sm ${
            status.ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
          }`}
          role="status"
        >
          {status.msg}
        </p>
      )}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-full rounded-md border border-red-300 px-4 py-3 text-red-700 dark:border-red-900 dark:text-red-400"
        >
          Delete all data
        </button>
      ) : (
        <div className="space-y-2 rounded-md border border-red-300 p-3 dark:border-red-900">
          <p className="text-sm text-red-700 dark:text-red-400">
            This permanently deletes everything on this device. This cannot be
            undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 rounded-md bg-red-600 px-4 py-3 text-white"
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-md border px-4 py-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
