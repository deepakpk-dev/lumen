import type { Insight } from '@/src/domain/insights/types';

const CATEGORY_STYLE: Record<Insight['category'], string> = {
  pattern: 'border-rose-200 bg-rose-50',
  trend: 'border-neutral-200 bg-neutral-50',
  anomaly: 'border-amber-300 bg-amber-50',
  guidance: 'border-emerald-200 bg-emerald-50',
};

export function InsightCard({ insight }: { insight: Insight }) {
  const attention = insight.severity === 'attention';
  return (
    <article className={`rounded-2xl border p-4 ${CATEGORY_STYLE[insight.category]}`}>
      {attention && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
          ⚠ Worth noting
        </p>
      )}
      <h3 className="font-semibold">{insight.title}</h3>
      <p className="mt-1 text-sm text-neutral-700">{insight.body}</p>
      {insight.detail && (
        <p className="mt-2 text-xs text-neutral-500">{insight.detail}</p>
      )}
      {attention && (
        <p className="mt-2 text-xs text-neutral-500">
          This is not medical advice. If you&apos;re concerned, consult a clinician.
        </p>
      )}
    </article>
  );
}
