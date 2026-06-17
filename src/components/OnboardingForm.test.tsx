import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingForm } from './OnboardingForm';
import { deleteAll, getCycles } from '@/src/data/repository';

beforeEach(async () => {
  await deleteAll();
});

describe('OnboardingForm', () => {
  it('saves the last period date and calls onComplete', async () => {
    const onComplete = vi.fn();
    render(<OnboardingForm onComplete={onComplete} />);

    const dateInput = screen.getByLabelText(/last period start/i);
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, '2026-06-01');
    await userEvent.click(screen.getByRole('button', { name: /get started/i }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const cycles = await getCycles();
    expect(cycles).toHaveLength(1);
    expect(cycles[0].startDate).toBe('2026-06-01');
  });
});
