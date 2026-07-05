'use client';

import { useHealthData } from '@/src/state/useHealthData';
import { InsightsList } from '@/src/components/InsightsList';
import { PageShell } from '@/src/components/PageShell';

export default function InsightsPage() {
  const { insights, loading } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <PageShell title="Insights">
      <InsightsList insights={insights} />
    </PageShell>
  );
}
