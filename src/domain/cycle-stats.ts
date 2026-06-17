import type { Cycle, CycleStats } from './types';
import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
  REGULARITY_STDDEV_THRESHOLD,
} from './types';
import { daysBetween } from './dates';

function sortByStart(cycles: Cycle[]): Cycle[] {
  return [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function computeCycleLengths(cycles: Cycle[]): number[] {
  const sorted = sortByStart(cycles);
  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    lengths.push(daysBetween(sorted[i - 1].startDate, sorted[i].startDate));
  }
  return lengths;
}

function computePeriodLengths(cycles: Cycle[]): number[] {
  return cycles
    .filter((c) => c.endDate)
    .map((c) => daysBetween(c.startDate, c.endDate as string) + 1);
}

export function computeCycleStats(cycles: Cycle[]): CycleStats {
  const lengths = computeCycleLengths(cycles);
  const periodLengths = computePeriodLengths(cycles);

  const averageCycleLength =
    lengths.length > 0 ? Math.round(mean(lengths)) : DEFAULT_CYCLE_LENGTH;
  const averagePeriodLength =
    periodLengths.length > 0
      ? Math.round(mean(periodLengths))
      : DEFAULT_PERIOD_LENGTH;
  const cycleLengthStdDev = Number(stdDev(lengths).toFixed(2));

  return {
    cycleCount: lengths.length,
    averageCycleLength,
    cycleLengthStdDev,
    averagePeriodLength,
    isRegular:
      lengths.length >= 2 && cycleLengthStdDev <= REGULARITY_STDDEV_THRESHOLD,
  };
}
