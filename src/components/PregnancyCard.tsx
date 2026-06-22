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
    <section className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-4">
      <h2 className="text-base font-semibold">
        {gestation.weeks} weeks {gestation.days} days
      </h2>
      <p className="text-sm text-neutral-700">Trimester {trimester} · {countdown}</p>
      <p className="text-sm text-neutral-700">
        Your baby is about the size of <span className="font-medium">{week.sizeComparison}</span>.
      </p>
    </section>
  );
}
