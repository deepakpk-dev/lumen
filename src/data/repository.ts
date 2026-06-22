import type {
  Cycle,
  DailyLog,
  ISODate,
  PregnancyProfile,
  KickSession,
  ContractionSession,
} from '@/src/domain/types';
import { db } from './db';

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

export async function updateContractionSession(s: ContractionSession): Promise<void> {
  await db.contractionSessions.put(s);
}

export async function getContractionSessions(): Promise<ContractionSession[]> {
  const all = await db.contractionSessions.toArray();
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function exportAll(): Promise<{
  cycles: Cycle[];
  dailyLogs: DailyLog[];
  pregnancyProfile: PregnancyProfile | null;
  kickSessions: KickSession[];
  contractionSessions: ContractionSession[];
}> {
  return {
    cycles: await getCycles(),
    dailyLogs: await getAllDailyLogs(),
    pregnancyProfile: (await getPregnancyProfile()) ?? null,
    kickSessions: await getKickSessions(),
    contractionSessions: await getContractionSessions(),
  };
}

export async function deleteAll(): Promise<void> {
  await db.cycles.clear();
  await db.dailyLogs.clear();
  await db.pregnancyProfile.clear();
  await db.kickSessions.clear();
  await db.contractionSessions.clear();
}
