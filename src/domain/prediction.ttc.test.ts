import { describe, it, expect } from 'vitest';
import { generatePrediction } from '@/src/domain/prediction';
import type { Cycle } from '@/src/domain/types';
import type { OvulationConfirmation } from '@/src/domain/fertility/types';

const cycles: Cycle[] = [
  { id: 'c1', startDate: '2026-05-01' },
  { id: 'c2', startDate: '2026-05-29' }, // 28-day cycle
];

describe('generatePrediction with observed fertility', () => {
  it('is unchanged when no observed input is passed', () => {
    const base = generatePrediction(cycles, '2026-06-01');
    // nextPeriodStart = last start + 28 = 2026-06-26; ovulation = -14 = 2026-06-12
    expect(base?.ovulationDate).toBe('2026-06-12');
  });

  it('uses an observed luteal length instead of 14', () => {
    const out = generatePrediction(cycles, '2026-06-01', { lutealLength: 12 });
    expect(out?.ovulationDate).toBe('2026-06-14'); // nextPeriod - 12
  });

  it('overrides ovulation + fertile window with a confirmed ovulation', () => {
    const conf: OvulationConfirmation = {
      cycleId: 'c2',
      ovulationDate: '2026-06-10',
      status: 'confirmed',
      methods: ['bbt'],
      confidence: 'high',
      explanation: '',
    };
    const out = generatePrediction(cycles, '2026-06-01', { currentCycleOvulation: conf });
    expect(out?.ovulationDate).toBe('2026-06-10');
    expect(out?.fertileWindow).toEqual({ start: '2026-06-05', end: '2026-06-11' });
    expect(out?.explanation).toMatch(/logged signals|confirmed/i);
  });
});
