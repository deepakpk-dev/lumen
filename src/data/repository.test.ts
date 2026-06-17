import { describe, it, expect, beforeEach } from 'vitest';
import {
  addCycle,
  deleteAll,
  exportAll,
  getCycles,
  getDailyLog,
  upsertDailyLog,
} from './repository';

beforeEach(async () => {
  await deleteAll();
});

describe('repository', () => {
  it('stores and returns cycles sorted by start date', async () => {
    await addCycle({ id: 'b', startDate: '2026-02-01' });
    await addCycle({ id: 'a', startDate: '2026-01-01' });
    const cycles = await getCycles();
    expect(cycles.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('upserts a daily log keyed by date', async () => {
    await upsertDailyLog({ date: '2026-01-01', symptoms: ['cramps'], moods: [] });
    await upsertDailyLog({
      date: '2026-01-01',
      symptoms: ['cramps', 'headache'],
      moods: ['tired'],
    });
    const log = await getDailyLog('2026-01-01');
    expect(log?.symptoms).toEqual(['cramps', 'headache']);
    expect(log?.moods).toEqual(['tired']);
  });

  it('exports everything and deletes everything', async () => {
    await addCycle({ id: 'a', startDate: '2026-01-01' });
    await upsertDailyLog({ date: '2026-01-01', symptoms: [], moods: [] });
    const dump = await exportAll();
    expect(dump.cycles).toHaveLength(1);
    expect(dump.dailyLogs).toHaveLength(1);

    await deleteAll();
    const empty = await exportAll();
    expect(empty.cycles).toHaveLength(0);
    expect(empty.dailyLogs).toHaveLength(0);
  });
});
