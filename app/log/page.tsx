'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DailyLogForm } from '@/src/components/DailyLogForm';
import { PageShell } from '@/src/components/PageShell';
import { isValidISODate, todayISO } from '@/src/domain/dates';

function LogPageInner() {
  const today = todayISO();
  const param = useSearchParams().get('date');
  // Fall back to today for missing, malformed, or future dates.
  const date = param && isValidISODate(param) && param <= today ? param : today;
  const heading = date === today ? 'Log for today' : `Log for ${date}`;

  return (
    <PageShell title={heading}>
      <DailyLogForm date={date} />
    </PageShell>
  );
}

export default function LogPage() {
  return (
    <Suspense>
      <LogPageInner />
    </Suspense>
  );
}
