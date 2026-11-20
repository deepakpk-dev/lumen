'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DailyLogForm } from '@/src/components/DailyLogForm';
import { PageShell } from '@/src/components/PageShell';
import { isValidISODate, parseISODate, todayISO } from '@/src/domain/dates';

const formatDate = new Intl.DateTimeFormat('en', { dateStyle: 'long' });

function LogPageInner() {
  const today = todayISO();
  const param = useSearchParams().get('date');
  // Fall back to today for missing, malformed, or future dates.
  const date = param && isValidISODate(param) && param <= today ? param : today;
  const heading = date === today ? 'Log for today' : `Log for ${formatDate.format(parseISODate(date))}`;

  return (
    <PageShell title={heading} subtitle="Fill in only what you want to record." backHref={null}>
      <DailyLogForm key={date} date={date} />
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
