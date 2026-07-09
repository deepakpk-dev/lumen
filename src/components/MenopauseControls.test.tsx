import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MenopauseControls } from '@/src/components/MenopauseControls';

const setMenopauseMode = vi.fn();
let mockState: Record<string, unknown>;
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => mockState,
}));

beforeEach(() => {
  setMenopauseMode.mockClear();
  mockState = {
    lifeStage: 'cycle',
    setMenopauseMode,
  };
});

describe('MenopauseControls', () => {
  it('enables perimenopause mode through the shared context when toggled on', () => {
    render(<MenopauseControls />);
    fireEvent.click(screen.getByRole('button', { name: /turn on perimenopause mode/i }));
    expect(setMenopauseMode).toHaveBeenCalledWith(true);
    expect(screen.getByText(/perimenopause mode is/i).textContent).toMatch(/off/i);
  });

  it('redirects (calls onEnabled) after enabling perimenopause mode', () => {
    const onEnabled = vi.fn();
    render(<MenopauseControls onEnabled={onEnabled} />);
    fireEvent.click(screen.getByRole('button', { name: /turn on perimenopause mode/i }));
    expect(onEnabled).toHaveBeenCalled();
  });

  it('disables perimenopause mode without redirecting when toggled off', () => {
    mockState = { ...mockState, lifeStage: 'menopause' };
    const onEnabled = vi.fn();
    render(<MenopauseControls onEnabled={onEnabled} />);
    fireEvent.click(screen.getByRole('button', { name: /turn off perimenopause mode/i }));
    expect(setMenopauseMode).toHaveBeenCalledWith(false);
    expect(onEnabled).not.toHaveBeenCalled();
  });
});
