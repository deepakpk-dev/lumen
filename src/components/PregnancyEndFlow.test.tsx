import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PregnancyEndFlow } from './PregnancyEndFlow';

const endPregnancyBirth = vi.fn().mockResolvedValue(undefined);
const endPregnancyLoss = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({ endPregnancyBirth, endPregnancyLoss }),
}));

beforeEach(() => {
  endPregnancyBirth.mockClear();
  endPregnancyLoss.mockClear();
});

describe('PregnancyEndFlow', () => {
  it('records a birth', () => {
    render(<PregnancyEndFlow />);
    fireEvent.click(screen.getByRole('button', { name: /manage pregnancy/i }));
    fireEvent.click(screen.getByRole('button', { name: /baby arrived/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(endPregnancyBirth).toHaveBeenCalledTimes(1);
  });

  it('handles loss compassionately without celebratory or period prompts', () => {
    render(<PregnancyEndFlow />);
    fireEvent.click(screen.getByRole('button', { name: /manage pregnancy/i }));
    fireEvent.click(screen.getByRole('button', { name: /my pregnancy has ended/i }));

    // Compassionate copy present; no celebratory or period-logging prompts.
    expect(screen.getByText(/so sorry/i)).toBeTruthy();
    expect(screen.queryByText(/congratulations/i)).toBeNull();
    expect(screen.queryByText(/log your period/i)).toBeNull();
    expect(screen.queryByText(/last period/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /return to cycle mode/i }));
    expect(endPregnancyLoss).toHaveBeenCalledTimes(1);
  });
});
