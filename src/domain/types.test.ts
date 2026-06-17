import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
  LUTEAL_PHASE_LENGTH,
  REGULARITY_STDDEV_THRESHOLD,
} from './types';

describe('domain constants', () => {
  it('exposes cycle defaults', () => {
    expect(DEFAULT_CYCLE_LENGTH).toBe(28);
    expect(DEFAULT_PERIOD_LENGTH).toBe(5);
    expect(LUTEAL_PHASE_LENGTH).toBe(14);
    expect(REGULARITY_STDDEV_THRESHOLD).toBe(3);
  });
});
