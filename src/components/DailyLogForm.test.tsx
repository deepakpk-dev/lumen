import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DailyLogForm } from './DailyLogForm';
import { deleteAll, getDailyLog } from '@/src/data/repository';

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
});
