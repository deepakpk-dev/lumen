import type { Cycle, ISODate, Prediction } from '@/src/domain/types';
import { getDayMarker, type DayMarker } from '@/src/domain/calendar';
import { parseISODate, toISODate } from '@/src/domain/dates';

const MARKER_STYLE: Record<DayMarker, string> = {
  period: 'bg-rose-600 text-white',
  'predicted-period': 'bg-rose-200 text-rose-900',
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

export function CycleCalendar({
  cycles,
  prediction,
  month,
  today,
}: {
  cycles: Cycle[];
  prediction: Prediction | null;
  month: ISODate; // any date within the month to render
  today?: ISODate; // highlighted as the current day, if within this month
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
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-neutral-500">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const marker = getDayMarker(date, cycles, prediction);
          const day = Number(date.slice(-2));
          const isToday = date === today;
          const parts = [date];
          if (MARKER_LABEL[marker]) parts.push(MARKER_LABEL[marker]);
          if (isToday) parts.push('today');
          const label = parts.join(', ');
          return (
            <div
              key={i}
              aria-label={label}
              aria-current={isToday ? 'date' : undefined}
              title={MARKER_LABEL[marker] || undefined}
              className={`flex aspect-square items-center justify-center rounded-md text-sm ${MARKER_STYLE[marker]} ${
                isToday ? 'ring-2 ring-rose-500 ring-offset-1 font-semibold' : ''
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>
      <ul className="mt-4 space-y-1 text-xs text-neutral-600">
        <li>● Period &nbsp; ◐ Predicted period</li>
        <li>● Fertile window &nbsp; ◉ Ovulation</li>
      </ul>
    </div>
  );
}
