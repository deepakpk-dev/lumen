import { describe, it, expect } from 'vitest';
import { confirmOvulation } from '@/src/domain/fertility/confirmation';
import type { Cycle, DailyLog } from '@/src/domain/types';

const cycle: Cycle = { id: 'c1', startDate: '2026-06-01' };

function log(date: string, extra: Partial<DailyLog>): DailyLog {
  return { date, symptoms: [], moods: [], ...extra };
}

// 6 lows from 06-01..06-06, 3 highs 06-07..06-09 → BBT ovulation 06-06
const bbtLogs: DailyLog[] = [
  ...[36.4, 36.4, 36.4, 36.4, 36.4, 36.4].map((t, i) =>
    log(`2026-06-0${i + 1}`, { bbt: t }),
  ),
  log('2026-06-07', { bbt: 36.7 }),
  log('2026-06-08', { bbt: 36.7 }),
  log('2026-06-09', { bbt: 36.7 }),
];

describe('confirmOvulation', () => {
  it('confirms from BBT alone at medium confidence', () => {
    const out = confirmOvulation(bbtLogs, cycle);
    expect(out?.status).toBe('confirmed');
    expect(out?.ovulationDate).toBe('2026-06-06');
    expect(out?.confidence).toBe('medium');
    expect(out?.methods).toEqual(['bbt']);
  });

  it('upgrades to high when LH+ corroborates within 2 days', () => {
    const logs = bbtLogs.map((l) =>
      l.date === '2026-06-05' ? { ...l, lh: 'positive' as const } : l,
    );
    const out = confirmOvulation(logs, cycle);
    expect(out?.confidence).toBe('high');
    expect(out?.methods).toContain('lh');
  });

  it('marks likely (medium) from LH+ and mucus peak with no BBT', () => {
    const logs = [
      log('2026-06-05', { lh: 'positive' }),
      log('2026-06-06', { mucus: 'egg-white' }),
    ];
    const out = confirmOvulation(logs, cycle);
    expect(out?.status).toBe('likely');
    expect(out?.confidence).toBe('medium');
    expect(out?.ovulationDate).toBe('2026-06-06'); // day after LH+
  });

  it('marks likely (low) from LH+ only', () => {
    const out = confirmOvulation([log('2026-06-05', { lh: 'positive' })], cycle);
    expect(out?.status).toBe('likely');
    expect(out?.confidence).toBe('low');
    expect(out?.methods).toEqual(['lh']);
  });

  it('returns null with no usable signals', () => {
    expect(confirmOvulation([log('2026-06-05', { flow: 'light' })], cycle)).toBeNull();
  });

  it('excludes logs at/after nextStart', () => {
    const logs = [...bbtLogs, log('2026-07-02', { lh: 'positive' })];
    const out = confirmOvulation(logs, cycle, '2026-07-01');
    expect(out?.methods).toEqual(['bbt']); // the July LH+ is in the next cycle
  });
});
