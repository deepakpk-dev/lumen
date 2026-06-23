import type {
  Cycle,
  DailyLog,
  PregnancyProfile,
  KickSession,
  ContractionSession,
  PostpartumProfile,
  EpdsEntry,
} from '@/src/domain/types';
import { todayISO } from '@/src/domain/dates';

export function buildExportBlob(data: {
  cycles: Cycle[];
  dailyLogs: DailyLog[];
  pregnancyProfile?: PregnancyProfile | null;
  kickSessions?: KickSession[];
  contractionSessions?: ContractionSession[];
  postpartumProfile?: PostpartumProfile | null;
  epdsEntries?: EpdsEntry[];
}): { filename: string; json: string } {
  const payload = {
    version: 3 as const,
    exportedAt: new Date().toISOString(),
    cycles: data.cycles,
    dailyLogs: data.dailyLogs,
    pregnancyProfile: data.pregnancyProfile ?? null,
    kickSessions: data.kickSessions ?? [],
    contractionSessions: data.contractionSessions ?? [],
    postpartumProfile: data.postpartumProfile ?? null,
    epdsEntries: data.epdsEntries ?? [],
  };
  return {
    filename: `lumen-export-${todayISO()}.json`,
    json: JSON.stringify(payload, null, 2),
  };
}
