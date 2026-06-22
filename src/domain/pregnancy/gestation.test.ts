import { describe, it, expect } from 'vitest';
import { eddFromLmp, lmpFromEdd, GESTATION_DAYS } from './gestation';

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
