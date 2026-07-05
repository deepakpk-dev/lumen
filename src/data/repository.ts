import type {
  Cycle,
  DailyLog,
  ISODate,
  PregnancyProfile,
  KickSession,
  ContractionSession,
  PostpartumProfile,
  EpdsEntry,
  ProgramProgress,
} from '@/src/domain/types';
import { db } from './db';
import type { ImportedData } from './export';

export async function addCycle(cycle: Cycle): Promise<void> {
  await db.cycles.put(cycle);
}

export async function updateCycle(cycle: Cycle): Promise<void> {
  await db.cycles.put(cycle);
}

export async function getCycles(): Promise<Cycle[]> {
  const all = await db.cycles.toArray();
  return all.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function upsertDailyLog(log: DailyLog): Promise<void> {
  await db.dailyLogs.put(log);
}

export async function getDailyLog(date: ISODate): Promise<DailyLog | undefined> {
  return db.dailyLogs.get(date);
}

export async function getAllDailyLogs(): Promise<DailyLog[]> {
  return db.dailyLogs.toArray();
}

export async function getPregnancyProfile(): Promise<PregnancyProfile | undefined> {
  return db.pregnancyProfile.get('current');
}

export async function savePregnancyProfile(p: PregnancyProfile): Promise<void> {
  await db.pregnancyProfile.put(p);
}

// Drop the pregnancy journey (profile + its kick/contraction logs) so a fresh
// onboarding start can't inherit a stale pregnancy stage.
export async function clearPregnancyProfile(): Promise<void> {
  await db.pregnancyProfile.clear();
  await db.kickSessions.clear();
  await db.contractionSessions.clear();
}

export async function deletePregnancyProfile(): Promise<void> {
  await db.pregnancyProfile.delete('current');
}

export async function addKickSession(s: KickSession): Promise<void> {
  await db.kickSessions.put(s);
}

export async function getKickSessions(): Promise<KickSession[]> {
  const all = await db.kickSessions.toArray();
  return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function addContractionSession(s: ContractionSession): Promise<void> {
  await db.contractionSessions.put(s);
}

export async function getContractionSessions(): Promise<ContractionSession[]> {
  const all = await db.contractionSessions.toArray();
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getProgramProgress(): Promise<ProgramProgress[]> {
  return db.programProgress.toArray();
}

export async function saveProgramProgress(p: ProgramProgress): Promise<void> {
  await db.programProgress.put(p);
}

export async function exportAll(): Promise<{
  cycles: Cycle[];
  dailyLogs: DailyLog[];
  pregnancyProfile: PregnancyProfile | null;
  kickSessions: KickSession[];
  contractionSessions: ContractionSession[];
  postpartumProfile: PostpartumProfile | null;
  epdsEntries: EpdsEntry[];
  programProgress: ProgramProgress[];
}> {
  return {
    cycles: await getCycles(),
    dailyLogs: await getAllDailyLogs(),
    pregnancyProfile: (await getPregnancyProfile()) ?? null,
    kickSessions: await getKickSessions(),
    contractionSessions: await getContractionSessions(),
    postpartumProfile: (await getPostpartumProfile()) ?? null,
    epdsEntries: await getEpdsEntries(),
    programProgress: await getProgramProgress(),
  };
}

// Restore from a parsed export. Upsert by primary key (never clears first) so
// restoring an older backup onto a device with newer records merges rather
// than destroys — matching keys are overwritten, records only present locally
// survive. One transaction so a mid-restore failure rolls back cleanly.
export async function importAll(data: ImportedData): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.cycles, db.dailyLogs, db.pregnancyProfile, db.kickSessions,
      db.contractionSessions, db.postpartumProfile, db.epdsEntries, db.programProgress,
    ],
    async () => {
      if (data.cycles.length) await db.cycles.bulkPut(data.cycles);
      if (data.dailyLogs.length) await db.dailyLogs.bulkPut(data.dailyLogs);
      if (data.pregnancyProfile) await db.pregnancyProfile.put(data.pregnancyProfile);
      if (data.kickSessions.length) await db.kickSessions.bulkPut(data.kickSessions);
      if (data.contractionSessions.length) await db.contractionSessions.bulkPut(data.contractionSessions);
      if (data.postpartumProfile) await db.postpartumProfile.put(data.postpartumProfile);
      if (data.epdsEntries.length) await db.epdsEntries.bulkPut(data.epdsEntries);
      if (data.programProgress.length) await db.programProgress.bulkPut(data.programProgress);
    },
  );
}

export async function deleteAll(): Promise<void> {
  await db.cycles.clear();
  await db.dailyLogs.clear();
  await db.pregnancyProfile.clear();
  await db.kickSessions.clear();
  await db.contractionSessions.clear();
  await db.postpartumProfile.clear();
  await db.epdsEntries.clear();
  await db.programProgress.clear();
}

export async function getPostpartumProfile(): Promise<PostpartumProfile | undefined> {
  return db.postpartumProfile.get('current');
}

export async function savePostpartumProfile(p: PostpartumProfile): Promise<void> {
  await db.postpartumProfile.put(p);
}

// Drop the postpartum journey (profile + its mood check-ins) so a fresh
// onboarding start can't inherit a stale postpartum stage.
export async function clearPostpartumProfile(): Promise<void> {
  await db.postpartumProfile.clear();
  await db.epdsEntries.clear();
}

export async function deletePostpartumProfile(): Promise<void> {
  await db.postpartumProfile.delete('current');
}

export async function addEpdsEntry(e: EpdsEntry): Promise<void> {
  await db.epdsEntries.put(e);
}

export async function getEpdsEntries(): Promise<EpdsEntry[]> {
  const all = await db.epdsEntries.toArray();
  return all.sort((a, b) => b.date.localeCompare(a.date));
}
