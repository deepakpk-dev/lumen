import { describe, it, expect } from 'vitest';
import { conceptionGuidance } from '@/src/domain/fertility/guidance';
import type { Prediction, DailyLog } from '@/src/domain/types';
import type { OvulationConfirmation } from '@/src/domain/fertility/types';

const prediction: Prediction = {
  nextPeriodStart: '2026-06-26',
  nextPeriodStartRange: { earliest: '2026-06-25', latest: '2026-06-27' },
  predictedPeriodLength: 5,
  fertileWindow: { start: '2026-06-07', end: '2026-06-13' },
  ovulationDate: '2026-06-12',
  confidence: 'high',
  explanation: '',
};
const log = (extra: Partial<DailyLog>): DailyLog => ({ date: '2026-06-12', symptoms: [], moods: [], ...extra });

describe('conceptionGuidance', () => {
  it('high on ovulation day', () => {
    expect(conceptionGuidance('2026-06-12', prediction, null, undefined).level).toBe('high');
  });
  it('high two days before ovulation', () => {
    expect(conceptionGuidance('2026-06-10', prediction, null, undefined).level).toBe('high');
  });
  it('medium at the window edge', () => {
    expect(conceptionGuidance('2026-06-08', prediction, null, undefined).level).toBe('medium');
  });
  it('low well outside the window', () => {
    expect(conceptionGuidance('2026-06-20', prediction, null, undefined).level).toBe('low');
  });
  it('LH+ today overrides to high', () => {
    expect(conceptionGuidance('2026-06-20', prediction, null, log({ lh: 'positive', date: '2026-06-20' })).level).toBe('high');
  });
  it('confirmed past ovulation closes the window', () => {
    const conf: OvulationConfirmation = { cycleId: 'c1', ovulationDate: '2026-06-12', status: 'confirmed', methods: ['bbt'], confidence: 'high', explanation: '' };
    const g = conceptionGuidance('2026-06-15', prediction, conf, undefined);
    expect(g.level).toBe('low');
    expect(g.reason).toMatch(/passed/i);
  });
  it('low with no ovulation estimate', () => {
    expect(conceptionGuidance('2026-06-12', null, null, undefined).level).toBe('low');
  });
});
