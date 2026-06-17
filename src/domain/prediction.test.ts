import { describe, it, expect } from 'vitest';
import {
  generatePrediction,
  getCyclePhase,
  predictionConfidence,
} from './prediction';
import { computeCycleStats } from './cycle-stats';
import type { Cycle } from './types';

const cyc = (id: string, startDate: string, endDate?: string): Cycle => ({
  id,
  startDate,
  endDate,
});

const regular = [
  cyc('a', '2026-01-01', '2026-01-05'),
  cyc('b', '2026-01-29', '2026-02-02'),
  cyc('c', '2026-02-26', '2026-03-02'),
  cyc('d', '2026-03-26', '2026-03-30'),
];

describe('predictionConfidence', () => {
  it('is high for 3+ regular cycles', () => {
    expect(predictionConfidence(computeCycleStats(regular))).toBe('high');
  });
  it('is medium for a single cycle', () => {
    expect(
      predictionConfidence(computeCycleStats([cyc('a', '2026-01-01')])),
    ).toBe('medium');
  });
  it('is low for no cycles', () => {
    expect(predictionConfidence(computeCycleStats([]))).toBe('low');
  });
});

describe('generatePrediction', () => {
  it('returns null with no cycles', () => {
    expect(generatePrediction([], '2026-06-17')).toBeNull();
  });

  it('predicts next period one average-cycle after the last start', () => {
    const p = generatePrediction(regular, '2026-04-01');
    expect(p).not.toBeNull();
    // last start 2026-03-26 + 28 days
    expect(p!.nextPeriodStart).toBe('2026-04-23');
    expect(p!.predictedPeriodLength).toBe(5);
    expect(p!.confidence).toBe('high');
  });

  it('places ovulation 14 days before the predicted period', () => {
    const p = generatePrediction(regular, '2026-04-01');
    expect(p!.ovulationDate).toBe('2026-04-09'); // 2026-04-23 - 14
    expect(p!.fertileWindow.start).toBe('2026-04-04'); // ovulation - 5
    expect(p!.fertileWindow.end).toBe('2026-04-10'); // ovulation + 1
  });

  it('widens the range for irregular cycles', () => {
    const irregular = [
      cyc('a', '2026-01-01'),
      cyc('b', '2026-01-22'), // 21
      cyc('c', '2026-03-01'), // 38
    ];
    const p = generatePrediction(irregular, '2026-03-05');
    expect(p!.confidence).toBe('low');
    const { earliest, latest } = p!.nextPeriodStartRange;
    expect(earliest).not.toBe(latest); // non-zero margin
  });

  it('always includes a non-empty explanation', () => {
    const p = generatePrediction(regular, '2026-04-01');
    expect(p!.explanation.length).toBeGreaterThan(0);
  });
});

describe('getCyclePhase', () => {
  const stats = computeCycleStats(regular); // avg 28
  it('reports menstrual during the period', () => {
    expect(getCyclePhase(1, stats)).toBe('menstrual');
  });
  it('reports ovulation around day 14', () => {
    expect(getCyclePhase(14, stats)).toBe('ovulation');
  });
  it('reports luteal after ovulation', () => {
    expect(getCyclePhase(20, stats)).toBe('luteal');
  });
  it('reports follicular between period and ovulation', () => {
    expect(getCyclePhase(8, stats)).toBe('follicular');
  });
});
