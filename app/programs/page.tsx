'use client';

import Link from 'next/link';
import { PageShell } from '@/src/components/PageShell';
import { useHealthData } from '@/src/state/useHealthData';
import { ProgramCard } from '@/src/components/ProgramCard';

export default function ProgramsPage() {
  const { programs, loading } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <PageShell
      title="Programs"
      subtitle="Read a series of short articles on one topic and mark each step as you finish it."
    >
      {programs.length > 0 ? (
        <div className="space-y-3">
          {programs.map((status) => (
            <ProgramCard key={status.program.slug} status={status} />
          ))}
        </div>
      ) : (
        <p className="lumen-card lumen-help">
          There are no programs for this tracking mode yet.{' '}
          <Link href="/library" className="underline">Browse the Library</Link>.
        </p>
      )}
    </PageShell>
  );
}
