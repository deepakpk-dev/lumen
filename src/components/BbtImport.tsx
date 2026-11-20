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
    <div className="lumen-panel space-y-2">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Import temperatures from a CSV
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        aria-label="import temperatures"
        disabled={busy}
        onChange={handleFile}
        className="lumen-file"
      />
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        CSV with a date and a temperature per line. °F is converted automatically. Days you&apos;ve
        already logged a temperature keep your value.
      </p>
      {error && <p className="lumen-note lumen-danger" role="alert">{error}</p>}
      {status && (
        <p className="lumen-note lumen-success" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
