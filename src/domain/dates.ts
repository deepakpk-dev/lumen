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

// Milliseconds from `now` until the next local midnight (00:00 the following
// day). Drives the daily rollover of the app's reactive "today" so derivations
// re-compute when the calendar date changes.
export function msUntilNextMidnight(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

// True only for a real calendar date in strict YYYY-MM-DD form. Guards untrusted
// input (e.g. a ?date= URL param) — rejects impossible dates like 2026-02-31 by
// round-tripping through the parser.
export function isValidISODate(s: string): s is ISODate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseISODate(s);
  return !Number.isNaN(d.getTime()) && toISODate(d) === s;
}
