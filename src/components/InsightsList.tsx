import Link from 'next/link';
import type { Insight } from '@/src/domain/insights/types';
import { InsightCard } from './InsightCard';

export function InsightsList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <div className="lumen-card lumen-muted text-center">
        <p>No insights yet. Lumen needs more entries to spot patterns.</p>
        <Link href="/log" className="lumen-text-link mt-2">Log today</Link>
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
