import { describe, it, expect } from 'vitest';
import { generateAnomalyInsights } from './anomalies';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import { generatePrediction } from '@/src/domain/prediction';
import { addDays } from '@/src/domain/dates';
import type { Cycle, DailyLog, Prediction } from '@/src/domain/types';

function cyclesFromGaps(gaps: number[], start = '2026-01-01'): Cycle[] {
  let d = start;
  const cycles: Cycle[] = [{ id: 'c0', startDate: d }];
  gaps.forEach((g, i) => {
    d = addDays(d, g);
    cycles.push({ id: `c${i + 1}`, startDate: d });
  });
  return cycles;
}

const log = (date: string, symptoms: string[]): DailyLog => ({
  date,
  symptoms,
  moods: [],
});

describe('generateAnomalyInsights', () => {
  it('flags an overdue period', () => {
    const cycles: Cycle[] = [{ id: 'a', startDate: '2026-05-13' }];
    const prediction = generatePrediction(cycles); // nextPeriodStart 2026-06-10
    const out = generateAnomalyInsights({
      cycles,
      dailyLogs: [],
      stats: computeCycleStats(cycles),
      prediction,
      today: '2026-06-13',
    });
    const od = out.find((i) => i.id === 'anomaly:overdue');
    expect(od).toBeDefined();
    expect(od!.severity).toBe('attention');
    expect(od!.body.toLowerCase()).toContain('clinician');
  });

  it('does not flag overdue once a new period has started', () => {
    const cycles: Cycle[] = [
      { id: 'a', startDate: '2026-05-13' },
      { id: 'b', startDate: '2026-06-11' },
    ];
    const prediction = generatePrediction(cycles);
    const out = generateAnomalyInsights({
      cycles,
      dailyLogs: [],
      stats: computeCycleStats(cycles),
      prediction,
      today: '2026-06-13',
    });
    expect(out.find((i) => i.id === 'anomaly:overdue')).toBeUndefined();
  });

  it('flags an unusually long recent cycle vs the prior norm', () => {
    const cycles = cyclesFromGaps([28, 28, 28, 45]); // prior mean 28, last 45
    const out = generateAnomalyInsights({
      cycles,
      dailyLogs: [],
      stats: computeCycleStats(cycles),
      prediction: null,
      today: '2026-12-01',
    });
    const cl = out.find((i) => i.id === 'anomaly:cycle-length');
    expect(cl).toBeDefined();
    expect(cl!.title.toLowerCase()).toContain('longer');
    // Body compares against the prior norm (28), and says so explicitly so it
    // doesn't read as contradicting the overall average shown elsewhere.
    expect(cl!.body).toContain('earlier average of 28 days');
  });

  it('flags a recent symptom cluster', () => {
    const out = generateAnomalyInsights({
      cycles: [],
      dailyLogs: [
        log('2026-06-17', ['Cramps', 'Headache']),
        log('2026-06-16', ['Bloating']),
        log('2026-06-15', ['Nausea']),
      ],
      stats: computeCycleStats([]),
      prediction: null as Prediction | null,
      today: '2026-06-17',
    });
    const cluster = out.find((i) => i.id === 'anomaly:symptom-cluster');
    expect(cluster).toBeDefined();
    expect(cluster!.severity).toBe('attention');
  });
});
