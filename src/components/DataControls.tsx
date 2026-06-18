'use client';

import { useState } from 'react';
import { deleteAll, exportAll } from '@/src/data/repository';
import { buildExportBlob } from '@/src/data/export';
import { clearPreferences } from '@/src/settings/preferences';
import { clearPasscode } from '@/src/security/passcode';

export function DataControls({ onDeleted }: { onDeleted?: () => void }) {
  const [confirming, setConfirming] = useState(false);

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

  async function handleDelete() {
    await deleteAll();
    clearPreferences();
    clearPasscode();
    setConfirming(false);
    onDeleted?.();
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleExport}
        className="w-full rounded-md border px-4 py-2"
      >
        Export my data
      </button>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-full rounded-md border border-red-300 px-4 py-2 text-red-700"
        >
          Delete all data
        </button>
      ) : (
        <div className="space-y-2 rounded-md border border-red-300 p-3">
          <p className="text-sm text-red-700">
            This permanently deletes everything on this device. This cannot be
            undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 rounded-md bg-red-600 px-4 py-2 text-white"
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-md border px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
