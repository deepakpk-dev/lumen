'use client';

import { useHealthData } from '@/src/state/useHealthData';
import { InsightsList } from '@/src/components/InsightsList';
import { BackLink } from '@/src/components/BackLink';

export default function InsightsPage() {
  const { insights, loading } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <BackLink href="/">Home</BackLink>
      <h1 className="text-xl font-semibold">Insights</h1>
      <InsightsList insights={insights} />
    </main>
  );
}
