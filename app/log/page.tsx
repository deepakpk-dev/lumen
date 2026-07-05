'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DailyLogForm } from '@/src/components/DailyLogForm';
import { BackLink } from '@/src/components/BackLink';
import { isValidISODate, todayISO } from '@/src/domain/dates';

function LogPageInner() {
  const today = todayISO();
  const param = useSearchParams().get('date');
  // Fall back to today for missing, malformed, or future dates.
  const date = param && isValidISODate(param) && param <= today ? param : today;
  const heading = date === today ? 'Log for today' : `Log for ${date}`;

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <BackLink href="/">Home</BackLink>
      <h1 className="text-xl font-semibold">{heading}</h1>
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
