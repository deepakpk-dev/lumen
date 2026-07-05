import type {
  Cycle,
  DailyLog,
  PregnancyProfile,
  KickSession,
  ContractionSession,
  PostpartumProfile,
  EpdsEntry,
  ProgramProgress,
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
  programProgress?: ProgramProgress[];
}): { filename: string; json: string } {
  const payload = {
    version: 4 as const,
    exportedAt: new Date().toISOString(),
    cycles: data.cycles,
    dailyLogs: data.dailyLogs,
    pregnancyProfile: data.pregnancyProfile ?? null,
    kickSessions: data.kickSessions ?? [],
    contractionSessions: data.contractionSessions ?? [],
    postpartumProfile: data.postpartumProfile ?? null,
    epdsEntries: data.epdsEntries ?? [],
    programProgress: data.programProgress ?? [],
  };
  return {
    filename: `lumen-export-${todayISO()}.json`,
    json: JSON.stringify(payload, null, 2),
  };
}
