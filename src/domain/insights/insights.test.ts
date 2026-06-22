import { describe, it, expect } from 'vitest';
import { generateInsights, topInsight } from './insights';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import { generatePrediction } from '@/src/domain/prediction';
import type { Cycle, DailyLog, Prediction } from '@/src/domain/types';

describe('generateInsights', () => {
  it('returns empty (and null top) for an empty profile', () => {
    const out = generateInsights({
      cycles: [],
      dailyLogs: [] as DailyLog[],
      stats: computeCycleStats([]),
      prediction: null as Prediction | null,
      today: '2026-06-17',
    });
    expect(out).toHaveLength(0);
    expect(topInsight(out)).toBeNull();
  });

  it('orders attention insights ahead of info insights', () => {
    const cycles: Cycle[] = [{ id: 'a', startDate: '2026-05-13' }];
    const prediction = generatePrediction(cycles); // nextPeriodStart overdue vs the today below
    const out = generateInsights({
      cycles,
      dailyLogs: [],
      stats: computeCycleStats(cycles),
      prediction,
      today: '2026-06-13',
    });
    expect(out.length).toBeGreaterThanOrEqual(2); // overdue (attention) + guidance (info)
    expect(out[0].severity).toBe('attention');
    expect(topInsight(out)!.id).toBe('anomaly:overdue');
    // the info guidance insight comes after the attention one
    expect(out[out.length - 1].severity).toBe('info');
  });
});
