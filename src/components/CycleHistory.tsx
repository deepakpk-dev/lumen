import type { Cycle, CycleStats } from '@/src/domain/types';
import { computeCycleLengths } from '@/src/domain/cycle-stats';

export function CycleHistory({
  cycles,
  stats,
}: {
  cycles: Cycle[];
  stats: CycleStats;
}) {
  if (cycles.length === 0) {
    return <p className="text-neutral-600">No cycles logged yet.</p>;
  }

  const lengths = computeCycleLengths(cycles);
  const sorted = [...cycles].sort((a, b) =>
    b.startDate.localeCompare(a.startDate),
  );

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-neutral-100 p-3">
          <dt className="text-xs text-neutral-500">Avg cycle</dt>
          <dd className="text-lg font-semibold">{stats.averageCycleLength} days</dd>
        </div>
        <div className="rounded-xl bg-neutral-100 p-3">
          <dt className="text-xs text-neutral-500">Avg period</dt>
          <dd className="text-lg font-semibold">{stats.averagePeriodLength} days</dd>
        </div>
        <div className="rounded-xl bg-neutral-100 p-3">
          <dt className="text-xs text-neutral-500">Regularity</dt>
          <dd className="text-lg font-semibold">
            {stats.isRegular ? 'Regular' : 'Variable'}
          </dd>
        </div>
      </dl>

      <ul className="divide-y divide-neutral-200">
        {sorted.map((c, i) => {
          // lengths[k] is the gap from chronological cycle k to k+1, so it
          // belongs to that earlier cycle. Map this newest-first row back to
          // its chronological position; the newest cycle has no length yet.
          const chronoIndex = sorted.length - 1 - i;
          const length =
            chronoIndex < lengths.length ? lengths[chronoIndex] : null;
          return (
            <li key={c.id} className="flex justify-between py-3 text-sm">
              <span>{c.startDate}</span>
              <span className="text-neutral-500">
                {length ? `${length} day cycle` : 'Current cycle'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
