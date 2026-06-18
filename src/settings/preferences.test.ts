import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLifeStage,
  setLifeStage,
  getBbtUnit,
  setBbtUnit,
  getTtcStartDate,
} from '@/src/settings/preferences';

describe('preferences', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to cycle mode and °C', () => {
    expect(getLifeStage()).toBe('cycle');
    expect(getBbtUnit()).toBe('C');
    expect(getTtcStartDate()).toBeNull();
  });

  it('stamps the TTC start date when entering TTC mode', () => {
    setLifeStage('ttc', '2026-06-17');
    expect(getLifeStage()).toBe('ttc');
    expect(getTtcStartDate()).toBe('2026-06-17');
  });

  it('does not overwrite an existing TTC start date', () => {
    setLifeStage('ttc', '2026-06-17');
    setLifeStage('ttc', '2026-07-01');
    expect(getTtcStartDate()).toBe('2026-06-17');
  });

  it('clears the TTC start date when leaving TTC mode', () => {
    setLifeStage('ttc', '2026-06-17');
    setLifeStage('cycle', '2026-08-01');
    expect(getTtcStartDate()).toBeNull();
  });

  it('persists the BBT unit', () => {
    setBbtUnit('F');
    expect(getBbtUnit()).toBe('F');
  });
});
