import { describe, it, expect } from 'vitest';
import { phaseForDate } from './phase-assignment';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import type { Cycle } from '@/src/domain/types';

const cycles: Cycle[] = [
  { id: 'a', startDate: '2026-01-01' },
  { id: 'b', startDate: '2026-01-29' },
];
const stats = computeCycleStats(cycles); // avg 28, period 5

describe('phaseForDate', () => {
  it('maps day 1 to menstrual', () => {
    expect(phaseForDate('2026-01-01', cycles, stats)).toBe('menstrual');
  });
  it('maps day 14 to ovulation', () => {
    expect(phaseForDate('2026-01-14', cycles, stats)).toBe('ovulation');
  });
  it('maps a late day to luteal', () => {
    expect(phaseForDate('2026-01-20', cycles, stats)).toBe('luteal');
  });
  it('uses the most recent prior cycle start', () => {
    // 2026-01-29 is day 1 of cycle b
    expect(phaseForDate('2026-01-29', cycles, stats)).toBe('menstrual');
  });
  it('returns null for a date before all cycles', () => {
    expect(phaseForDate('2025-12-31', cycles, stats)).toBeNull();
  });
});
