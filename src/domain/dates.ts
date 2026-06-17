import {
  format,
  parseISO,
  addDays as fnsAddDays,
  differenceInCalendarDays,
} from 'date-fns';
import type { ISODate } from './types';

export function toISODate(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd');
}

export function parseISODate(s: ISODate): Date {
  return parseISO(s);
}

export function addDays(s: ISODate, n: number): ISODate {
  return toISODate(fnsAddDays(parseISODate(s), n));
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(parseISODate(b), parseISODate(a));
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}
