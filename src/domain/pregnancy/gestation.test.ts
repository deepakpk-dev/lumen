import { describe, it, expect } from 'vitest';
import {
  eddFromLmp,
  lmpFromEdd,
  GESTATION_DAYS,
  gestationalAge,
  trimester,
  daysUntilDue,
  progressFraction,
} from './gestation';

describe('eddFromLmp', () => {
  it('adds 280 days (Naegele) for a 28-day cycle', () => {
    expect(GESTATION_DAYS).toBe(280);
    expect(eddFromLmp('2026-01-01')).toBe('2026-10-08'); // +280 days
  });

  it('adjusts for cycle length when provided', () => {
    // 31-day cycle → ovulation 3 days later → +283 days
    expect(eddFromLmp('2026-01-01', { averageCycleLength: 31 })).toBe('2026-10-11');
  });

  it('ignores a non-finite average cycle length', () => {
    expect(eddFromLmp('2026-01-01', { averageCycleLength: NaN })).toBe('2026-10-08');
  });
});

describe('lmpFromEdd', () => {
  it('subtracts 280 days', () => {
    expect(lmpFromEdd('2026-10-08')).toBe('2026-01-01');
  });

  it('round-trips with eddFromLmp', () => {
    expect(lmpFromEdd(eddFromLmp('2026-03-15'))).toBe('2026-03-15');
  });
});

describe('gestationalAge', () => {
  it('computes weeks and days from the due date', () => {
    // LMP 2026-01-01 → due 2026-10-08. On 2026-02-19 = 49 days = 7w 0d.
    expect(gestationalAge('2026-10-08', '2026-02-19')).toEqual({
      weeks: 7,
      days: 0,
      totalDays: 49,
    });
  });

  it('clamps to zero before conception date', () => {
    expect(gestationalAge('2026-10-08', '2025-12-01')).toEqual({
      weeks: 0,
      days: 0,
      totalDays: 0,
    });
  });
});

describe('trimester', () => {
  it('maps completed weeks to ACOG trimesters', () => {
    expect(trimester(0)).toBe(1);
    expect(trimester(13)).toBe(1);
    expect(trimester(14)).toBe(2);
    expect(trimester(27)).toBe(2);
    expect(trimester(28)).toBe(3);
    expect(trimester(41)).toBe(3);
  });
});

describe('daysUntilDue', () => {
  it('is positive before the due date and negative after', () => {
    expect(daysUntilDue('2026-10-08', '2026-10-01')).toBe(7);
    expect(daysUntilDue('2026-10-08', '2026-10-15')).toBe(-7);
  });
});

describe('progressFraction', () => {
  it('is 0 at LMP, ~0.5 mid, 1 at due date, clamped', () => {
    expect(progressFraction('2026-10-08', '2026-01-01')).toBe(0);
    expect(progressFraction('2026-10-08', '2026-10-08')).toBe(1);
    expect(progressFraction('2026-10-08', '2027-01-01')).toBe(1); // post-term clamp
    expect(progressFraction('2026-10-08', '2025-01-01')).toBe(0); // pre-LMP clamp
  });
});
