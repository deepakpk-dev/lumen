import { describe, it, expect } from 'vitest';
import { estimateLutealLength } from '@/src/domain/fertility/luteal';
import type { Cycle } from '@/src/domain/types';
import type { OvulationConfirmation } from '@/src/domain/fertility/types';

const cycles: Cycle[] = [
  { id: 'c1', startDate: '2026-01-01' },
  { id: 'c2', startDate: '2026-01-29' }, // c1 luteal: ov 2026-01-15 → 14
  { id: 'c3', startDate: '2026-02-26' }, // c2 luteal: ov 2026-02-13 → 13
];

function conf(cycleId: string, ovulationDate: string): OvulationConfirmation {
  return { cycleId, ovulationDate, status: 'confirmed', methods: ['bbt'], confidence: 'medium', explanation: '' };
}

describe('estimateLutealLength', () => {
  it('returns the median interval (rounded)', () => {
    const out = estimateLutealLength(
      [conf('c1', '2026-01-15'), conf('c2', '2026-02-13')],
      cycles,
    );
    expect(out).toBe(14); // median(14, 13) = 13.5 → 14
  });

  it('returns null with fewer than 2 confirmed intervals', () => {
    expect(estimateLutealLength([conf('c1', '2026-01-15')], cycles)).toBeNull();
  });

  it('ignores likely (non-confirmed) and last-cycle confirmations', () => {
    const likely: OvulationConfirmation = { ...conf('c1', '2026-01-15'), status: 'likely' };
    expect(estimateLutealLength([likely, conf('c3', '2026-03-12')], cycles)).toBeNull();
  });

  it('excludes out-of-range luteal intervals', () => {
    // c1 luteal: ov 2026-01-15 → 2026-01-29 = 14 days (in range)
    // c2 luteal: ov 2026-02-13 → 2026-02-26 = 13 days (in range)
    // out-of-range: ov on 2026-01-01 (before c1 start) → c2 start = ~28 days (out of range, > 17)
    const outOfRange = [...cycles, { id: 'c0', startDate: '2025-12-15' }];
    const confusions = [
      conf('c0', '2026-01-01'), // c0→c1: ~28 days, out of range (> 17)
      conf('c1', '2026-01-15'), // c1→c2: 14 days, in range
      conf('c2', '2026-02-13'), // c2→c3: 13 days, in range
    ];
    const out = estimateLutealLength(confusions, outOfRange);
    // Should ignore the 28-day interval and return median(14, 13) = 13.5 → 14
    expect(out).toBe(14);
  });
});
