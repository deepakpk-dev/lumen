'use client';

import { DailyLogForm } from '@/src/components/DailyLogForm';
import { todayISO } from '@/src/domain/dates';

export default function LogPage() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">Log for today</h1>
      <DailyLogForm date={todayISO()} />
    </main>
  );
}
