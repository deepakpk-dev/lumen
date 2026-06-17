import type { Cycle, DailyLog, ISODate } from '@/src/domain/types';
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

export async function exportAll(): Promise<{
  cycles: Cycle[];
  dailyLogs: DailyLog[];
}> {
  return {
    cycles: await getCycles(),
    dailyLogs: await getAllDailyLogs(),
  };
}

export async function deleteAll(): Promise<void> {
  await db.cycles.clear();
  await db.dailyLogs.clear();
}
