import { describe, it, expect } from 'vitest';
import { postpartumDay, postpartumWeek, recoveryStage } from './recovery';

describe('postpartumDay', () => {
  it('counts days since birth (0-based)', () => {
    expect(postpartumDay('2026-06-01', '2026-06-01')).toBe(0);
    expect(postpartumDay('2026-06-01', '2026-06-08')).toBe(7);
  });
  it('clamps dates before birth to 0', () => {
    expect(postpartumDay('2026-06-01', '2026-05-20')).toBe(0);
  });
});

describe('postpartumWeek', () => {
  it('is 1-based', () => {
    expect(postpartumWeek('2026-06-01', '2026-06-01')).toBe(1); // day 0 → week 1
    expect(postpartumWeek('2026-06-01', '2026-06-07')).toBe(1); // day 6 → week 1
    expect(postpartumWeek('2026-06-01', '2026-06-08')).toBe(2); // day 7 → week 2
  });
});

describe('recoveryStage', () => {
  it('bands weeks into acute / extended / ongoing', () => {
    expect(recoveryStage('2026-06-01', '2026-06-01')).toBe('acute'); // wk 1
    expect(recoveryStage('2026-06-01', '2026-07-12')).toBe('acute'); // wk 6 (day 41)
    expect(recoveryStage('2026-06-01', '2026-07-13')).toBe('extended'); // wk 7 (day 42)
    expect(recoveryStage('2026-06-01', '2026-08-23')).toBe('extended'); // wk 12 (day 83)
    expect(recoveryStage('2026-06-01', '2026-08-24')).toBe('ongoing'); // wk 13 (day 84)
  });
});
