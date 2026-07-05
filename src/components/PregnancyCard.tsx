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
    <section className="space-y-3 rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50 to-pink-50/60 p-5 shadow-sm backdrop-blur dark:border-rose-900/70 dark:from-rose-950/50 dark:to-pink-950/30">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-[0_4px_14px_rgba(225,29,72,0.4)]"
        >
          {/* Heart — the pregnancy goal's glyph from onboarding */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20s-6.5-4.2-6.5-9A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 6.5 4c0 4.8-6.5 9-6.5 9z" />
          </svg>
        </span>
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            {gestation.weeks} weeks {gestation.days} days
          </h2>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Trimester {trimester} · {countdown}
          </p>
        </div>
      </div>
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        Your baby is about the size of <span className="font-medium">{week.sizeComparison}</span>.
      </p>
    </section>
  );
}
