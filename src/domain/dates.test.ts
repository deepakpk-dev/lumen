import { describe, it, expect } from 'vitest';
import { addDays, daysBetween, isValidISODate, msUntilNextMidnight, parseISODate, toISODate } from './dates';

describe('date utils', () => {
  it('adds days without timezone drift', () => {
    expect(addDays('2026-01-30', 5)).toBe('2026-02-04');
  });

  it('counts whole calendar days between dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-29')).toBe(28);
    expect(daysBetween('2026-01-29', '2026-01-01')).toBe(-28);
  });

  it('measures ms to the next local midnight', () => {
    // 23:59:50 local → 10s to midnight; 00:00:00 → a full day away.
    const nearMidnight = new Date(2026, 5, 17, 23, 59, 50);
    expect(msUntilNextMidnight(nearMidnight)).toBe(10_000);
    const startOfDay = new Date(2026, 5, 17, 0, 0, 0);
    expect(msUntilNextMidnight(startOfDay)).toBe(24 * 60 * 60 * 1000);
  });

  it('round-trips Date <-> ISODate', () => {
    expect(toISODate(parseISODate('2026-06-17'))).toBe('2026-06-17');
  });

  it('validates ISO dates and rejects malformed/impossible ones', () => {
    expect(isValidISODate('2026-06-17')).toBe(true);
    expect(isValidISODate('2026-02-31')).toBe(false); // no such day
    expect(isValidISODate('2026-13-01')).toBe(false); // no such month
    expect(isValidISODate('2026-6-7')).toBe(false); // not zero-padded
    expect(isValidISODate('06/17/2026')).toBe(false);
    expect(isValidISODate('')).toBe(false);
  });
});
