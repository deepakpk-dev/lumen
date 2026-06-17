'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { todayISO } from '@/src/domain/dates';

export function OnboardingForm({ onComplete }: { onComplete: () => void }) {
  const { startPeriod } = useHealthData();
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await startPeriod(date);
    setSaving(false);
    onComplete();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Let&apos;s set up your first prediction. This stays private on your
          device.
        </p>
      </div>
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
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-rose-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        Get started
      </button>
    </form>
  );
}
