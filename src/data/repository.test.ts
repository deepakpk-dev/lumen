import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  addCycle,
  deleteAll,
  encryptExistingData,
  exportAll,
  importAll,
  getCycles,
  getDailyLog,
  upsertDailyLog,
  getPregnancyProfile,
  savePregnancyProfile,
  deletePregnancyProfile,
  addKickSession,
  getKickSessions,
  addContractionSession,
  getContractionSessions,
} from './repository';
import { setStorageKeys } from './storage';
import { db } from './db';
import { createVault } from '@/src/crypto/vault';
import type { PregnancyProfile } from '@/src/domain/types';

beforeEach(async () => {
  setStorageKeys(null);
  await deleteAll();
});
afterEach(() => setStorageKeys(null));

describe('repository', () => {
  it('restores an export and merges without clobbering newer-only records', async () => {
    await addCycle({ id: 'local', startDate: '2026-03-01' });
    await importAll({
      cycles: [{ id: 'restored', startDate: '2026-01-01' }],
      dailyLogs: [{ date: '2026-01-01', symptoms: [], moods: [] }],
      pregnancyProfile: null,
      kickSessions: [],
      contractionSessions: [],
      postpartumProfile: null,
      epdsEntries: [],
      programProgress: [],
    });
    const cycles = await getCycles();
    // Restored record added; the local-only record survives the merge.
    expect(cycles.map((c) => c.id)).toEqual(['restored', 'local']);
    expect(await getDailyLog('2026-01-01')).toBeDefined();
  });

  it('encrypts existing plaintext data and drops the plaintext copy', async () => {
    await addCycle({ id: 'c1', startDate: '2026-01-01' });
    await upsertDailyLog({ date: '2026-01-01', symptoms: ['cramps'], moods: [] });
    expect(await db.cycles.count()).toBe(1);

    const keys = (await createVault('1234')).unlocked.keys;
    await encryptExistingData(keys); // installs the session key on success

    // Plaintext tables emptied; data now lives (and reads back) encrypted.
    expect(await db.cycles.count()).toBe(0);
    expect(await db.records.count()).toBeGreaterThan(0);
    expect((await getCycles()).map((c) => c.id)).toEqual(['c1']);
    expect(await getDailyLog('2026-01-01')).toMatchObject({ symptoms: ['cramps'] });

    // The date and content are not readable in the raw encrypted rows.
    const raw = JSON.stringify(await db.records.toArray());
    expect(raw).not.toContain('cramps');
  });

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

const profile: PregnancyProfile = {
  id: 'current',
  dueDate: '2026-10-08',
  lmp: '2026-01-01',
  dueDateSource: 'lmp',
  startedAt: '2026-01-10',
  status: 'active',
};

describe('pregnancy repository', () => {
  it('stores and reads the singleton pregnancy profile', async () => {
    await savePregnancyProfile(profile);
    expect((await getPregnancyProfile())?.dueDate).toBe('2026-10-08');
    await deletePregnancyProfile();
    expect(await getPregnancyProfile()).toBeUndefined();
  });

  it('stores kick and contraction sessions', async () => {
    await addKickSession({ id: 'k1', date: '2026-06-21', startedAt: '2026-06-21T10:00:00.000Z', kickTimestamps: [] });
    await addContractionSession({ id: 'c1', date: '2026-06-21', contractions: [] });
    expect(await getKickSessions()).toHaveLength(1);
    expect(await getContractionSessions()).toHaveLength(1);
  });

  it('export includes pregnancy data and delete clears it', async () => {
    await savePregnancyProfile(profile);
    await addKickSession({ id: 'k2', date: '2026-06-21', startedAt: '2026-06-21T10:00:00.000Z', kickTimestamps: [] });
    await addContractionSession({ id: 'c2', date: '2026-06-21', contractions: [] });

    const dump = await exportAll();
    expect(dump.pregnancyProfile?.dueDate).toBe('2026-10-08');
    expect(dump.kickSessions).toHaveLength(1);
    expect(dump.contractionSessions).toHaveLength(1);

    await deleteAll();
    const empty = await exportAll();
    expect(empty.pregnancyProfile).toBeNull();
    expect(empty.kickSessions).toHaveLength(0);
    expect(empty.contractionSessions).toHaveLength(0);
  });
});
