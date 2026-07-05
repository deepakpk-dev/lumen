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
import type { DerivedKeys } from '@/src/crypto/keys';
import {
  putRecord,
  getRecord,
  getAllRecords,
  deleteRecord,
  clearStore,
  setStorageKeys,
} from './storage';

export async function addCycle(cycle: Cycle): Promise<void> {
  await putRecord('cycles', cycle.id, cycle);
}

export async function updateCycle(cycle: Cycle): Promise<void> {
  await putRecord('cycles', cycle.id, cycle);
}

export async function getCycles(): Promise<Cycle[]> {
  const all = await getAllRecords<Cycle>('cycles');
  return all.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function upsertDailyLog(log: DailyLog): Promise<void> {
  await putRecord('dailyLogs', log.date, log);
}

export async function getDailyLog(date: ISODate): Promise<DailyLog | undefined> {
  return getRecord<DailyLog>('dailyLogs', date);
}

export async function getAllDailyLogs(): Promise<DailyLog[]> {
  return getAllRecords<DailyLog>('dailyLogs');
}

export async function getPregnancyProfile(): Promise<PregnancyProfile | undefined> {
  return getRecord<PregnancyProfile>('pregnancyProfile', 'current');
}

export async function savePregnancyProfile(p: PregnancyProfile): Promise<void> {
  await putRecord('pregnancyProfile', p.id, p);
}

// Drop the pregnancy journey (profile + its kick/contraction logs) so a fresh
// onboarding start can't inherit a stale pregnancy stage.
export async function clearPregnancyProfile(): Promise<void> {
  await clearStore('pregnancyProfile');
  await clearStore('kickSessions');
  await clearStore('contractionSessions');
}

export async function deletePregnancyProfile(): Promise<void> {
  await deleteRecord('pregnancyProfile', 'current');
}

export async function addKickSession(s: KickSession): Promise<void> {
  await putRecord('kickSessions', s.id, s);
}

export async function getKickSessions(): Promise<KickSession[]> {
  const all = await getAllRecords<KickSession>('kickSessions');
  return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function addContractionSession(s: ContractionSession): Promise<void> {
  await putRecord('contractionSessions', s.id, s);
}

export async function getContractionSessions(): Promise<ContractionSession[]> {
  const all = await getAllRecords<ContractionSession>('contractionSessions');
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getProgramProgress(): Promise<ProgramProgress[]> {
  return getAllRecords<ProgramProgress>('programProgress');
}

export async function saveProgramProgress(p: ProgramProgress): Promise<void> {
  await putRecord('programProgress', p.programSlug, p);
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

// Restore from a parsed export. Routes through the same put path as everything
// else, so records land encrypted when a vault is active. ponytail: no wrapping
// transaction — encrypted writes await crypto.subtle, which would close a Dexie
// transaction early. Import is additive (upsert by key), so a re-run after an
// interrupted import completes it.
export async function importAll(data: ImportedData): Promise<void> {
  for (const c of data.cycles) await putRecord('cycles', c.id, c);
  for (const l of data.dailyLogs) await putRecord('dailyLogs', l.date, l);
  if (data.pregnancyProfile) await putRecord('pregnancyProfile', data.pregnancyProfile.id, data.pregnancyProfile);
  for (const s of data.kickSessions) await putRecord('kickSessions', s.id, s);
  for (const s of data.contractionSessions) await putRecord('contractionSessions', s.id, s);
  if (data.postpartumProfile) await putRecord('postpartumProfile', data.postpartumProfile.id, data.postpartumProfile);
  for (const e of data.epdsEntries) await putRecord('epdsEntries', e.id, e);
  for (const p of data.programProgress) await putRecord('programProgress', p.programSlug, p);
}

// Turn on encryption for an existing (plaintext) device: copy every record
// into the encrypted store under `keys`, then drop the plaintext tables. Reads
// happen while the session is still plaintext; writes after the key is
// installed. Verifies the encrypted copy is complete before deleting the
// plaintext source, and rolls the session back to plaintext if anything fails
// so the app never lands half-encrypted with the key lost.
// ponytail: verify-before-clear guards against data loss; full crash-resumable
// migration (interrupted mid-write) is deferred to hardening — plaintext stays
// the source of truth until the verified clear, so a re-run recovers.
export async function encryptExistingData(keys: DerivedKeys): Promise<void> {
  const plaintext = await exportAll(); // session still null → reads typed tables
  try {
    setStorageKeys(keys);
    await importAll(plaintext); // now writes encrypted envelopes
    const check = await exportAll(); // session set → reads back from the encrypted store
    if (
      check.cycles.length !== plaintext.cycles.length ||
      check.dailyLogs.length !== plaintext.dailyLogs.length ||
      check.epdsEntries.length !== plaintext.epdsEntries.length
    ) {
      throw new Error('Encryption did not complete — your data is unchanged.');
    }
  } catch (err) {
    setStorageKeys(null); // stay in plaintext mode; plaintext tables are intact
    throw err;
  }
  await Promise.all([
    db.cycles.clear(),
    db.dailyLogs.clear(),
    db.pregnancyProfile.clear(),
    db.kickSessions.clear(),
    db.contractionSessions.clear(),
    db.postpartumProfile.clear(),
    db.epdsEntries.clear(),
    db.programProgress.clear(),
  ]);
}

// Full wipe. Clears both the plaintext tables and the encrypted store outright
// so it erases everything regardless of the current mode (used on delete-all
// and re-onboarding after a reset).
export async function deleteAll(): Promise<void> {
  await Promise.all([
    db.cycles.clear(),
    db.dailyLogs.clear(),
    db.pregnancyProfile.clear(),
    db.kickSessions.clear(),
    db.contractionSessions.clear(),
    db.postpartumProfile.clear(),
    db.epdsEntries.clear(),
    db.programProgress.clear(),
    db.records.clear(),
  ]);
}

export async function getPostpartumProfile(): Promise<PostpartumProfile | undefined> {
  return getRecord<PostpartumProfile>('postpartumProfile', 'current');
}

export async function savePostpartumProfile(p: PostpartumProfile): Promise<void> {
  await putRecord('postpartumProfile', p.id, p);
}

// Drop the postpartum journey (profile + its mood check-ins) so a fresh
// onboarding start can't inherit a stale postpartum stage.
export async function clearPostpartumProfile(): Promise<void> {
  await clearStore('postpartumProfile');
  await clearStore('epdsEntries');
}

export async function deletePostpartumProfile(): Promise<void> {
  await deleteRecord('postpartumProfile', 'current');
}

export async function addEpdsEntry(e: EpdsEntry): Promise<void> {
  await putRecord('epdsEntries', e.id, e);
}

export async function getEpdsEntries(): Promise<EpdsEntry[]> {
  const all = await getAllRecords<EpdsEntry>('epdsEntries');
  return all.sort((a, b) => b.date.localeCompare(a.date));
}
