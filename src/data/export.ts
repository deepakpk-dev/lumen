import type { Cycle, DailyLog } from '@/src/domain/types';
import { todayISO } from '@/src/domain/dates';

export function buildExportBlob(data: {
  cycles: Cycle[];
  dailyLogs: DailyLog[];
}): { filename: string; json: string } {
  const payload = {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    cycles: data.cycles,
    dailyLogs: data.dailyLogs,
  };
  return {
    filename: `lumen-export-${todayISO()}.json`,
    json: JSON.stringify(payload, null, 2),
  };
}
