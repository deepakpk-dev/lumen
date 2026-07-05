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
import type { PreferencesSnapshot } from '@/src/settings/preferences';

export function buildExportBlob(data: {
  cycles: Cycle[];
  dailyLogs: DailyLog[];
  pregnancyProfile?: PregnancyProfile | null;
  kickSessions?: KickSession[];
  contractionSessions?: ContractionSession[];
  postpartumProfile?: PostpartumProfile | null;
  epdsEntries?: EpdsEntry[];
  programProgress?: ProgramProgress[];
  preferences?: PreferencesSnapshot | null;
}): { filename: string; json: string } {
  const payload = {
    version: 5 as const,
    exportedAt: new Date().toISOString(),
    cycles: data.cycles,
    dailyLogs: data.dailyLogs,
    pregnancyProfile: data.pregnancyProfile ?? null,
    kickSessions: data.kickSessions ?? [],
    contractionSessions: data.contractionSessions ?? [],
    postpartumProfile: data.postpartumProfile ?? null,
    epdsEntries: data.epdsEntries ?? [],
    programProgress: data.programProgress ?? [],
    // Life stage, units, reminder settings — restored so a backup carries the
    // full app state, not just records.
    preferences: data.preferences ?? null,
  };
  return {
    filename: `lumen-export-${todayISO()}.json`,
    json: JSON.stringify(payload, null, 2),
  };
}

export interface ImportedData {
  cycles: Cycle[];
  dailyLogs: DailyLog[];
  pregnancyProfile: PregnancyProfile | null;
  kickSessions: KickSession[];
  contractionSessions: ContractionSession[];
  postpartumProfile: PostpartumProfile | null;
  epdsEntries: EpdsEntry[];
  programProgress: ProgramProgress[];
  preferences: PreferencesSnapshot | null;
}

const EXPORT_VERSION = 5;

// Trust boundary: this JSON comes from a user-picked file. Validate the shape
// and drop any record missing its primary key (bulkPut throws on inbound-key
// records without one) so a partly-corrupt file restores what it can instead
// of failing whole. Records are otherwise trusted — schema drift is caught by
// the version gate, not per-field checks. ponytail: key filter is the one
// guard that prevents a crash; deeper per-field validation if a bad export
// format ever ships.
export function parseImport(json: string): ImportedData {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("This file isn't valid JSON — pick a Lumen export file.");
  }
  if (!raw || typeof raw !== 'object') {
    throw new Error("This doesn't look like a Lumen export.");
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.version !== 'number') {
    throw new Error("This doesn't look like a Lumen export.");
  }
  if (o.version > EXPORT_VERSION) {
    throw new Error('This export was made by a newer version of Lumen. Update the app, then try again.');
  }
  const rows = (v: unknown, key: string): Record<string, unknown>[] =>
    Array.isArray(v) ? v.filter((r) => r && typeof r === 'object' && key in r) : [];
  const one = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  return {
    cycles: rows(o.cycles, 'id') as unknown as Cycle[],
    dailyLogs: rows(o.dailyLogs, 'date') as unknown as DailyLog[],
    pregnancyProfile: one(o.pregnancyProfile) as unknown as PregnancyProfile | null,
    kickSessions: rows(o.kickSessions, 'id') as unknown as KickSession[],
    contractionSessions: rows(o.contractionSessions, 'id') as unknown as ContractionSession[],
    postpartumProfile: one(o.postpartumProfile) as unknown as PostpartumProfile | null,
    epdsEntries: rows(o.epdsEntries, 'id') as unknown as EpdsEntry[],
    programProgress: rows(o.programProgress, 'programSlug') as unknown as ProgramProgress[],
    // Preferences are a plain object (absent in pre-v5 exports → null, skipped
    // on restore); importPreferences ignores unknown/missing fields.
    preferences: one(o.preferences) as unknown as PreferencesSnapshot | null,
  };
}
