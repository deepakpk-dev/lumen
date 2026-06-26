'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { todayISO } from '@/src/domain/dates';

type Goal = 'cycle' | 'ttc' | 'pregnant';

export function OnboardingForm({ onComplete }: { onComplete: () => void }) {
  const { startPeriod, startPregnancyMode, setTtcMode } = useHealthData();
  const [step, setStep] = useState<'intro' | 'setup'>('intro');
  const [goal, setGoal] = useState<Goal>('cycle');
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (goal === 'pregnant') {
      if (dueDate) await startPregnancyMode({ dueDate });
    } else {
      // Both cycle and TTC need a seeded cycle so predictions and the fertile
      // window work from day one; TTC additionally switches on fertility mode.
      await startPeriod(date);
      if (goal === 'ttc') setTtcMode(true);
    }
    setSaving(false);
    onComplete();
  }

  const goalOptions: { value: Goal; label: string; hint: string }[] = [
    { value: 'cycle', label: 'Track my cycle', hint: 'Periods, symptoms, and predictions' },
    { value: 'ttc', label: 'Trying to conceive', hint: 'Fertile window, BBT, and ovulation' },
    { value: 'pregnant', label: "I'm pregnant", hint: 'Week-by-week, kicks, and contractions' },
  ];

  if (step === 'intro') {
    return (
      <main className="mx-auto max-w-md space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Welcome to Lumen</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            A private space to track your cycle, pregnancy, and recovery.
          </p>
        </div>
        <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
          <li>
            <span className="font-medium">Your data stays on this device.</span> Nothing is
            uploaded — no accounts, no tracking.
          </li>
          <li>
            <span className="font-medium">It&apos;s not medical advice.</span> Lumen is for
            self-tracking and general information — it is not a contraceptive and not a substitute
            for professional care.
          </li>
        </ul>
        <button
          type="button"
          onClick={() => setStep('setup')}
          className="w-full rounded-md bg-rose-600 px-4 py-3 font-medium text-white"
        >
          Continue
        </button>
      </main>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Let&apos;s set things up. This stays private on your device.
        </p>
      </div>

      <fieldset className="space-y-2 text-sm">
        <legend className="mb-2 block font-medium">What brings you to Lumen?</legend>
        {goalOptions.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={goal === o.value}
            onClick={() => setGoal(o.value)}
            className={`block w-full rounded-md border px-4 py-3 text-left ${goal === o.value ? 'border-rose-600 bg-rose-600 text-white' : 'border-neutral-300 dark:border-neutral-700'}`}
          >
            <span className="block font-medium">{o.label}</span>
            <span className={`block text-xs ${goal === o.value ? 'text-rose-50' : 'text-neutral-500 dark:text-neutral-400'}`}>
              {o.hint}
            </span>
          </button>
        ))}
      </fieldset>

      {goal !== 'pregnant' ? (
        <div className="space-y-2">
          <label htmlFor="last-period" className="block text-sm font-medium">
            When did your last period start?
          </label>
          <input
            id="last-period"
            aria-label="last period start"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <label htmlFor="due-date" className="block text-sm font-medium">
            What is your due date?
          </label>
          <input
            id="due-date"
            aria-label="due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={saving || (goal === 'pregnant' && !dueDate)}
        className="w-full rounded-md bg-rose-600 px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        Get started
      </button>
    </form>
  );
}
