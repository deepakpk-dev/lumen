// src/components/DailyLogForm.menopause.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DailyLogForm } from './DailyLogForm';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

const saveLog = vi.fn();
const startPeriod = vi.fn();

vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({
    dailyLogs: [],
    saveLog,
    startPeriod,
    endPeriod: vi.fn(),
    cycles: [],
    lifeStage: 'menopause',
    bbtUnit: 'C',
    isPregnant: false,
  }),
}));

beforeEach(() => {
  saveLog.mockReset();
  startPeriod.mockReset();
});

describe('DailyLogForm perimenopause', () => {
  it('shows perimenopause symptoms, keeps Flow, and hides TTC fields', () => {
    render(<DailyLogForm date="2026-07-09" />);
    expect(screen.getByRole('button', { name: 'Hot flashes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Flow' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/basal body temperature/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ovulation test/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cervical mucus/i)).not.toBeInTheDocument();
  });

  it('round-trips selected perimenopause symptoms through save', async () => {
    render(<DailyLogForm date="2026-07-09" />);
    fireEvent.click(screen.getByRole('button', { name: 'Hot flashes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Night sweats' }));
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await screen.findByRole('status');
    expect(saveLog).toHaveBeenCalledWith(
      expect.objectContaining({ symptoms: ['Hot flashes', 'Night sweats'] }),
    );
  });
});
