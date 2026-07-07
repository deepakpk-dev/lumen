import type { ISODate } from './types';

// Local-time date helpers (no dep): dates are YYYY-MM-DD in the user's zone.

export function toISODate(d: Date): ISODate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Parse as LOCAL midnight (new Date('yyyy-mm-dd') would parse as UTC and
// shift the calendar day west of Greenwich).
export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

// Calendar-day difference, DST-proof: compare the dates as UTC midnights so a
// 23/25-hour day still counts as exactly one.
export function daysBetween(a: ISODate, b: ISODate): number {
  const utc = (s: ISODate) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(b) - utc(a)) / 86_400_000);
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
