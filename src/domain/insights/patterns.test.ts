import { describe, it, expect } from 'vitest';
import { generatePatternInsights } from './patterns';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import type { Cycle, DailyLog, Prediction } from '@/src/domain/types';

const cycles: Cycle[] = [
  { id: 'a', startDate: '2026-01-01' },
  { id: 'b', startDate: '2026-01-29' },
  { id: 'c', startDate: '2026-02-26' },
];
const stats = computeCycleStats(cycles); // avg 28

function input(dailyLogs: DailyLog[]) {
  return {
    cycles,
    dailyLogs,
    stats,
    prediction: null as Prediction | null,
    today: '2026-02-20',
  };
}

const log = (date: string, symptoms: string[], moods: string[] = []): DailyLog => ({
  date,
  symptoms,
  moods,
});

describe('generatePatternInsights', () => {
  it('emits a pattern when a symptom concentrates in one phase', () => {
    // 2026-01-18/20/22 are luteal days of cycle a
    const out = generatePatternInsights(
      input([
        log('2026-01-18', ['Headache']),
        log('2026-01-20', ['Headache']),
        log('2026-01-22', ['Headache']),
      ]),
    );
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('pattern:Headache:luteal');
    expect(out[0].category).toBe('pattern');
    expect(out[0].severity).toBe('info');
    expect(out[0].body).toContain('3');
    expect(out[0].body.toLowerCase()).toContain('luteal');
  });

  it('ignores symptoms below the minimum occurrences', () => {
    const out = generatePatternInsights(
      input([log('2026-01-18', ['Cramps']), log('2026-01-20', ['Cramps'])]),
    );
    expect(out).toHaveLength(0);
  });

  it('ignores symptoms spread evenly across phases', () => {
    // menstrual (day 2), follicular (day 8), luteal (day 20) — 1 each
    const out = generatePatternInsights(
      input([
        log('2026-01-02', ['Acne']),
        log('2026-01-08', ['Acne']),
        log('2026-01-20', ['Acne']),
      ]),
    );
    expect(out).toHaveLength(0);
  });

  it('also considers moods', () => {
    const out = generatePatternInsights(
      input([
        log('2026-01-18', [], ['Irritable']),
        log('2026-01-20', [], ['Irritable']),
        log('2026-01-22', [], ['Irritable']),
      ]),
    );
    expect(out.map((i) => i.id)).toContain('pattern:Irritable:luteal');
  });
});
