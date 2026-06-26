import { describe, it, expect } from 'vitest';
import { deriveContentContext } from './context';
import type { Cycle, CycleStats, DailyLog } from '@/src/domain/types';

const regularStats: CycleStats = {
  cycleCount: 4,
  averageCycleLength: 28,
  cycleLengthStdDev: 1,
  averagePeriodLength: 5,
  isRegular: true,
  inputCycleCount: 4,
};

const irregularStats: CycleStats = { ...regularStats, isRegular: false };

const emptyStats: CycleStats = {
  cycleCount: 0,
  averageCycleLength: 28,
  cycleLengthStdDev: 0,
  averagePeriodLength: 5,
  isRegular: true,
  inputCycleCount: 0,
};

describe('deriveContentContext', () => {
  it('reports no data when there are no cycles or logs', () => {
    const ctx = deriveContentContext({
      cycles: [],
      dailyLogs: [],
      stats: emptyStats,
      prediction: null,
      today: '2026-06-17',
    });
    expect(ctx.hasData).toBe(false);
    expect(ctx.currentPhase).toBeNull();
    expect(ctx.recentSymptoms).toEqual([]);
    expect(ctx.isIrregular).toBe(false);
    expect(ctx.lifeStage).toBe('cycle');
  });

  it('derives the current phase from the active cycle', () => {
    const cycles: Cycle[] = [{ id: 'c1', startDate: '2026-06-15' }];
    const ctx = deriveContentContext({
      cycles,
      dailyLogs: [],
      stats: regularStats,
      prediction: null,
      today: '2026-06-17', // cycle day 3 → menstrual (period length 5)
    });
    expect(ctx.currentPhase).toBe('menstrual');
    expect(ctx.hasData).toBe(true);
  });

  it('collects unique symptoms and moods logged within the recent window', () => {
    const logs: DailyLog[] = [
      { date: '2026-06-16', symptoms: ['Cramps'], moods: ['Irritable'] },
      { date: '2026-06-10', symptoms: ['Cramps'], moods: [] }, // 7d ago, in window, dup
      { date: '2026-05-20', symptoms: ['Bloating'], moods: [] }, // 28d ago, out of window
    ];
    const ctx = deriveContentContext({
      cycles: [{ id: 'c1', startDate: '2026-06-01' }],
      dailyLogs: logs,
      stats: regularStats,
      prediction: null,
      today: '2026-06-17',
    });
    expect(ctx.recentSymptoms.sort()).toEqual(['Cramps', 'Irritable']);
  });

  it('reflects the provided life stage so content can be scoped to it', () => {
    const ctx = deriveContentContext(
      {
        cycles: [],
        dailyLogs: [],
        stats: emptyStats,
        prediction: null,
        today: '2026-06-17',
      },
      'pregnancy',
    );
    expect(ctx.lifeStage).toBe('pregnancy');
  });

  it('flags irregularity only when data exists', () => {
    const withData = deriveContentContext({
      cycles: [{ id: 'c1', startDate: '2026-06-01' }],
      dailyLogs: [],
      stats: irregularStats,
      prediction: null,
      today: '2026-06-17',
    });
    expect(withData.isIrregular).toBe(true);

    const noData = deriveContentContext({
      cycles: [],
      dailyLogs: [],
      stats: { ...irregularStats, cycleCount: 0, inputCycleCount: 0 },
      prediction: null,
      today: '2026-06-17',
    });
    expect(noData.isIrregular).toBe(false);
  });
});
