import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BbtImport } from './BbtImport';
import { setStorageKeys } from '@/src/data/storage';
import { deleteAll, getDailyLog, upsertDailyLog } from '@/src/data/repository';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('@/src/state/useHealthData', () => ({ useHealthData: () => ({ refresh }) }));

beforeEach(async () => {
  refresh.mockClear();
  setStorageKeys(null);
  await deleteAll();
});
afterEach(() => setStorageKeys(null));

describe('BbtImport', () => {
  it('imports a CSV, reports the result, and refreshes', async () => {
    render(<BbtImport />);
    const file = new File(['date,temp\n2026-07-01,36.5\n'], 't.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByLabelText('import temperatures'), file);

    const status = await screen.findByRole('status');
    expect(status.textContent).toMatch(/Imported 1 temperature/);
    expect(refresh).toHaveBeenCalled();
    expect((await getDailyLog('2026-07-01'))?.bbt).toBe(36.5);
  });

  it('counts days already logged instead of overwriting them', async () => {
    await upsertDailyLog({ date: '2026-07-01', symptoms: [], moods: [], bbt: 36.8 });
    render(<BbtImport />);
    const file = new File(['2026-07-01,36.1\n2026-07-02,36.4\n'], 't.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByLabelText('import temperatures'), file);

    const status = await screen.findByRole('status');
    expect(status.textContent).toMatch(/Imported 1 temperature/);
    expect(status.textContent).toMatch(/1 day skipped/);
    expect((await getDailyLog('2026-07-01'))?.bbt).toBe(36.8); // manual value kept
  });

  it('shows a friendly error for an unusable file', async () => {
    render(<BbtImport />);
    const file = new File(['nothing,useful\nhere,either\n'], 't.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByLabelText('import temperatures'), file);

    expect(await screen.findByText(/no temperature readings/i)).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
