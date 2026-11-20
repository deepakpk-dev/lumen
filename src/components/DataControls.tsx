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
      setStatus({ ok: true, msg: 'Backup restored.' });
    } catch (err) {
      setStatus({ ok: false, msg: err instanceof Error ? err.message : 'Couldn’t restore the backup. Choose a Lumen backup file and try again.' });
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
          msg: 'Couldn’t confirm deletion of the encrypted server copy. Your data on this device was kept. Check your connection and try again.',
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
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setConfirmingExport(true)}
        className="lumen-outline w-full"
      >
        Export a backup
      </button>

      {confirmingExport && (
        <div className="lumen-panel lumen-warning space-y-3">
          <p className="text-sm">
            This unencrypted backup contains sensitive health data. Save it somewhere private.
            Anyone with a copy can read it.
          </p>
          <div className="lumen-actions">
            <button
              type="button"
              onClick={handleExport}
              className="lumen-button"
            >
              Download unencrypted backup
            </button>
            <button
              type="button"
              onClick={() => setConfirmingExport(false)}
              className="lumen-outline"
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
        className="lumen-outline w-full"
      >
        Restore from a backup
      </button>

      {status && (
        <p
          className={`lumen-note ${status.ok ? 'lumen-success' : 'lumen-danger'}`}
          role="status"
        >
          {status.msg}
        </p>
      )}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="lumen-outline lumen-outline-danger w-full"
        >
          Delete all data
        </button>
      ) : (
        <div className="lumen-panel lumen-danger space-y-3">
          <h3 className="text-sm font-semibold">Delete all data?</h3>
          <p className="text-sm">
            This permanently deletes your Lumen records and settings on this device.
            If sync is on, it also deletes the encrypted server copy. You can’t undo this.
          </p>
          <div className="lumen-actions">
            <button
              type="button"
              onClick={handleDelete}
              className="lumen-button lumen-button-danger"
            >
              Delete all data
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="lumen-outline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
