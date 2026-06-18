import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataControls } from './DataControls';
import {
  getBbtUnit,
  getLifeStage,
  getTtcStartDate,
  setBbtUnit,
  setLifeStage,
} from '@/src/settings/preferences';
import { addCycle, deleteAll, getCycles } from '@/src/data/repository';

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
});
