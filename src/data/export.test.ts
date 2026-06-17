import { describe, it, expect } from 'vitest';
import { buildExportBlob } from './export';

describe('buildExportBlob', () => {
  it('produces a versioned JSON payload', () => {
    const { filename, json } = buildExportBlob({
      cycles: [{ id: 'a', startDate: '2026-01-01' }],
      dailyLogs: [{ date: '2026-01-01', symptoms: [], moods: [] }],
    });
    expect(filename).toMatch(/lumen-export-.*\.json/);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.cycles).toHaveLength(1);
    expect(parsed.dailyLogs).toHaveLength(1);
  });
});
