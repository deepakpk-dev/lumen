import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DailyLogForm } from './DailyLogForm';
import { addCycle, deleteAll, getCycles, getDailyLog } from '@/src/data/repository';

beforeEach(async () => {
  await deleteAll();
});

describe('DailyLogForm', () => {
  it('saves selected symptoms and mood for the date', async () => {
    render(<DailyLogForm date="2026-06-17" />);

    await userEvent.click(screen.getByRole('button', { name: /cramps/i }));
    await userEvent.click(screen.getByRole('button', { name: /happy/i }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(async () => {
      const log = await getDailyLog('2026-06-17');
      expect(log?.symptoms).toContain('Cramps');
      expect(log?.moods).toContain('Happy');
    });
  });

  it('extends the current period instead of creating a new cycle for the next flow day', async () => {
    await addCycle({ id: 'cycle-1', startDate: '2026-06-16' });

    render(<DailyLogForm date="2026-06-17" />);

    await userEvent.click(screen.getByRole('button', { name: /^medium$/i }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(async () => {
      const cycles = await getCycles();
      expect(cycles).toEqual([
        { id: 'cycle-1', startDate: '2026-06-16', endDate: '2026-06-17' },
      ]);
    });
  });

  it('does not start a new cycle from spotting alone', async () => {
    render(<DailyLogForm date="2026-06-17" />);

    await userEvent.click(screen.getByRole('button', { name: /^spotting$/i }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(async () => {
      expect(await getCycles()).toEqual([]);
    });
  });
});
