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
              className="lumen-progress"
              role="progressbar"
              aria-valuenow={status.percentComplete}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Program progress"
            >
              <div style={{ width: `${status.percentComplete}%` }} />
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
                  className="lumen-card"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="lumen-icon-box mt-0.5 text-xs font-semibold"
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/library/${article.slug}`} className="block">
                        <h2 className="lumen-card-title">{article.title}</h2>
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
                        className="lumen-chip mt-3"
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
        <p className="lumen-card lumen-help text-center">
          Program not found.
        </p>
      )}
    </PageShell>
  );
}
