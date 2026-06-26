import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TtcControls } from '@/src/components/TtcControls';

const setTtcMode = vi.fn();
const setBbtUnitPreference = vi.fn();
let mockState: Record<string, unknown>;
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => mockState,
}));

beforeEach(() => {
  localStorage.clear();
  setTtcMode.mockClear();
  setBbtUnitPreference.mockClear();
  mockState = {
    lifeStage: 'cycle',
    bbtUnit: 'C',
    setTtcMode,
    setBbtUnitPreference,
  };
});

describe('TtcControls', () => {
  it('enables TTC mode through the shared context when toggled on', () => {
    render(<TtcControls />);
    fireEvent.click(screen.getByRole('button', { name: /turn on ttc mode/i }));
    expect(setTtcMode).toHaveBeenCalledWith(true);
    expect(screen.getByText(/TTC mode is/i).textContent).toMatch(/off/i);
  });

  it('redirects (calls onEnabled) after enabling TTC mode', () => {
    const onEnabled = vi.fn();
    render(<TtcControls onEnabled={onEnabled} />);
    fireEvent.click(screen.getByRole('button', { name: /turn on ttc mode/i }));
    expect(onEnabled).toHaveBeenCalled();
  });

  it('disables TTC mode without redirecting when toggled off', () => {
    mockState = { ...mockState, lifeStage: 'ttc' };
    const onEnabled = vi.fn();
    render(<TtcControls onEnabled={onEnabled} />);
    fireEvent.click(screen.getByRole('button', { name: /turn off ttc mode/i }));
    expect(setTtcMode).toHaveBeenCalledWith(false);
    expect(onEnabled).not.toHaveBeenCalled();
  });
});
