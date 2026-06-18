'use client';

import { useEffect, useState } from 'react';
import { hasPasscode, verifyPasscode } from '@/src/security/passcode';

export function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time hydration from localStorage; SSR-safe via the `ready` gate
    setLocked(hasPasscode());
    setReady(true);
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (await verifyPasscode(code)) {
      setLocked(false);
      setError(false);
    } else {
      setError(true);
    }
  }

  if (!ready) return null;
  if (!locked) return <>{children}</>;

  return (
    <main className="mx-auto flex min-h-screen max-w-xs flex-col justify-center p-6">
      <form onSubmit={handleUnlock} className="space-y-4">
        <h1 className="text-center text-lg font-semibold">Enter passcode</h1>
        <input
          aria-label="passcode"
          type="password"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-center"
        />
        {error && (
          <p className="text-center text-sm text-red-600">Incorrect passcode</p>
        )}
        <button type="submit" className="w-full rounded-md bg-rose-600 px-4 py-2 text-white">
          Unlock
        </button>
      </form>
    </main>
  );
}
