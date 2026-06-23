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

// Advance past the first-run intro screen to the setup form.
function renderSetup(onComplete = vi.fn()) {
  render(<OnboardingForm onComplete={onComplete} />);
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

describe('OnboardingForm', () => {
  it('shows a privacy + not-medical-advice intro before setup', () => {
    render(<OnboardingForm onComplete={vi.fn()} />);
    expect(screen.getByText(/stays on this device/i)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();
    // setup controls are not shown until the user continues
    expect(screen.queryByRole('button', { name: /get started/i })).not.toBeInTheDocument();
  });

  it('starts cycle tracking by default', async () => {
    renderSetup();
    fireEvent.submit(screen.getByRole('button', { name: /get started/i }).closest('form')!);
    expect(startPeriod).toHaveBeenCalled();
  });

  it('starts pregnancy mode when the pregnant goal is chosen', () => {
    renderSetup();
    fireEvent.click(screen.getByRole('button', { name: /i'm pregnant/i }));
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-10-08' } });
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(startPregnancyMode).toHaveBeenCalledWith(expect.objectContaining({ dueDate: '2026-10-08' }));
  });

  it('disables submit on the pregnant goal until a due date is entered', () => {
    renderSetup();
    fireEvent.click(screen.getByRole('button', { name: /i'm pregnant/i }));
    expect(screen.getByRole('button', { name: /get started/i })).toHaveProperty('disabled', true);
  });
});
