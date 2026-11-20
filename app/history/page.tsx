'use client';

import { useHealthData } from '@/src/state/useHealthData';
import { CycleHistory } from '@/src/components/CycleHistory';
import { PageShell } from '@/src/components/PageShell';
import { CycleTrends } from '@/src/components/CycleTrends';

export default function HistoryPage() {
  const { cycles, stats, loading } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <PageShell title="History & trends" subtitle="Review past periods and compare cycle lengths." backHref="/insights" backLabel="Insights">
      <CycleTrends cycles={cycles} />
      <div className="lumen-card"><CycleHistory cycles={cycles} stats={stats} /></div>
    </PageShell>
  );
}
