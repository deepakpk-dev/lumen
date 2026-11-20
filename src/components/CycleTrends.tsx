import type { Cycle } from '@/src/domain/types';
import { daysBetween, parseISODate } from '@/src/domain/dates';

const formatDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

export function CycleTrends({ cycles }: { cycles: Cycle[] }) {
  const sorted = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(-7);
  const recent = sorted.slice(0, -1).map((cycle, index) => ({
    date: cycle.startDate, days: daysBetween(cycle.startDate, sorted[index + 1].startDate),
  }));
  const max = Math.max(1, ...recent.map(({ days }) => days));

  return (
    <section className="lumen-card">
      <h2 className="lumen-card-title">Cycle length over time</h2>
      {recent.length === 0 ? (
        <p className="lumen-subtitle">Log two period start dates to see your first complete cycle here.</p>
      ) : (
        <ul className="lumen-trend-rows" aria-label="Most recent complete cycles">
          {recent.map(({ date, days }) => (
            <li key={date} className="lumen-trend-row">
              <time dateTime={date}>{formatDate.format(parseISODate(date))}</time>
              <span className="lumen-trend-bar" aria-hidden="true"><span style={{ width: `${days / max * 100}%` }} /></span>
              <strong>{days} days</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
