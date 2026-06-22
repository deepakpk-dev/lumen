import { addDays, daysBetween } from '@/src/domain/dates';
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

export interface GestationalAge {
  weeks: number;
  days: number;
  totalDays: number;
}

export type Trimester = 1 | 2 | 3;

export function gestationalAge(dueDate: ISODate, onDate: ISODate): GestationalAge {
  const lmp = lmpFromEdd(dueDate);
  const raw = daysBetween(lmp, onDate);
  const totalDays = Math.max(0, raw);
  return {
    weeks: Math.floor(totalDays / 7),
    days: totalDays % 7,
    totalDays,
  };
}

export function trimester(weeks: number): Trimester {
  if (weeks <= 13) return 1;
  if (weeks <= 27) return 2;
  return 3;
}

export function daysUntilDue(dueDate: ISODate, onDate: ISODate): number {
  return daysBetween(onDate, dueDate);
}

export function progressFraction(dueDate: ISODate, onDate: ISODate): number {
  const { totalDays } = gestationalAge(dueDate, onDate);
  return Math.min(1, Math.max(0, totalDays / GESTATION_DAYS));
}
