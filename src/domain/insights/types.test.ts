import { describe, it, expect } from 'vitest';
import {
  MIN_SYMPTOM_OCCURRENCES,
  PATTERN_CONCENTRATION,
  MIN_CYCLES_FOR_TRENDS,
  RECENT_CYCLE_WINDOW,
  OVERDUE_DAYS,
  SYMPTOM_CLUSTER_COUNT,
  SYMPTOM_CLUSTER_WINDOW,
  PRIORITY_ANOMALY,
  PRIORITY_PATTERN,
  PRIORITY_TREND,
  PRIORITY_GUIDANCE,
} from './types';

describe('insight constants', () => {
  it('exposes thresholds', () => {
    expect(MIN_SYMPTOM_OCCURRENCES).toBe(3);
    expect(PATTERN_CONCENTRATION).toBe(0.6);
    expect(MIN_CYCLES_FOR_TRENDS).toBe(2);
    expect(RECENT_CYCLE_WINDOW).toBe(3);
    expect(OVERDUE_DAYS).toBe(2);
    expect(SYMPTOM_CLUSTER_COUNT).toBe(4);
    expect(SYMPTOM_CLUSTER_WINDOW).toBe(3);
  });

  it('orders priority bands anomaly > pattern > trend > guidance', () => {
    expect(PRIORITY_ANOMALY).toBeGreaterThan(PRIORITY_PATTERN);
    expect(PRIORITY_PATTERN).toBeGreaterThan(PRIORITY_TREND);
    expect(PRIORITY_TREND).toBeGreaterThan(PRIORITY_GUIDANCE);
  });
});
