'use client';

import Link from 'next/link';
import { useHealthData } from '@/src/state/useHealthData';
import { ProgramCard } from '@/src/components/ProgramCard';

export default function ProgramsPage() {
  const { programs, loading } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Programs</h1>
        <Link href="/" className="text-sm text-neutral-500 underline dark:text-neutral-400">
          Home
        </Link>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        Short, guided reading paths for where you are right now. Work through the
        steps at your own pace — your progress stays on this device.
      </p>
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
    </main>
  );
}
