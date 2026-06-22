import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingForm } from './OnboardingForm';

const startPeriod = vi.fn().mockResolvedValue(undefined);
const startPregnancyMode = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({ startPeriod, startPregnancyMode }),
}));

beforeEach(() => {
  startPeriod.mockClear();
  startPregnancyMode.mockClear();
});

describe('OnboardingForm', () => {
  it('starts cycle tracking by default', async () => {
    const onComplete = vi.fn();
    render(<OnboardingForm onComplete={onComplete} />);
    fireEvent.submit(screen.getByRole('button', { name: /get started/i }).closest('form')!);
    expect(startPeriod).toHaveBeenCalled();
  });

  it('starts pregnancy mode when the pregnant goal is chosen', () => {
    const onComplete = vi.fn();
    render(<OnboardingForm onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /i'm pregnant/i }));
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-10-08' } });
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(startPregnancyMode).toHaveBeenCalledWith(expect.objectContaining({ dueDate: '2026-10-08' }));
  });
});
