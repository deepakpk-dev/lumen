import type { Cycle, ISODate, Prediction } from './types';
import { addDays, daysBetween } from './dates';

export type DayMarker =
  | 'period'
  | 'predicted-period'
  | 'fertile'
  | 'ovulation'
  | 'none';

function inRange(date: ISODate, start: ISODate, end: ISODate): boolean {
  return daysBetween(start, date) >= 0 && daysBetween(date, end) >= 0;
}

function isLoggedPeriod(date: ISODate, cycles: Cycle[]): boolean {
  return cycles.some((c) => {
    const end = c.endDate ?? c.startDate;
    return inRange(date, c.startDate, end);
  });
}

export function getDayMarker(
  date: ISODate,
  cycles: Cycle[],
  prediction: Prediction | null,
): DayMarker {
  if (isLoggedPeriod(date, cycles)) return 'period';
  if (!prediction) return 'none';
  if (date === prediction.ovulationDate) return 'ovulation';
  if (inRange(date, prediction.fertileWindow.start, prediction.fertileWindow.end))
    return 'fertile';
  const predictedEnd = addDays(
    prediction.nextPeriodStart,
    prediction.predictedPeriodLength - 1,
  );
  if (inRange(date, prediction.nextPeriodStart, predictedEnd))
    return 'predicted-period';
  return 'none';
}
