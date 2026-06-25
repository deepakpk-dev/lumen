'use client';

import { useEffect, useState } from 'react';
import { hasPasscode, setPasscode, clearPasscode } from '@/src/security/passcode';

export function PasscodeControls() {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time hydration from localStorage; SSR-safe via the `ready` gate
    setEnabled(hasPasscode());
    setReady(true);
  }, []);

  async function handleSet(e: React.FormEvent) {
    e.preventDefault();
    if (!code || code.trim() === '') {
      setError('Please enter a passcode.');
      return;
    }
    await setPasscode(code);
    setCode('');
    setError('');
    setEnabled(hasPasscode());
  }

  function handleClear() {
    clearPasscode();
    setEnabled(hasPasscode());
    setError('');
  }

  if (!ready) return null;

  if (enabled) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Passcode lock is <span className="font-medium">enabled</span>.
        </p>
        <button
          type="button"
          onClick={handleClear}
          className="w-full rounded-md border border-red-300 px-4 py-3 text-red-700 dark:border-red-900 dark:text-red-400"
        >
          Remove passcode
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSet} className="space-y-3">
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        Passcode lock is <span className="font-medium">disabled</span>.
      </p>
      <input
        aria-label="new passcode"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder="Enter numeric passcode"
        className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        className="w-full rounded-md bg-rose-600 px-4 py-3 text-white"
      >
        Set passcode
      </button>
    </form>
  );
}
