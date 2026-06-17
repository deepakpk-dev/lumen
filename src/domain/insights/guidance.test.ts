import { describe, it, expect } from 'vitest';
import { generateGuidanceInsights } from './guidance';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import type { Cycle, DailyLog, Prediction } from '@/src/domain/types';

const log: DailyLog[] = [];

describe('generateGuidanceInsights', () => {
  it('returns guidance for the current phase', () => {
    const cycles: Cycle[] = [{ id: 'a', startDate: '2026-06-01' }];
    const out = generateGuidanceInsights({
      cycles,
      dailyLogs: log,
      stats: computeCycleStats(cycles),
      prediction: null as Prediction | null,
      today: '2026-06-17', // day 17 -> luteal
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('guidance:luteal');
    expect(out[0].category).toBe('guidance');
    expect(out[0].body.length).toBeGreaterThan(0);
  });

  it('returns nothing when there are no cycles', () => {
    const out = generateGuidanceInsights({
      cycles: [],
      dailyLogs: log,
      stats: computeCycleStats([]),
      prediction: null as Prediction | null,
      today: '2026-06-17',
    });
    expect(out).toHaveLength(0);
  });
});
