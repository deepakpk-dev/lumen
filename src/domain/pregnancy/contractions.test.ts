import { describe, it, expect } from 'vitest';
import {
  contractionDurationSeconds,
  contractionFrequencyMinutes,
  fiveOneOneStatus,
} from './contractions';
import type { Contraction } from '@/src/domain/types';

function at(min: number, sec = 0): string {
  return new Date(Date.UTC(2026, 5, 21, 9, min, sec)).toISOString();
}

describe('contractionDurationSeconds', () => {
  it('returns seconds between start and end', () => {
    expect(contractionDurationSeconds({ start: at(0, 0), end: at(1, 0) })).toBe(60);
  });
  it('returns null without an end', () => {
    expect(contractionDurationSeconds({ start: at(0, 0) })).toBeNull();
  });
});

describe('contractionFrequencyMinutes', () => {
  it('returns start-to-start intervals in minutes', () => {
    const cs: Contraction[] = [{ start: at(0) }, { start: at(5) }, { start: at(10) }];
    expect(contractionFrequencyMinutes(cs)).toEqual([5, 5]);
  });
  it('returns empty for fewer than two', () => {
    expect(contractionFrequencyMinutes([{ start: at(0) }])).toEqual([]);
  });
});

describe('fiveOneOneStatus', () => {
  it('meets 5-1-1 when ~5 min apart, ~1 min long, for ~1 hour', () => {
    const cs: Contraction[] = [];
    for (let m = 0; m <= 60; m += 5) cs.push({ start: at(m, 0), end: at(m, 60) });
    const out = fiveOneOneStatus(cs, at(61));
    expect(out.meetsCriteria).toBe(true);
    expect(out.message).toMatch(/provider/i);
  });

  it('does not meet criteria when contractions are far apart', () => {
    const cs: Contraction[] = [
      { start: at(0, 0), end: at(1, 0) },
      { start: at(15, 0), end: at(16, 0) },
    ];
    const out = fiveOneOneStatus(cs, at(20));
    expect(out.meetsCriteria).toBe(false);
  });
});
