'use client';

import Link from 'next/link';
import { useHealthData } from '@/src/state/useHealthData';
import { findArticle } from '@/src/content';
import { PageShell } from '@/src/components/PageShell';

export function ProgramDetail({ slug }: { slug: string }) {
  const { getProgramStatus, setProgramStepDone } = useHealthData();
  const status = getProgramStatus(slug);

  return (
    <PageShell
      backHref="/programs"
      backLabel="Programs"
      title={status?.program.title}
      subtitle={status?.program.description}
    >
      {status ? (
        <>
          <header className="space-y-2">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
              role="progressbar"
              aria-valuenow={status.percentComplete}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Program progress"
            >
              <div className="h-full rounded-full bg-rose-500" style={{ width: `${status.percentComplete}%` }} />
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {status.isComplete
                ? 'You’ve completed this program 🎉'
                : `${status.completedCount} of ${status.totalSteps} steps complete`}
            </p>
          </header>

          <ol className="space-y-3">
            {status.program.steps.map((step, i) => {
              const article = findArticle(step.articleSlug);
              if (!article) return null;
              const done = status.completedSteps.includes(step.articleSlug);
              return (
                <li
                  key={step.articleSlug}
                  className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        done
                          ? 'bg-rose-500 text-white'
                          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/library/${article.slug}`} className="block">
                        <h3 className="font-semibold">{article.title}</h3>
                        <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                          {article.summary}
                        </p>
                        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                          {article.readingMinutes} min read
                        </p>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setProgramStepDone(status.program.slug, step.articleSlug, !done)}
                        aria-pressed={done}
                        className={`mt-3 rounded-md border px-3 py-1.5 text-sm transition ${
                          done
                            ? 'border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300'
                            : 'border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200'
                        }`}
                      >
                        {done ? 'Completed ✓' : 'Mark complete'}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <p className="rounded-2xl bg-neutral-50 p-6 text-center text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
          Program not found.
        </p>
      )}
    </PageShell>
  );
}
