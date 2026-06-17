'use client';

import { useHealthData } from '@/src/state/useHealthData';
import { CycleCalendar } from '@/src/components/CycleCalendar';
import { todayISO } from '@/src/domain/dates';

export default function CalendarPage() {
  const { cycles, prediction, loading } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">Calendar</h1>
      <CycleCalendar cycles={cycles} prediction={prediction} month={todayISO()} />
    </main>
  );
}
