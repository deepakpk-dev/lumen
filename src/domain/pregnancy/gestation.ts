import { addDays } from '@/src/domain/dates';
import type { ISODate } from '@/src/domain/types';

export const GESTATION_DAYS = 280;

export function eddFromLmp(
  lmp: ISODate,
  opts?: { averageCycleLength?: number },
): ISODate {
  const avg = opts?.averageCycleLength;
  const adjustment =
    typeof avg === 'number' && Number.isFinite(avg) ? avg - 28 : 0;
  return addDays(lmp, GESTATION_DAYS + adjustment);
}

export function lmpFromEdd(dueDate: ISODate): ISODate {
  return addDays(dueDate, -GESTATION_DAYS);
}
