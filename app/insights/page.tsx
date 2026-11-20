'use client';

import { useHealthData } from '@/src/state/useHealthData';
import { InsightsList } from '@/src/components/InsightsList';
import { PageShell } from '@/src/components/PageShell';
import Link from 'next/link';
import { LumenIcon } from '@/src/components/LumenIcon';
import { CycleTrends } from '@/src/components/CycleTrends';

export default function InsightsPage() {
  const { insights, loading, cycles, stats, isPregnant, isPostpartum } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <PageShell title="Insights" eyebrow="Learn your rhythm" subtitle="Gentle observations from what you’ve logged." backHref={null}>
      {!isPregnant && !isPostpartum && (
        <>
          <dl className="lumen-stat-grid">
            <div><dt>Average cycle</dt><dd>{stats.cycleCount ? `${stats.averageCycleLength}d` : '—'}</dd></div>
            <div><dt>Average period</dt><dd>{cycles.some((cycle) => cycle.endDate) ? `${stats.averagePeriodLength}d` : '—'}</dd></div>
            <div><dt>Cycles logged</dt><dd>{stats.cycleCount}</dd></div>
          </dl>
          <CycleTrends cycles={cycles} />
          <Link href="/history" className="lumen-outline">Explore trends <LumenIcon name="arrow" size={16} /></Link>
        </>
      )}
      <InsightsList insights={insights} />
    </PageShell>
  );
}
