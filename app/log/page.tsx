'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DailyLogForm } from '@/src/components/DailyLogForm';
import { isValidISODate, todayISO } from '@/src/domain/dates';

function LogPageInner() {
  const today = todayISO();
  const param = useSearchParams().get('date');
  // Fall back to today for missing, malformed, or future dates.
  const date = param && isValidISODate(param) && param <= today ? param : today;
  const heading = date === today ? 'Log for today' : `Log for ${date}`;

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{heading}</h1>
        <Link href="/" className="text-sm text-neutral-500 underline dark:text-neutral-400">
          Home
        </Link>
      </div>
      <DailyLogForm date={date} />
    </main>
  );
}

export default function LogPage() {
  return (
    <Suspense>
      <LogPageInner />
    </Suspense>
  );
}
