import { describe, it, expect } from 'vitest';
import { generateTrendInsights } from './trends';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import { addDays } from '@/src/domain/dates';
import type { Cycle, DailyLog, Prediction } from '@/src/domain/types';

function cyclesFromGaps(gaps: number[]): Cycle[] {
  let d = '2026-01-01';
  const cycles: Cycle[] = [{ id: 'c0', startDate: d }];
  gaps.forEach((g, i) => {
    d = addDays(d, g);
    cycles.push({ id: `c${i + 1}`, startDate: d });
  });
  return cycles;
}

function input(cycles: Cycle[]) {
  return {
    cycles,
    dailyLogs: [] as DailyLog[],
    stats: computeCycleStats(cycles),
    prediction: null as Prediction | null,
    today: '2026-06-01',
  };
}

describe('generateTrendInsights', () => {
  it('returns nothing below the cycle minimum', () => {
    expect(generateTrendInsights(input(cyclesFromGaps([])))).toHaveLength(0);
  });

  it('reports regularity for steady cycles', () => {
    const out = generateTrendInsights(input(cyclesFromGaps([28, 28, 28])));
    const reg = out.find((i) => i.id === 'trend:regularity');
    expect(reg).toBeDefined();
    expect(reg!.title.toLowerCase()).toContain('regular');
  });

  it('detects a shortening direction', () => {
    // gaps: 30,30,26,26 -> recent3 mean ~27.3, earlier mean 30 -> ~-3 days
    const out = generateTrendInsights(input(cyclesFromGaps([30, 30, 26, 26])));
    const dir = out.find((i) => i.id === 'trend:direction');
    expect(dir).toBeDefined();
    expect(dir!.title.toLowerCase()).toContain('shorter');
  });
});
