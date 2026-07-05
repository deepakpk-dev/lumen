'use client';

import { useHealthData } from '@/src/state/useHealthData';
import { CycleHistory } from '@/src/components/CycleHistory';
import { PageShell } from '@/src/components/PageShell';

export default function HistoryPage() {
  const { cycles, stats, loading } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <PageShell title="History & trends">
      <CycleHistory cycles={cycles} stats={stats} />
    </PageShell>
  );
}
