import type { Insight, InsightInput } from './types';
import { MIN_CYCLES_FOR_TRENDS, RECENT_CYCLE_WINDOW, PRIORITY_TREND } from './types';
import { computeCycleLengths } from '@/src/domain/cycle-stats';

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function generateTrendInsights(input: InsightInput): Insight[] {
  const { cycles, stats } = input;
  if (stats.cycleCount < MIN_CYCLES_FOR_TRENDS) return [];

  const insights: Insight[] = [];

  insights.push(
    stats.isRegular
      ? {
          id: 'trend:regularity',
          category: 'trend',
          severity: 'info',
          priority: PRIORITY_TREND,
          title: 'Your cycles have been regular',
          body: `Over your last ${stats.cycleCount} cycles, your cycle length has averaged ${stats.averageCycleLength} days.`,
        }
      : {
          id: 'trend:regularity',
          category: 'trend',
          severity: 'info',
          priority: PRIORITY_TREND,
          title: 'Your cycle length varies',
          body: `Your cycles average about ${stats.averageCycleLength} days but vary by ±${Math.round(
            stats.cycleLengthStdDev,
          )} days.`,
        },
  );

  const lengths = computeCycleLengths(cycles);
  if (lengths.length >= RECENT_CYCLE_WINDOW + 1) {
    const recent = lengths.slice(-RECENT_CYCLE_WINDOW);
    const earlier = lengths.slice(0, -RECENT_CYCLE_WINDOW);
    const diff = Math.round(mean(recent) - mean(earlier));
    if (Math.abs(diff) >= 2) {
      const shorter = diff < 0;
      insights.push({
        id: 'trend:direction',
        category: 'trend',
        severity: 'info',
        priority: PRIORITY_TREND,
        title: shorter
          ? 'Your recent cycles have been shorter'
          : 'Your recent cycles have been longer',
        body: `Your last ${RECENT_CYCLE_WINDOW} cycles have run about ${Math.abs(
          diff,
        )} day${Math.abs(diff) === 1 ? '' : 's'} ${
          shorter ? 'shorter' : 'longer'
        } than your earlier cycles.`,
      });
    }
  }

  return insights;
}
