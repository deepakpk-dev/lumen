import { describe, it, expect } from 'vitest';
import { buildExportBlob } from './export';
import type { PostpartumProfile, EpdsEntry } from '@/src/domain/types';

describe('buildExportBlob', () => {
  it('produces a versioned JSON payload', () => {
    const { filename, json } = buildExportBlob({
      cycles: [{ id: 'a', startDate: '2026-01-01' }],
      dailyLogs: [{ date: '2026-01-01', symptoms: [], moods: [] }],
    });
    expect(filename).toMatch(/lumen-export-.*\.json/);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(3);
    expect(parsed.cycles).toHaveLength(1);
    expect(parsed.dailyLogs).toHaveLength(1);
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
    expect(parsed.version).toBe(3);
    expect(parsed.pregnancyProfile.dueDate).toBe('2026-10-08');
    expect(parsed.kickSessions).toEqual([]);
    expect(parsed.contractionSessions).toEqual([]);
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
  expect(parsed.version).toBe(3);
  expect(parsed.postpartumProfile).toMatchObject({ birthDate: '2026-06-01' });
  expect(parsed.epdsEntries).toHaveLength(1);
});
