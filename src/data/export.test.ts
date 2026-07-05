import { describe, it, expect } from 'vitest';
import { buildExportBlob, parseImport } from './export';
import type { PostpartumProfile, EpdsEntry } from '@/src/domain/types';

describe('buildExportBlob', () => {
  it('produces a versioned JSON payload', () => {
    const { filename, json } = buildExportBlob({
      cycles: [{ id: 'a', startDate: '2026-01-01' }],
      dailyLogs: [{ date: '2026-01-01', symptoms: [], moods: [] }],
    });
    expect(filename).toMatch(/lumen-export-.*\.json/);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(5);
    expect(parsed.cycles).toHaveLength(1);
    expect(parsed.dailyLogs).toHaveLength(1);
    // Optional tables default to empty arrays so restore is uniform.
    expect(parsed.programProgress).toEqual([]);
  });

  it('includes pregnancy data and bumps the version', () => {
    const { json } = buildExportBlob({
      cycles: [],
      dailyLogs: [],
      pregnancyProfile: {
        id: 'current',
        dueDate: '2026-10-08',
        dueDateSource: 'lmp',
        startedAt: '2026-01-10',
        status: 'active',
      },
      kickSessions: [],
      contractionSessions: [],
    });
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(5);
    expect(parsed.pregnancyProfile.dueDate).toBe('2026-10-08');
    expect(parsed.kickSessions).toEqual([]);
    expect(parsed.contractionSessions).toEqual([]);
  });

  it('includes program progress at version 4', () => {
    const { json } = buildExportBlob({
      cycles: [],
      dailyLogs: [],
      programProgress: [
        {
          programSlug: 'understanding-your-cycle',
          completedSteps: ['how-tracking-works'],
          startedAt: '2026-07-05T10:00:00.000Z',
          updatedAt: '2026-07-05T10:05:00.000Z',
        },
      ],
    });
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(5);
    expect(parsed.programProgress).toHaveLength(1);
    expect(parsed.programProgress[0].completedSteps).toEqual(['how-tracking-works']);
  });
});

describe('parseImport', () => {
  it('round-trips an exported blob', () => {
    const { json } = buildExportBlob({
      cycles: [{ id: 'a', startDate: '2026-01-01' }],
      dailyLogs: [{ date: '2026-01-01', symptoms: [], moods: [] }],
      epdsEntries: [{ id: 'e', date: '2026-01-02', responses: [], total: 0, band: 'low' }],
      preferences: {
        lifeStage: 'pregnancy',
        bbtUnit: 'C',
        ttcStartDate: null,
        reminders: { notifications: false, logReminder: true, periodReminder: true, fertileReminder: true },
      },
    });
    const data = parseImport(json);
    expect(data.cycles).toEqual([{ id: 'a', startDate: '2026-01-01' }]);
    expect(data.dailyLogs).toHaveLength(1);
    expect(data.epdsEntries).toHaveLength(1);
    expect(data.pregnancyProfile).toBeNull();
    expect(data.programProgress).toEqual([]);
    // Preferences (life stage etc.) round-trip so a restore isn't stuck in cycle mode.
    expect(data.preferences?.lifeStage).toBe('pregnancy');
  });

  it('drops records missing their primary key', () => {
    const json = JSON.stringify({
      version: 4,
      cycles: [{ id: 'a', startDate: '2026-01-01' }, { startDate: '2026-02-01' }],
    });
    expect(parseImport(json).cycles).toHaveLength(1);
  });

  it('rejects non-JSON, non-export, and newer-version files', () => {
    expect(() => parseImport('not json')).toThrow(/JSON/);
    expect(() => parseImport('{"foo":1}')).toThrow(/Lumen export/);
    expect(() => parseImport('{"version":99}')).toThrow(/newer version/);
  });
});

it('includes postpartum profile and EPDS entries at version 3', () => {
  const profile: PostpartumProfile = {
    id: 'current', birthDate: '2026-06-01', startedAt: '2026-06-01', status: 'active',
  };
  const epds: EpdsEntry[] = [
    { id: 'a', date: '2026-06-10', responses: Array(10).fill(0), total: 0, band: 'low' },
  ];
  const { json } = buildExportBlob({ cycles: [], dailyLogs: [], postpartumProfile: profile, epdsEntries: epds });
  const parsed = JSON.parse(json);
  expect(parsed.version).toBe(5);
  expect(parsed.postpartumProfile).toMatchObject({ birthDate: '2026-06-01' });
  expect(parsed.epdsEntries).toHaveLength(1);
});
