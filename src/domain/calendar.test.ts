import { describe, it, expect } from 'vitest';
import { getDayMarker } from './calendar';
import { generatePrediction } from './prediction';
import type { Cycle } from './types';

const cycles: Cycle[] = [
  { id: 'a', startDate: '2026-01-01', endDate: '2026-01-05' },
  { id: 'b', startDate: '2026-01-29', endDate: '2026-02-02' },
  { id: 'c', startDate: '2026-02-26', endDate: '2026-03-02' },
];
const prediction = generatePrediction(cycles)!;

describe('getDayMarker', () => {
  it('marks logged period days', () => {
    expect(getDayMarker('2026-01-03', cycles, prediction)).toBe('period');
  });
  it('marks the predicted ovulation day', () => {
    expect(getDayMarker(prediction.ovulationDate, cycles, prediction)).toBe(
      'ovulation',
    );
  });
  it('marks fertile-window days', () => {
    expect(getDayMarker(prediction.fertileWindow.start, cycles, prediction)).toBe(
      'fertile',
    );
  });
  it('marks predicted period days', () => {
    expect(getDayMarker(prediction.nextPeriodStart, cycles, prediction)).toBe(
      'predicted-period',
    );
  });
  it('returns none for ordinary days', () => {
    expect(getDayMarker('2026-03-15', cycles, prediction)).toBe('none');
  });
});
