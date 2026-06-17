import type { CycleStats, ISODate, Prediction } from '@/src/domain/types';
import { getCyclePhase } from '@/src/domain/prediction';
import { daysBetween } from '@/src/domain/dates';

const PHASE_LABEL: Record<string, string> = {
  menstrual: 'Menstrual phase',
  follicular: 'Follicular phase',
  ovulation: 'Ovulation phase',
  luteal: 'Luteal phase',
};

export function CycleSummary({
  prediction,
  stats,
  lastPeriodStart,
  today,
}: {
  prediction: Prediction | null;
  stats: CycleStats;
  lastPeriodStart: ISODate | null;
  today: ISODate;
}) {
  if (!prediction || !lastPeriodStart) {
    return (
      <div className="rounded-2xl bg-rose-50 p-6 text-center">
        <p className="text-neutral-700">
          Log your first period to see predictions.
        </p>
      </div>
    );
  }

  const cycleDay = daysBetween(lastPeriodStart, today) + 1;
  const phase = getCyclePhase(cycleDay, stats);
  const daysToNext = daysBetween(today, prediction.nextPeriodStart);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-rose-50 p-6 text-center">
        <p className="text-sm uppercase tracking-wide text-rose-700">
          {PHASE_LABEL[phase]}
        </p>
        <p className="mt-2 text-4xl font-semibold">Day {cycleDay}</p>
        <p className="mt-2 text-neutral-700">
          {daysToNext > 0
            ? `Next period in ~${daysToNext} day${daysToNext === 1 ? '' : 's'}`
            : 'Your period may start any day now'}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Confidence: {prediction.confidence}
        </p>
      </div>
      <p className="text-sm text-neutral-600">{prediction.explanation}</p>
      <p className="text-xs text-neutral-400">
        These predictions are estimates and not medical advice. Consult a
        clinician with health concerns.
      </p>
    </section>
  );
}
