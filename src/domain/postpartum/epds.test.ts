import { describe, it, expect } from 'vitest';
import { EPDS_QUESTIONS, scoreEpds } from './epds';

describe('EPDS_QUESTIONS', () => {
  it('has 10 questions each with 4 options valued 0..3', () => {
    expect(EPDS_QUESTIONS).toHaveLength(10);
    for (const q of EPDS_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(q.options.map((o) => o.value).sort()).toEqual([0, 1, 2, 3]);
    }
  });
  it('self-harm item (10) is reverse-scored: "Never" is 0', () => {
    const last = EPDS_QUESTIONS[9];
    expect(last.options.at(-1)).toMatchObject({ value: 0 });
  });
});

describe('scoreEpds', () => {
  it('sums to a low band below 10', () => {
    const r = scoreEpds([0, 0, 0, 1, 0, 1, 0, 1, 0, 0]); // total 3
    expect(r.total).toBe(3);
    expect(r.band).toBe('low');
    expect(r.riskFlag).toBe(false);
  });
  it('bands 10-12 as possible', () => {
    expect(scoreEpds([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]).band).toBe('possible'); // 10
    expect(scoreEpds([2, 1, 1, 1, 1, 1, 1, 2, 1, 1]).band).toBe('possible'); // 12
  });
  it('bands >=13 as probable and flags risk', () => {
    const r = scoreEpds([2, 2, 1, 1, 1, 2, 1, 2, 1, 0]); // 13
    expect(r.band).toBe('probable');
    expect(r.riskFlag).toBe(true);
  });
  it('flags risk on any self-harm response even at a low total', () => {
    const r = scoreEpds([0, 0, 0, 0, 0, 0, 0, 0, 0, 1]); // total 1
    expect(r.band).toBe('low');
    expect(r.riskFlag).toBe(true);
  });
  it('throws on malformed input', () => {
    expect(() => scoreEpds([0, 0, 0])).toThrow();
    expect(() => scoreEpds([0, 0, 0, 0, 0, 0, 0, 0, 0, 4])).toThrow();
  });
});
