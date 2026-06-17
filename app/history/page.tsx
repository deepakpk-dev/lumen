'use client';

import { useHealthData } from '@/src/state/useHealthData';
import { CycleHistory } from '@/src/components/CycleHistory';

export default function HistoryPage() {
  const { cycles, stats, loading } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">History &amp; trends</h1>
      <CycleHistory cycles={cycles} stats={stats} />
    </main>
  );
}
