import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingForm, type Goal } from './OnboardingForm';
import { addDays, todayISO } from '@/src/domain/dates';

const completeOnboarding = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/state/useHealthData', () => ({ useHealthData: () => ({ completeOnboarding }) }));

beforeEach(() => {
  completeOnboarding.mockReset().mockResolvedValue(undefined);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
const click = (label: string | RegExp) => fireEvent.click(screen.getByRole('button', { name: label }));
const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const lastPeriod = addDays(todayISO(), -28);

function openDateStep(goal?: RegExp, onComplete = vi.fn<(goal: Goal) => void>()) {
  render(<OnboardingForm onComplete={onComplete} />);
  click('Get started');
  if (goal) fireEvent.click(screen.getByRole('radio', { name: goal }));
  click('Continue');
  return onComplete;
}

function finishFromDate(cycle = true) {
  click('Continue');
  if (cycle) {
    click('Continue');
    click('Continue');
    click('Continue');
  }
  click('See my summary');
  click('Finish setup');
}

async function expectSaved(goal: Goal, values: object) {
  await waitFor(() => expect(completeOnboarding).toHaveBeenCalledWith(goal, expect.objectContaining(values)));
}

describe('OnboardingForm', () => {
  it('opens with the illustrated welcome and gives access to privacy and restore', () => {
    render(<OnboardingForm onComplete={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Your body has a rhythm. Let’s discover it.' })).toBeVisible();
    expect(screen.getByText(/not medical advice/i)).toBeVisible();
    expect(screen.getByRole('link', { name: /restore your data/i })).toHaveAttribute('href', '/settings#restore');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    click('Get started');
    expect(screen.getByRole('heading', { name: 'What brings you here?' })).toBeVisible();
    expect(screen.getByText('Lumen')).toBeVisible();
  });

  it('saves the selected cycle setup only after the summary is confirmed', async () => {
    const onComplete = openDateStep();
    fill('last period start', lastPeriod);
    click('Continue');
    click('30 days');
    click('Continue');
    click('4');
    click('Continue');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Notes' }));
    click('Continue');
    fireEvent.click(screen.getByRole('switch', { name: /daily check-in/i }));
    click('See my summary');
    expect(screen.getByText('30 days')).toBeVisible();
    expect(screen.getByText('4 days')).toBeVisible();
    expect(completeOnboarding).not.toHaveBeenCalled();
    click('Finish setup');
    await expectSaved('cycle', { date: lastPeriod, cycleLength: 30, periodLength: 4,
      tracking: ['mood', 'symptoms', 'notes'], reminders: { logReminder: true, periodReminder: false, fertileReminder: false } });
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('cycle'));
  });

  it('keeps the date blank until entered or explicitly skipped', async () => {
    openDateStep();
    expect(screen.getByLabelText('last period start')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /not sure of the date/i }));
    finishFromDate();
    await expectSaved('cycle', { date: undefined });
  });

  it.each([[/trying to conceive/i, 'ttc'], [/navigating perimenopause/i, 'menopause']] as const)(
    'saves the %s goal with the existing cycle date', async (label, goal) => {
      openDateStep(label);
      fill('last period start', lastPeriod);
      finishFromDate();
      await expectSaved(goal, { date: lastPeriod });
    },
  );

  it('requires a valid due date for pregnancy and skips cycle questions', async () => {
    const onComplete = openDateStep(/i'm pregnant/i);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    const dueDate = addDays(todayISO(), 140);
    fill('Due date', dueDate);
    finishFromDate(false);
    await expectSaved('pregnant', { dueDate, cycleLength: undefined });
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('pregnant'));
  });

  it('derives the due date from the last period when the user does not know it', async () => {
    openDateStep(/i'm pregnant/i);
    click(/enter your last period instead/i);
    fill('last period start', lastPeriod);
    expect(screen.getByText(/^estimated due date:/i)).toBeVisible();
    finishFromDate(false);
    await expectSaved('pregnant', { date: lastPeriod, dueDate: addDays(lastPeriod, 280) });
  });

  it('takes a birth date for postpartum setup without cycle questions', async () => {
    openDateStep(/postpartum recovery/i);
    fill('Birth date', lastPeriod);
    finishFromDate(false);
    await expectSaved('postpartum', { birthDate: lastPeriod, cycleLength: undefined });
  });

  it('keeps the chosen date when stepping back', () => {
    openDateStep();
    fill('last period start', lastPeriod);
    click('Continue');
    click('Back');
    expect(screen.getByLabelText('last period start')).toHaveValue(lastPeriod);
  });

  it('keeps the summary and allows retry if saving fails', async () => {
    const onComplete = openDateStep();
    completeOnboarding.mockRejectedValueOnce(new Error('Storage unavailable'));
    fill('last period start', lastPeriod);
    finishFromDate();
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t save/i);
    expect(onComplete).not.toHaveBeenCalled();
    click('Finish setup');
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('cycle'));
  });
});
