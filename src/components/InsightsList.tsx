import type { Insight } from '@/src/domain/insights/types';
import { InsightCard } from './InsightCard';

export function InsightsList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <div className="rounded-2xl bg-neutral-50 p-6 text-center text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
        Keep logging to unlock insights.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}
