import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PregnancyControls } from './PregnancyControls';

const startPregnancyMode = vi.fn().mockResolvedValue(undefined);
const updateDueDate = vi.fn().mockResolvedValue(undefined);
let mockState: Record<string, unknown>;
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => mockState,
}));

beforeEach(() => {
  startPregnancyMode.mockClear();
  updateDueDate.mockClear();
  mockState = {
    isPregnant: false,
    pregnancyProfile: null,
    startPregnancyMode,
    updateDueDate,
    cycles: [{ id: 'c1', startDate: '2026-01-01' }],
  };
});

describe('PregnancyControls', () => {
  it('starts pregnancy from an entered due date', () => {
    render(<PregnancyControls />);
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-10-08' } });
    fireEvent.click(screen.getByRole('button', { name: /start pregnancy mode/i }));
    expect(startPregnancyMode).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: '2026-10-08' }),
    );
  });

  it('redirects (calls onStarted) after starting pregnancy from a due date', async () => {
    const onStarted = vi.fn();
    render(<PregnancyControls onStarted={onStarted} />);
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-10-08' } });
    fireEvent.click(screen.getByRole('button', { name: /start pregnancy mode/i }));
    await waitFor(() => expect(onStarted).toHaveBeenCalled());
  });

  it('does not redirect when no date has been entered', () => {
    const onStarted = vi.fn();
    render(<PregnancyControls onStarted={onStarted} />);
    fireEvent.click(screen.getByRole('button', { name: /start pregnancy mode/i }));
    expect(startPregnancyMode).not.toHaveBeenCalled();
    expect(onStarted).not.toHaveBeenCalled();
  });

  it('shows the due date when already pregnant', () => {
    mockState = {
      ...mockState,
      isPregnant: true,
      pregnancyProfile: { id: 'current', dueDate: '2026-10-08', dueDateSource: 'lmp', startedAt: '2026-01-10', status: 'active' },
    };
    render(<PregnancyControls />);
    expect(screen.getByText(/2026-10-08/)).toBeTruthy();
  });
});
