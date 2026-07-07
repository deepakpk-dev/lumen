'use client';

import { BackLink } from '@/src/components/BackLink';
import { useHealthData } from '@/src/state/useHealthData';
import { parseISODate, daysBetween } from '@/src/domain/dates';
import type { DailyLog } from '@/src/domain/types';

// "7 Jul 2026" — en-GB gives day-first without a custom formatter.
function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmt(iso: string): string {
  return fmtDate(parseISODate(iso));
}

// A logged day is worth showing the clinician only if it carries a symptom,
// mood, note, or bleeding — empty days are noise on a summary.
function hasContent(l: DailyLog): boolean {
  return (
    (!!l.flow && l.flow !== 'none') ||
    l.symptoms.length > 0 ||
    l.moods.length > 0 ||
    !!l.notes
  );
}

export default function ReportPage() {
  const { cycles, dailyLogs, stats, prediction, loading } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;

  const sorted = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const rangeStart = sorted[0]?.startDate;
  const rangeEnd = fmtDate(new Date());

  // ponytail: cap the symptom log at 60 most-recent entries; a doctor-visit
  // summary spans a few months, and an unbounded table wastes paper. Raise the
  // cap or add a date-range picker if users ask for longer histories.
  const loggedDays = [...dailyLogs]
    .filter(hasContent)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 60);

  return (
    <main className="print-full mx-auto max-w-2xl space-y-6 p-6">
      <div className="no-print flex items-center justify-between">
        <BackLink href="/settings">Settings</BackLink>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border px-4 py-2 text-sm font-medium"
        >
          Print / Save as PDF
        </button>
      </div>

      <header className="space-y-1 border-b border-neutral-300 pb-4 dark:border-neutral-700">
        <h1 className="text-2xl font-semibold">Cycle Health Summary</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Generated {rangeEnd}
          {rangeStart ? ` · covers ${fmt(rangeStart)} – ${rangeEnd}` : ''}
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          At a glance
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Cycles tracked" value={String(stats.cycleCount)} />
          <Stat label="Avg cycle length" value={`${stats.averageCycleLength} days`} />
          <Stat label="Avg period length" value={`${stats.averagePeriodLength} days`} />
          <Stat
            label="Regularity"
            value={
              stats.cycleCount < 2
                ? '—'
                : stats.isRegular
                  ? 'Regular'
                  : 'Irregular'
            }
            sub={stats.cycleCount >= 2 ? `± ${stats.cycleLengthStdDev} days` : undefined}
          />
        </dl>
      </section>

      {prediction && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Current prediction ({prediction.confidence} confidence)
          </h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Next period (est.)" value={fmt(prediction.nextPeriodStart)} />
            <Stat label="Est. ovulation" value={fmt(prediction.ovulationDate)} />
            <Stat
              label="Fertile window"
              value={`${fmt(prediction.fertileWindow.start)} – ${fmt(prediction.fertileWindow.end)}`}
            />
          </dl>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Cycle history
        </h2>
        {sorted.length === 0 ? (
          <p className="text-sm text-neutral-500">No cycles recorded yet.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-left dark:border-neutral-700">
                <th className="py-1 pr-2 font-medium">Period start</th>
                <th className="py-1 pr-2 font-medium">Period end</th>
                <th className="py-1 pr-2 font-medium">Period length</th>
                <th className="py-1 font-medium">Cycle length</th>
              </tr>
            </thead>
            <tbody>
              {sorted
                .map((c, i) => ({
                  cycle: c,
                  periodLength: c.endDate ? daysBetween(c.startDate, c.endDate) + 1 : null,
                  cycleLength: sorted[i + 1]
                    ? daysBetween(c.startDate, sorted[i + 1].startDate)
                    : null,
                }))
                .reverse()
                .map(({ cycle, periodLength, cycleLength }) => (
                  <tr key={cycle.id} className="border-b border-neutral-200 dark:border-neutral-800">
                    <td className="py-1 pr-2">{fmt(cycle.startDate)}</td>
                    <td className="py-1 pr-2">{cycle.endDate ? fmt(cycle.endDate) : '—'}</td>
                    <td className="py-1 pr-2">{periodLength !== null ? `${periodLength} days` : '—'}</td>
                    <td className="py-1">{cycleLength !== null ? `${cycleLength} days` : '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>

      {loggedDays.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Symptom &amp; note log
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-left dark:border-neutral-700">
                <th className="py-1 pr-2 font-medium">Date</th>
                <th className="py-1 pr-2 font-medium">Flow</th>
                <th className="py-1 font-medium">Symptoms, moods &amp; notes</th>
              </tr>
            </thead>
            <tbody>
              {loggedDays.map((l) => (
                <tr key={l.date} className="border-b border-neutral-200 align-top dark:border-neutral-800">
                  <td className="py-1 pr-2 whitespace-nowrap">{fmt(l.date)}</td>
                  <td className="py-1 pr-2 capitalize">{l.flow && l.flow !== 'none' ? l.flow : '—'}</td>
                  <td className="py-1">
                    {[...l.symptoms, ...l.moods].join(', ')}
                    {l.notes ? `${l.symptoms.length || l.moods.length ? ' — ' : ''}${l.notes}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="border-t border-neutral-300 pt-4 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        Generated by Lumen from data stored on this device. Predictions are
        estimates for educational use and are not a medical diagnosis.
      </p>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <dt className="text-xs text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
      {sub && <dd className="text-xs text-neutral-500 dark:text-neutral-400">{sub}</dd>}
    </div>
  );
}
