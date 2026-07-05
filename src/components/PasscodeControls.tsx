'use client';

import { useEffect, useState } from 'react';
import { createVault, unlockVault, rewrapVault } from '@/src/crypto/vault';
import { hasVault, loadVault, saveVault } from '@/src/security/vault-store';
import { encryptExistingData } from '@/src/data/repository';

type View = 'loading' | 'off' | 'phrase' | 'on' | 'change';

export function PasscodeControls() {
  const [view, setView] = useState<View>('loading');
  const [code, setCode] = useState('');
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [phrase, setPhrase] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time hydration from localStorage; SSR-safe via the loading gate
    setView(hasVault() ? 'on' : 'off');
  }, []);

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return setError('Please choose a passcode.');
    setBusy(true);
    setError('');
    try {
      const { vault, unlocked } = await createVault(code);
      // Encrypt everything already on the device, then keep the vault. Order
      // matters: encryptExistingData installs the session key on success.
      await encryptExistingData(unlocked.keys);
      saveVault(vault);
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

  if (view === 'loading') return null;

  if (view === 'phrase') {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-green-700 dark:text-green-400">
          Encryption is on. Your data is now stored encrypted on this device.
        </p>
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-xs text-amber-900 dark:text-amber-200">
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
          className="w-full rounded-md bg-rose-600 px-4 py-3 text-white"
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
          className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
        />
        <input
          aria-label="new passcode"
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="New passcode"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-md bg-rose-600 px-4 py-3 text-white disabled:opacity-60"
          >
            Change passcode
          </button>
          <button
            type="button"
            onClick={() => {
              setView('on');
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

  if (view === 'on') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Encryption is <span className="font-medium text-green-700 dark:text-green-400">on</span>.
          Your data is unlocked with your passcode each time you open Lumen.
        </p>
        <button
          type="button"
          onClick={() => {
            setView('change');
            setError('');
          }}
          className="w-full rounded-md border px-4 py-3"
        >
          Change passcode
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleEnable} className="space-y-3">
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        Encrypt your data with a passcode. Without it, your data is readable by anyone with access to
        this device.
      </p>
      <input
        aria-label="new passcode"
        type="password"
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setError('');
        }}
        placeholder="Choose a passcode"
        className="w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-rose-600 px-4 py-3 text-white disabled:opacity-60"
      >
        {busy ? 'Encrypting…' : 'Turn on encryption'}
      </button>
    </form>
  );
}
