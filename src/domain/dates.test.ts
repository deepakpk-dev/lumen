import { describe, it, expect } from 'vitest';
import { addDays, daysBetween, parseISODate, toISODate } from './dates';

describe('date utils', () => {
  it('adds days without timezone drift', () => {
    expect(addDays('2026-01-30', 5)).toBe('2026-02-04');
  });

  it('counts whole calendar days between dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-29')).toBe(28);
    expect(daysBetween('2026-01-29', '2026-01-01')).toBe(-28);
  });

  it('round-trips Date <-> ISODate', () => {
    expect(toISODate(parseISODate('2026-06-17'))).toBe('2026-06-17');
  });
});
