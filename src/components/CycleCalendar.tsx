import Link from 'next/link';
import type { Cycle, ISODate, Prediction } from '@/src/domain/types';
import { getDayMarker, type DayMarker } from '@/src/domain/calendar';
import { parseISODate, toISODate } from '@/src/domain/dates';

const MARKER_STYLE: Record<DayMarker, string> = {
  period: 'bg-rose-600 text-white',
  // Dashed outline (not a paler fill) so a forecast day is unmistakable from a
  // logged period day — the two pinks were near-identical at a glance.
  'predicted-period':
    'border border-dashed border-rose-500 bg-rose-50 text-rose-700 dark:border-rose-400 dark:bg-rose-950/40 dark:text-rose-200',
  fertile: 'bg-emerald-100 text-emerald-900',
  ovulation: 'bg-emerald-500 text-white',
  none: '',
};

const MARKER_LABEL: Record<DayMarker, string> = {
  period: 'period',
  'predicted-period': 'predicted period',
  fertile: 'fertile window',
  ovulation: 'ovulation',
  none: '',
};

const LEGEND: DayMarker[] = ['period', 'predicted-period', 'fertile', 'ovulation'];

export function CycleCalendar({
  cycles,
  prediction,
  month,
  today,
  showFertile = true,
}: {
  cycles: Cycle[];
  prediction: Prediction | null;
  month: ISODate; // any date within the month to render
  today?: ISODate; // highlighted as the current day, if within this month
  // Off in perimenopause: erratic ovulation makes fertile/ovulation markers
  // imply a precision Lumen doesn't have there.
  showFertile?: boolean;
}) {
  const first = parseISODate(month);
  const year = first.getFullYear();
  const m = first.getMonth();
  const firstOfMonth = new Date(year, m, 1);
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();

  const cells: (ISODate | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toISODate(new Date(year, m, i + 1)),
    ),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-neutral-500 dark:text-neutral-400">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const raw = getDayMarker(date, cycles, prediction);
          const marker =
            !showFertile && (raw === 'fertile' || raw === 'ovulation') ? 'none' : raw;
          const day = Number(date.slice(-2));
          const isToday = date === today;
          const parts = [date];
          if (MARKER_LABEL[marker]) parts.push(MARKER_LABEL[marker]);
          if (isToday) parts.push('today');
          const label = parts.join(', ');
          const className = `flex aspect-square items-center justify-center rounded-md text-sm ${MARKER_STYLE[marker]} ${
            isToday ? 'ring-2 ring-rose-500 ring-offset-1 font-semibold' : ''
          }`;
          // Only past/today cells open the log — logging a future day would
          // corrupt cycle detection. Needs `today` to know which side we're on.
          const navigable = today !== undefined && date <= today;
          if (navigable) {
            return (
              <Link
                key={i}
                href={`/log?date=${date}`}
                aria-label={label}
                aria-current={isToday ? 'date' : undefined}
                title={MARKER_LABEL[marker] || undefined}
                className={`${className} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500`}
              >
                {day}
              </Link>
            );
          }
          return (
            <div
              key={i}
              aria-label={label}
              aria-current={isToday ? 'date' : undefined}
              title={MARKER_LABEL[marker] || undefined}
              className={className}
            >
              {day}
            </div>
          );
        })}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-300">
        {LEGEND.filter((m) => showFertile || (m !== 'fertile' && m !== 'ovulation')).map((marker) => (
          <li key={marker} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={`inline-block h-3 w-3 rounded-sm ${MARKER_STYLE[marker]}`}
            />
            <span className="capitalize">{MARKER_LABEL[marker]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
