import { describe, it, expect } from 'vitest';
import {
  countTtcCycles,
  shouldShowResourceNote,
  TTC_RESOURCE_THRESHOLD,
} from '@/src/domain/fertility/journey';
import type { Cycle } from '@/src/domain/types';

const cycles: Cycle[] = Array.from({ length: 8 }, (_, i) => ({
  id: `c${i}`,
  startDate: `2026-${String(i + 1).padStart(2, '0')}-01`,
})) as Cycle[];

describe('TTC journey', () => {
  it('counts only cycles on/after the TTC start date', () => {
    expect(countTtcCycles(cycles, '2026-03-01')).toBe(6); // months 3..8
  });
  it('returns 0 when TTC start is unset', () => {
    expect(countTtcCycles(cycles, null)).toBe(0);
  });
  it('shows the resource note at the threshold', () => {
    expect(TTC_RESOURCE_THRESHOLD).toBe(6);
    expect(shouldShowResourceNote(cycles, '2026-03-01')).toBe(true);
    expect(shouldShowResourceNote(cycles, '2026-04-01')).toBe(false); // only 5
  });
});
