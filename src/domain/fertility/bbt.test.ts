import { describe, it, expect } from 'vitest';
import { detectThermalShift } from '@/src/domain/fertility/bbt';

function series(temps: number[], start = '2026-06-01') {
  // sequential daily readings from `start`
  const base = new Date(`${start}T00:00:00Z`);
  return temps.map((bbt, i) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), bbt };
  });
}

describe('detectThermalShift', () => {
  it('detects a clear biphasic shift', () => {
    // 6 lows (36.4) then 3 highs (36.7)
    const r = series([36.4, 36.4, 36.4, 36.4, 36.4, 36.4, 36.7, 36.7, 36.7]);
    const out = detectThermalShift(r);
    expect(out.shiftDetected).toBe(true);
    expect(out.coverline).toBe(36.4);
    expect(out.firstHighDate).toBe('2026-06-07'); // 7th reading
    expect(out.ovulationDate).toBe('2026-06-06'); // day before first high
    expect(out.sustainedRise).toBe(true);
  });

  it('returns no shift for a flat series', () => {
    const r = series([36.5, 36.5, 36.5, 36.5, 36.5, 36.5, 36.5, 36.5, 36.5]);
    expect(detectThermalShift(r).shiftDetected).toBe(false);
  });

  it('returns no shift with fewer than 9 readings', () => {
    const r = series([36.4, 36.4, 36.4, 36.4, 36.4, 36.4, 36.7, 36.7]);
    expect(detectThermalShift(r).shiftDetected).toBe(false);
  });

  it('flags a small rise as not sustained', () => {
    const r = series([36.4, 36.4, 36.4, 36.4, 36.4, 36.4, 36.5, 36.5, 36.5]);
    const out = detectThermalShift(r);
    expect(out.shiftDetected).toBe(true);
    expect(out.sustainedRise).toBe(false); // only +0.1
  });
});
