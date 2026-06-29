import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingForm } from './OnboardingForm';

const completeOnboarding = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({ completeOnboarding }),
}));

beforeEach(() => {
  completeOnboarding.mockClear();
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

  it('onboards the default cycle goal once a period date is set', async () => {
    renderSetup();
    fireEvent.change(screen.getByLabelText(/last period start/i), { target: { value: '2026-06-01' } });
    fireEvent.submit(screen.getByRole('button', { name: /get started/i }).closest('form')!);
    expect(completeOnboarding).toHaveBeenCalledWith(
      'cycle',
      expect.objectContaining({ date: '2026-06-01' }),
    );
  });

  it('onboards the conceiving goal as ttc when chosen', async () => {
    renderSetup();
    fireEvent.click(screen.getByRole('button', { name: /trying to conceive/i }));
    fireEvent.change(screen.getByLabelText(/last period start/i), { target: { value: '2026-06-01' } });
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    await waitFor(() =>
      expect(completeOnboarding).toHaveBeenCalledWith(
        'ttc',
        expect.objectContaining({ date: '2026-06-01' }),
      ),
    );
  });

  it('passes the plain cycle goal (not ttc) for the default selection', async () => {
    renderSetup();
    fireEvent.change(screen.getByLabelText(/last period start/i), { target: { value: '2026-06-01' } });
    fireEvent.submit(screen.getByRole('button', { name: /get started/i }).closest('form')!);
    await waitFor(() => expect(completeOnboarding).toHaveBeenCalled());
    expect(completeOnboarding.mock.calls[0][0]).toBe('cycle');
  });

  it('onboards the pregnant goal when chosen', () => {
    renderSetup();
    fireEvent.click(screen.getByRole('button', { name: /i'm pregnant/i }));
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-10-08' } });
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(completeOnboarding).toHaveBeenCalledWith(
      'pregnant',
      expect.objectContaining({ dueDate: '2026-10-08' }),
    );
  });

  it('disables submit on the pregnant goal until a due date is entered', () => {
    renderSetup();
    fireEvent.click(screen.getByRole('button', { name: /i'm pregnant/i }));
    expect(screen.getByRole('button', { name: /get started/i })).toHaveProperty('disabled', true);
  });

  it('disables submit until a last period date is entered (no "today" pre-fill)', () => {
    renderSetup();
    expect(screen.getByRole('button', { name: /get started/i })).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByLabelText(/last period start/i), { target: { value: '2026-06-01' } });
    expect(screen.getByRole('button', { name: /get started/i })).toHaveProperty('disabled', false);
  });

  it('does not onboard or complete when submitted without a last period date', () => {
    const onComplete = vi.fn();
    renderSetup(onComplete);
    fireEvent.submit(screen.getByRole('button', { name: /get started/i }).closest('form')!);
    expect(completeOnboarding).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('reports the chosen goal to onComplete so the caller can route accordingly', async () => {
    const onComplete = vi.fn();
    renderSetup(onComplete);
    fireEvent.click(screen.getByRole('button', { name: /i'm pregnant/i }));
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-10-08' } });
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('pregnant'));
  });

  it('reports the cycle goal to onComplete by default', async () => {
    const onComplete = vi.fn();
    renderSetup(onComplete);
    fireEvent.change(screen.getByLabelText(/last period start/i), { target: { value: '2026-06-01' } });
    fireEvent.submit(screen.getByRole('button', { name: /get started/i }).closest('form')!);
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('cycle'));
  });

  it('frames the setup step as setup rather than a second welcome', () => {
    renderSetup();
    expect(screen.getByRole('heading', { name: /set things up/i })).toBeInTheDocument();
  });

  it('keeps the Lumen wordmark visible on the setup step for brand continuity', () => {
    renderSetup();
    expect(screen.getByText('Lumen')).toBeInTheDocument();
  });

  it('explains why submit is inactive until a last period date is set, then clears it', () => {
    renderSetup();
    expect(screen.getByText(/last period date to continue/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/last period start/i), { target: { value: '2026-06-01' } });
    expect(screen.queryByText(/last period date to continue/i)).not.toBeInTheDocument();
  });

  it('explains why submit is inactive until a due date is set on the pregnant goal', () => {
    renderSetup();
    fireEvent.click(screen.getByRole('button', { name: /i'm pregnant/i }));
    expect(screen.getByText(/due date to continue/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-10-08' } });
    expect(screen.queryByText(/due date to continue/i)).not.toBeInTheDocument();
  });
});
