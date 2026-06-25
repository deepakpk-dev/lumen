import type { Insight } from '@/src/domain/insights/types';

const CATEGORY_STYLE: Record<Insight['category'], string> = {
  pattern: 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40',
  trend: 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900',
  anomaly: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40',
  guidance: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40',
};

export function InsightCard({ insight }: { insight: Insight }) {
  const attention = insight.severity === 'attention';
  return (
    <article className={`rounded-2xl border p-4 ${CATEGORY_STYLE[insight.category]}`}>
      {attention && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          ⚠ Worth noting
        </p>
      )}
      <h3 className="font-semibold">{insight.title}</h3>
      <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{insight.body}</p>
      {insight.detail && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{insight.detail}</p>
      )}
      {attention && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          This is not medical advice. If you&apos;re concerned, consult a clinician.
        </p>
      )}
    </article>
  );
}
