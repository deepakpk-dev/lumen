import Link from 'next/link';
import type { ProgramStatus } from '@/src/domain/content/programs/types';

export function ProgramCard({ status }: { status: ProgramStatus }) {
  const { program, completedCount, totalSteps, percentComplete, isComplete } = status;
  return (
    <Link
      href={`/programs/${program.slug}`}
      className="block rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-rose-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-rose-700"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{program.title}</h3>
        {isComplete && (
          <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            Complete
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{program.summary}</p>
      <div className="mt-3 space-y-1">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
          role="progressbar"
          aria-valuenow={percentComplete}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${program.title} progress`}
        >
          <div
            className="h-full rounded-full bg-rose-500"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {completedCount} of {totalSteps} steps
        </p>
      </div>
    </Link>
  );
}
