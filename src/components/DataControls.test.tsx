import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataControls } from './DataControls';
import { setStorageKeys } from '@/src/data/storage';
import { deriveKeys, newRecoveryPhrase } from '@/src/crypto/keys';
import {
  getBbtUnit,
  getLifeStage,
  getTtcStartDate,
  setBbtUnit,
  setLifeStage,
} from '@/src/settings/preferences';
import { addCycle, deleteAll, getCycles } from '@/src/data/repository';
import { hasPasscode, setPasscode } from '@/src/security/passcode';

beforeEach(async () => {
  localStorage.clear();
  await deleteAll();
});

describe('DataControls', () => {
  it('deletes cycles and health preferences from this device', async () => {
    await addCycle({ id: 'cycle-1', startDate: '2026-06-01' });
    setLifeStage('ttc', '2026-06-17');
    setBbtUnit('F');

    render(<DataControls />);

    await userEvent.click(screen.getByRole('button', { name: /delete all data/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, delete/i }));

    await waitFor(async () => {
      expect(await getCycles()).toEqual([]);
      expect(getLifeStage()).toBe('cycle');
      expect(getTtcStartDate()).toBeNull();
      expect(getBbtUnit()).toBe('C');
    });
  });

  it('clears the passcode so the app is not left locked over empty data', async () => {
    await setPasscode('1234');
    expect(hasPasscode()).toBe(true);

    render(<DataControls />);

    await userEvent.click(screen.getByRole('button', { name: /delete all data/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, delete/i }));

    await waitFor(() => {
      expect(hasPasscode()).toBe(false);
    });
  });

  it('removes reminder delivery history when deleting all data', async () => {
    localStorage.setItem(
      'lumen.notify.fired',
      JSON.stringify({ date: '2026-06-17', kinds: ['period-soon'] }),
    );

    render(<DataControls />);

    await userEvent.click(screen.getByRole('button', { name: /delete all data/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, delete/i }));

    await waitFor(() => {
      expect(localStorage.getItem('lumen.notify.fired')).toBeNull();
    });
  });

  it('warns that a backup download is unencrypted before exporting it', async () => {
    render(<DataControls />);

    await userEvent.click(screen.getByRole('button', { name: /export my data/i }));

    expect(
      screen.getByText(/download is an unencrypted json file containing sensitive health data/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /download unencrypted export/i }),
    ).toBeInTheDocument();
  });

  describe('with sync on', () => {
    afterEach(() => {
      setStorageKeys(null);
      vi.unstubAllGlobals();
    });

    it('deletes the server copy before wiping locally', async () => {
      const keys = await deriveKeys(newRecoveryPhrase());
      setStorageKeys(keys);
      localStorage.setItem('lumen.sync.enabled', '1');
      await addCycle({ id: 'c1', startDate: '2026-06-01' });
      const calls: string[] = [];
      vi.stubGlobal(
        'fetch',
        vi.fn((url: string) => {
          calls.push(url);
          return Promise.resolve(new Response('{"ok":true}', { status: 200 }));
        }),
      );

      render(<DataControls />);
      await userEvent.click(screen.getByRole('button', { name: /delete all data/i }));
      await userEvent.click(screen.getByRole('button', { name: /yes, delete/i }));

      await waitFor(async () => {
        expect(calls).toEqual(['/api/sync/delete-account']);
        expect(await getCycles()).toEqual([]);
        expect(localStorage.getItem('lumen.sync.enabled')).toBeNull();
      });
    });

    it('keeps all data when the server delete fails, so ciphertext is never stranded', async () => {
      const keys = await deriveKeys(newRecoveryPhrase());
      setStorageKeys(keys);
      localStorage.setItem('lumen.sync.enabled', '1');
      await addCycle({ id: 'c1', startDate: '2026-06-01' });
      vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));

      render(<DataControls />);
      await userEvent.click(screen.getByRole('button', { name: /delete all data/i }));
      await userEvent.click(screen.getByRole('button', { name: /yes, delete/i }));

      await screen.findByText(/nothing was deleted/i);
      expect(await getCycles()).toHaveLength(1);
      expect(localStorage.getItem('lumen.sync.enabled')).toBe('1');
    });
  });
});
