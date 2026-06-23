import { daysBetween } from '@/src/domain/dates';
import type { ISODate } from '@/src/domain/types';

export type RecoveryStage = 'acute' | 'extended' | 'ongoing';

export function postpartumDay(birthDate: ISODate, onDate: ISODate): number {
  return Math.max(0, daysBetween(birthDate, onDate));
}

export function postpartumWeek(birthDate: ISODate, onDate: ISODate): number {
  return Math.floor(postpartumDay(birthDate, onDate) / 7) + 1;
}

export function recoveryStage(birthDate: ISODate, onDate: ISODate): RecoveryStage {
  const week = postpartumWeek(birthDate, onDate);
  if (week <= 6) return 'acute';
  if (week <= 12) return 'extended';
  return 'ongoing';
}
