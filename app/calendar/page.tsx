'use client';

import { PageShell } from '@/src/components/PageShell';
import Link from 'next/link';
import { LumenIcon } from '@/src/components/LumenIcon';
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
  const { cycles, prediction, loading, lifeStage, dailyLogs } = useHealthData();
  const today = todayISO();
  const [month, setMonth] = useState(() => today);

  if (loading) return <main className="p-6">Loading…</main>;

  return (
    <PageShell title="Calendar" subtitle="Select today or an earlier date to open its log." backHref={null}>
      <div className="lumen-card lumen-calendar">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="lumen-editorial-title" aria-live="polite">{MONTH_LABEL.format(parseISODate(month))}</h2>
        <div className="flex gap-1.5">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          className="lumen-icon-button"
        >
          <LumenIcon name="left" size={17} />
        </button>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          className="lumen-icon-button"
        >
          <LumenIcon name="chevron" size={17} />
        </button>
        </div>
      </div>
      <CycleCalendar
        cycles={cycles}
        prediction={lifeStage === 'pregnancy' || lifeStage === 'postpartum' ? null : prediction}
        month={month}
        today={today}
        showFertile={lifeStage === 'cycle' || lifeStage === 'ttc'}
      />
      {month.slice(0, 7) !== today.slice(0, 7) && (
        <button
          type="button"
          onClick={() => setMonth(today)}
          className="lumen-text-link"
        >
          Back to this month
        </button>
      )}
      </div>
      <section className="lumen-card">
        <h2 className="lumen-card-title">Today</h2>
        <Link href="/log" className="lumen-text-link"><LumenIcon name="add" size={17} /> {dailyLogs.some((entry) => entry.date === today) ? 'Edit today’s log' : 'Log today'}</Link>
      </section>
    </PageShell>
  );
}
