import { describe, it, expect } from 'vitest';
import { computeCycleLengths, computeCycleStats } from './cycle-stats';
import type { Cycle } from './types';

const cyc = (id: string, startDate: string, endDate?: string): Cycle => ({
  id,
  startDate,
  endDate,
});

describe('computeCycleLengths', () => {
  it('returns gaps between consecutive start dates', () => {
    const cycles = [
      cyc('a', '2026-01-01'),
      cyc('b', '2026-01-29'),
      cyc('c', '2026-02-26'),
    ];
    expect(computeCycleLengths(cycles)).toEqual([28, 28]);
  });

  it('sorts unsorted input by date before computing', () => {
    const cycles = [cyc('b', '2026-01-29'), cyc('a', '2026-01-01')];
    expect(computeCycleLengths(cycles)).toEqual([28]);
  });

  it('returns empty array for fewer than two cycles', () => {
    expect(computeCycleLengths([cyc('a', '2026-01-01')])).toEqual([]);
  });
});

describe('computeCycleStats', () => {
  it('falls back to defaults with no data', () => {
    const stats = computeCycleStats([]);
    expect(stats.cycleCount).toBe(0);
    expect(stats.averageCycleLength).toBe(28);
    expect(stats.averagePeriodLength).toBe(5);
    expect(stats.isRegular).toBe(false);
  });

  it('computes averages for regular cycles', () => {
    const cycles = [
      cyc('a', '2026-01-01', '2026-01-05'),
      cyc('b', '2026-01-29', '2026-02-02'),
      cyc('c', '2026-02-26', '2026-03-02'),
    ];
    const stats = computeCycleStats(cycles);
    expect(stats.cycleCount).toBe(2);
    expect(stats.averageCycleLength).toBe(28);
    expect(stats.averagePeriodLength).toBe(5);
    expect(stats.cycleLengthStdDev).toBe(0);
    expect(stats.isRegular).toBe(true);
  });

  it('flags irregular cycles via standard deviation', () => {
    const cycles = [
      cyc('a', '2026-01-01'),
      cyc('b', '2026-01-22'), // 21
      cyc('c', '2026-03-01'), // 38
    ];
    const stats = computeCycleStats(cycles);
    expect(stats.isRegular).toBe(false);
    expect(stats.cycleLengthStdDev).toBeGreaterThan(3);
  });
});
