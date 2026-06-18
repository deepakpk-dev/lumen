import { describe, it, expect } from 'vitest';
import type { DailyLog } from '@/src/domain/types';
import type {
  OvulationConfirmation,
  ConceptionGuidance,
} from '@/src/domain/fertility/types';

describe('fertility types', () => {
  it('DailyLog accepts optional TTC signal fields', () => {
    const log: DailyLog = {
      date: '2026-06-10',
      symptoms: [],
      moods: [],
      bbt: 36.55,
      lh: 'positive',
      mucus: 'egg-white',
      intercourse: true,
      intercourseProtected: false,
    };
    expect(log.bbt).toBe(36.55);
    expect(log.lh).toBe('positive');
  });

  it('OvulationConfirmation and ConceptionGuidance shapes compile', () => {
    const conf: OvulationConfirmation = {
      cycleId: 'c1',
      ovulationDate: '2026-06-12',
      status: 'confirmed',
      methods: ['bbt', 'lh'],
      confidence: 'high',
      explanation: 'x',
    };
    const g: ConceptionGuidance = {
      date: '2026-06-12',
      level: 'high',
      label: 'High chance to conceive',
      reason: 'x',
    };
    expect(conf.methods).toContain('bbt');
    expect(g.level).toBe('high');
  });
});
