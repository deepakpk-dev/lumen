import type { CycleStats, ISODate, Prediction } from '@/src/domain/types';
import { LUTEAL_PHASE_LENGTH } from '@/src/domain/types';
import { getCyclePhase } from '@/src/domain/prediction';
import { daysBetween, parseISODate } from '@/src/domain/dates';
import Link from 'next/link';
import { LumenIcon } from './LumenIcon';

const PHASE_LABEL: Record<string, string> = {
  menstrual: 'Menstrual phase',
  follicular: 'Follicular phase',
  ovulation: 'Estimated ovulation',
  luteal: 'Luteal phase',
};

export function CycleSummary({
  prediction,
  stats,
  lastPeriodStart,
  today,
  showPhase = true,
}: {
  prediction: Prediction | null;
  stats: CycleStats;
  lastPeriodStart: ISODate | null;
  today: ISODate;
  showPhase?: boolean;
}) {
  if (!prediction || !lastPeriodStart) {
    return (
      <section className="lumen-card">
        <h2 className="lumen-editorial-title">No period logged yet</h2>
        <p className="lumen-subtitle">Log when your last period started to see an estimate for your next one.</p>
      </section>
    );
  }

  const cycleDay = daysBetween(lastPeriodStart, today) + 1;
  const phase = getCyclePhase(cycleDay, stats);
  const daysToNext = daysBetween(today, prediction.nextPeriodStart);
  const { earliest, latest } = prediction.nextPeriodStartRange;
  const estimateExpired = latest < today;
  const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  const average = stats.averageCycleLength;
  const period = Math.min(stats.averagePeriodLength, Math.max(1, average - 3));
  const ovulationStart = Math.max(period + 1, average - LUTEAL_PHASE_LENGTH - 1);
  const showTimeline = showPhase && average > ovulationStart + 2;

  return (
    <section className="lumen-card lumen-cycle-card">
      <div className="flex items-start justify-between gap-2">
        <p className="lumen-eyebrow">Your cycle today</p>
        {showPhase && cycleDay <= average && <span className="lumen-badge">{PHASE_LABEL[phase]}</span>}
      </div>
      <p className="lumen-cycle-number" aria-hidden="true">{cycleDay}</p>
      <p className="text-sm font-semibold">Day {cycleDay} of your cycle</p>
      <p className="lumen-muted mt-1 text-xs">Typical cycle: {average} days</p>
      {showTimeline && (
        <div className="lumen-phase" aria-label="Illustrative cycle phases">
          <div className="lumen-phase-track" aria-hidden="true">
            {[period, ovulationStart - period - 1, 3, average - ovulationStart - 2].map((length, index) => (
              <span key={index} style={{ flexGrow: length }} />
            ))}
          </div>
          <div className="lumen-phase-labels"><span>Period</span><span>Follicular</span><span>Ovulation</span><span>Luteal</span></div>
        </div>
      )}
      <div className="lumen-cycle-next">
        <span className="lumen-icon-box"><LumenIcon name="calendar" /></span>
        <div className="min-w-0 flex-1">
          <p className="lumen-muted text-xs">{estimateExpired ? 'Period estimate' : 'Next estimated period'}</p>
          <p className="font-semibold">
            {estimateExpired
              ? 'The estimated start window has passed.'
              : dateFormat.formatRange(parseISODate(earliest), parseISODate(latest))}
          </p>
        </div>
        <Link href="/calendar" className="lumen-text-link">View calendar <LumenIcon name="arrow" size={15} /></Link>
      </div>
      <details className="mt-3 text-xs lumen-muted">
        <summary className="cursor-pointer py-2">Confidence: {prediction.confidence}</summary>
        {!estimateExpired && <p className="mt-1">
          {daysToNext > 0
            ? `Next period in ~${daysToNext} day${daysToNext === 1 ? '' : 's'}`
            : 'Your period may start any day now'}
        </p>}
        <p className="mt-2">{prediction.explanation}</p>
        <p className="mt-2">These predictions are estimates and not medical advice. Consult a clinician with health concerns.</p>
      </details>
    </section>
  );
}
