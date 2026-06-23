// src/components/DailyLogForm.postpartum.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DailyLogForm } from './DailyLogForm';

const saveLog = vi.fn();
const startPeriod = vi.fn();

vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({
    dailyLogs: [],
    saveLog,
    startPeriod,
    endPeriod: vi.fn(),
    cycles: [],
    lifeStage: 'postpartum',
    bbtUnit: 'C',
    isPregnant: false,
  }),
}));

beforeEach(() => { saveLog.mockReset(); startPeriod.mockReset(); });

describe('DailyLogForm postpartum', () => {
  it('shows a Lochia section and a postpartum symptom', () => {
    render(<DailyLogForm date="2026-06-10" />);
    expect(screen.getByText(/lochia/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Afterpains' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Flow' })).not.toBeInTheDocument();
  });

  it('saves lochia and never starts a cycle', async () => {
    render(<DailyLogForm date="2026-06-10" />);
    fireEvent.click(screen.getByRole('button', { name: 'medium' }));
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await screen.findByText(/saved/i);
    expect(saveLog).toHaveBeenCalledWith(expect.objectContaining({ lochia: 'medium' }));
    expect(startPeriod).not.toHaveBeenCalled();
  });
});
