'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { CycleCalendar } from '@/src/components/CycleCalendar';
import { parseISODate, toISODate, todayISO } from '@/src/domain/dates';

function shiftMonth(month: string, delta: number): string {
  const d = parseISODate(month);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}

const MONTH_LABEL = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
});

export default function CalendarPage() {
  const { cycles, prediction, loading } = useHealthData();
  const today = todayISO();
  const [month, setMonth] = useState(() => today);

  if (loading) return <main className="p-6">Loading…</main>;

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <Link href="/" className="text-sm text-neutral-500 underline dark:text-neutral-400">
          Home
        </Link>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          className="rounded-md border px-3 py-1 text-sm"
        >
          ←
        </button>
        <p className="text-sm font-medium">
          {MONTH_LABEL.format(parseISODate(month))}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          className="rounded-md border px-3 py-1 text-sm"
        >
          →
        </button>
      </div>
      <CycleCalendar
        cycles={cycles}
        prediction={prediction}
        month={month}
        today={today}
      />
      {month.slice(0, 7) !== today.slice(0, 7) && (
        <button
          type="button"
          onClick={() => setMonth(today)}
          className="text-sm text-rose-600 underline dark:text-rose-400"
        >
          Back to this month
        </button>
      )}
    </main>
  );
}
