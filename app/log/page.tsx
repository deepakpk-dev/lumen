'use client';

import Link from 'next/link';
import { DailyLogForm } from '@/src/components/DailyLogForm';
import { todayISO } from '@/src/domain/dates';

export default function LogPage() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Log for today</h1>
        <Link href="/" className="text-sm text-neutral-500 underline dark:text-neutral-400">
          Home
        </Link>
      </div>
      <DailyLogForm date={todayISO()} />
    </main>
  );
}
