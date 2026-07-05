'use client';

import { PageShell } from '@/src/components/PageShell';
import { useHealthData } from '@/src/state/useHealthData';
import { ProgramCard } from '@/src/components/ProgramCard';

export default function ProgramsPage() {
  const { programs, loading } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <PageShell
      title="Programs"
      subtitle="Short, guided reading paths for where you are right now. Work through the steps at your own pace — your progress stays on this device."
    >
      {programs.length > 0 ? (
        <div className="space-y-3">
          {programs.map((status) => (
            <ProgramCard key={status.program.slug} status={status} />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          A guided program for this stage is on its way.
        </p>
      )}
    </PageShell>
  );
}
