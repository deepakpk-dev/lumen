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
    return <p className="lumen-note">No cycles logged yet.</p>;
  }

  const lengths = computeCycleLengths(cycles);
  const sorted = [...cycles].sort((a, b) =>
    b.startDate.localeCompare(a.startDate),
  );

  return (
    <div className="space-y-6">
      <dl className="lumen-stat-grid">
        <div>
          <dt>Average cycle</dt>
          <dd>{stats.averageCycleLength} days</dd>
        </div>
        <div>
          <dt>Average period</dt>
          <dd>{stats.averagePeriodLength} days</dd>
        </div>
        <div>
          <dt>Regularity</dt>
          <dd>
            {stats.isRegular ? 'Regular' : 'Variable'}
          </dd>
        </div>
      </dl>

      <ul className="lumen-card">
        {sorted.map((c, i) => {
          // lengths[k] is the gap from chronological cycle k to k+1, so it
          // belongs to that earlier cycle. Map this newest-first row back to
          // its chronological position; the newest cycle has no length yet.
          const chronoIndex = sorted.length - 1 - i;
          const length =
            chronoIndex < lengths.length ? lengths[chronoIndex] : null;
          return (
            <li key={c.id} className="lumen-row flex-wrap justify-between text-sm">
              <span>{c.startDate}</span>
              <span className="lumen-muted">
                {length ? `${length} day cycle` : 'Current cycle'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
