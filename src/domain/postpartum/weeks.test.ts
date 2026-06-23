import { describe, it, expect } from 'vitest';
import { POSTPARTUM_WEEKS, postpartumWeekContent } from './weeks';

describe('POSTPARTUM_WEEKS', () => {
  it('covers weeks 1..12 contiguously', () => {
    expect(POSTPARTUM_WEEKS.map((w) => w.week)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const w of POSTPARTUM_WEEKS) expect(w.notes.length).toBeGreaterThan(0);
  });
});

describe('postpartumWeekContent', () => {
  it('returns the matching week', () => {
    expect(postpartumWeekContent(1).week).toBe(1);
    expect(postpartumWeekContent(6).week).toBe(6);
  });
  it('clamps below 1 and above 12', () => {
    expect(postpartumWeekContent(0).week).toBe(1);
    expect(postpartumWeekContent(40).week).toBe(12);
  });
});
