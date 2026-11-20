import Link from 'next/link';
import type { ProgramStatus } from '@/src/domain/content/programs/types';

export function ProgramCard({ status }: { status: ProgramStatus }) {
  const { program, completedCount, totalSteps, percentComplete, isComplete } = status;
  return (
    <Link
      href={`/programs/${program.slug}`}
      className="lumen-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="lumen-editorial-title">{program.title}</h2>
        {isComplete && (
          <span className="lumen-badge">
            Complete
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{program.summary}</p>
      <div className="mt-3 space-y-1">
        <div
          className="lumen-progress"
          role="progressbar"
          aria-valuenow={percentComplete}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${program.title} progress`}
        >
          <div
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
