import { describe, it, expect } from 'vitest';
import { cToF, fToC } from '@/src/domain/fertility/units';

describe('temperature units', () => {
  it('converts °C to °F', () => {
    expect(cToF(36.5)).toBe(97.7);
    expect(cToF(37)).toBe(98.6);
  });
  it('converts °F to °C', () => {
    expect(fToC(98.6)).toBe(37);
    expect(fToC(97.7)).toBe(36.5);
  });
  it('round-trips within rounding', () => {
    expect(fToC(cToF(36.55))).toBeCloseTo(36.55, 1);
  });
});
