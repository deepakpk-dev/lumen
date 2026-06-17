'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHealthData } from '@/src/state/useHealthData';
import { CycleSummary } from '@/src/components/CycleSummary';
import { InsightCard } from '@/src/components/InsightCard';
import { topInsight } from '@/src/domain/insights/insights';
import { todayISO } from '@/src/domain/dates';

export default function HomePage() {
  const router = useRouter();
  const { cycles, stats, prediction, insights, loading } = useHealthData();

  useEffect(() => {
    if (!loading && cycles.length === 0) router.replace('/onboarding');
  }, [loading, cycles.length, router]);

  if (loading) return <main className="p-6">Loading…</main>;

  const lastPeriodStart = cycles.at(-1)?.startDate ?? null;
  const highlight = topInsight(insights);

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <CycleSummary
        prediction={prediction}
        stats={stats}
        lastPeriodStart={lastPeriodStart}
        today={todayISO()}
      />
      {highlight && <InsightCard insight={highlight} />}
      <nav className="grid grid-cols-2 gap-3 text-center text-sm">
        <Link href="/log" className="rounded-md bg-rose-600 px-4 py-3 text-white">
          Log today
        </Link>
        <Link href="/calendar" className="rounded-md border px-4 py-3">
          Calendar
        </Link>
        <Link href="/history" className="rounded-md border px-4 py-3">
          History
        </Link>
        <Link href="/settings" className="rounded-md border px-4 py-3">
          Settings
        </Link>
        <Link href="/insights" className="rounded-md border px-4 py-3">
          Insights
        </Link>
      </nav>
    </main>
  );
}
