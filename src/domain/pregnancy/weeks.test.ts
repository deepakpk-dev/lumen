import { describe, it, expect } from 'vitest';
import { PREGNANCY_WEEKS, weekContent, WEEK_SOURCES } from './weeks';

describe('PREGNANCY_WEEKS', () => {
  it('covers weeks 4 through 40 contiguously', () => {
    expect(PREGNANCY_WEEKS[0].week).toBe(4);
    expect(PREGNANCY_WEEKS.at(-1)?.week).toBe(40);
    PREGNANCY_WEEKS.forEach((w, i) => expect(w.week).toBe(4 + i));
  });

  it('every entry has non-empty content', () => {
    for (const w of PREGNANCY_WEEKS) {
      expect(w.sizeComparison.length).toBeGreaterThan(0);
      expect(w.fetalDevelopment.length).toBeGreaterThan(0);
      expect(w.maternalChanges.length).toBeGreaterThan(0);
    }
  });
});

describe('weekContent', () => {
  it('returns the matching week', () => {
    expect(weekContent(12).week).toBe(12);
  });

  it('clamps below 4 and above 40', () => {
    expect(weekContent(1).week).toBe(4);
    expect(weekContent(42).week).toBe(40);
  });
});

describe('WEEK_SOURCES', () => {
  it('has attributed sources for each trimester', () => {
    expect(WEEK_SOURCES[1].length).toBeGreaterThan(0);
    expect(WEEK_SOURCES[2].length).toBeGreaterThan(0);
    expect(WEEK_SOURCES[3].length).toBeGreaterThan(0);
  });
});
