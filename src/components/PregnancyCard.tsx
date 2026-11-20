import { LumenIcon } from './LumenIcon';
import type { GestationalAge, Trimester } from '@/src/domain/pregnancy/gestation';
import type { WeekContent } from '@/src/domain/pregnancy/weeks';

export function PregnancyCard({
  gestation,
  trimester,
  daysToDue,
  week,
}: {
  gestation: GestationalAge;
  trimester: Trimester;
  daysToDue: number;
  week: WeekContent;
}) {
  const countdown =
    daysToDue > 0
      ? `${daysToDue} days to go`
      : daysToDue === 0
        ? 'Due today'
        : `${Math.abs(daysToDue)} days past due`;

  return (
    <section className="lumen-card lumen-stage-card space-y-2">
      <span className="lumen-icon-box"><LumenIcon name="leaf" size={27} /></span>
      <h2 className="lumen-editorial-title">{gestation.weeks} weeks {gestation.days} days</h2>
      <p className="lumen-muted text-sm">Trimester {trimester} · {countdown}</p>
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        Your baby is about the size of <span className="font-medium">{week.sizeComparison}</span>.
      </p>
    </section>
  );
}
