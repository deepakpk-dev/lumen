'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { todayISO } from '@/src/domain/dates';

type Goal = 'cycle' | 'pregnant';

export function OnboardingForm({ onComplete }: { onComplete: () => void }) {
  const { startPeriod, startPregnancyMode } = useHealthData();
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
      await startPeriod(date);
    }
    setSaving(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Let&apos;s set things up. This stays private on your device.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <button
          type="button"
          aria-pressed={goal === 'cycle'}
          onClick={() => setGoal('cycle')}
          className={`rounded-md border px-4 py-2 ${goal === 'cycle' ? 'border-rose-600 bg-rose-600 text-white' : 'border-neutral-300'}`}
        >
          Track my cycle
        </button>
        <button
          type="button"
          aria-pressed={goal === 'pregnant'}
          onClick={() => setGoal('pregnant')}
          className={`rounded-md border px-4 py-2 ${goal === 'pregnant' ? 'border-rose-600 bg-rose-600 text-white' : 'border-neutral-300'}`}
        >
          I&apos;m pregnant
        </button>
      </div>

      {goal === 'cycle' ? (
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
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
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
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={saving || (goal === 'pregnant' && !dueDate)}
        className="w-full rounded-md bg-rose-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        Get started
      </button>
    </form>
  );
}
