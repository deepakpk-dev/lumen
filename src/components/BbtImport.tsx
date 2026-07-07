'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { parseBbtCsv } from '@/src/domain/fertility/bbt-import';
import { importBbtReadings } from '@/src/data/repository';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Flat card for bulk BBT import — informational styling, no elevation (that's
// reserved for the fertility guidance card and CTA).
export function BbtImport() {
  const { refresh } = useHealthData();
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the user re-pick the same file after a fix
    if (!file) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const { readings, skipped } = parseBbtCsv(await file.text());
      const { imported, skippedExisting } = await importBbtReadings(readings);
      await refresh();
      const parts = [`Imported ${plural(imported, 'temperature')}`];
      if (skippedExisting > 0) parts.push(`${plural(skippedExisting, 'day')} skipped — already logged`);
      if (skipped > 0) parts.push(`${plural(skipped, 'line')} unreadable`);
      setStatus(`${parts.join(' · ')}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import this file.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Import temperatures from a CSV
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        aria-label="import temperatures"
        disabled={busy}
        onChange={handleFile}
        className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-transparent file:px-3 file:py-1.5 file:text-neutral-700 dark:text-neutral-400 dark:file:border-neutral-700 dark:file:text-neutral-300"
      />
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        CSV with a date and a temperature per line. °F is converted automatically. Days you&apos;ve
        already logged a temperature keep your value.
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {status && (
        <p className="text-sm text-green-700 dark:text-green-400" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
