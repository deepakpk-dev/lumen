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
import { exportPreferences, importPreferences } from '@/src/settings/preferences';
import {
  putRecord,
  getRecord,
  getAllRecords,
  deleteRecord,
  clearStore,
  setStorageKeys,
  storageIsEncrypted,
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
  preferences: ReturnType<typeof exportPreferences>;
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
    preferences: exportPreferences(),
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
  // Restore life stage / units / reminders too, so a backup carries the full
  // app state (a pregnancy backup lands in pregnancy mode, not default cycle).
  importPreferences(data.preferences);
}

// Counts for every store an export produced, so the migration below can verify
// the encrypted copy is complete before it deletes the plaintext source —
// including the profile singletons and the pregnancy/postpartum stores.
function storeCounts(d: Awaited<ReturnType<typeof exportAll>>): number[] {
  return [
    d.cycles.length,
    d.dailyLogs.length,
    d.kickSessions.length,
    d.contractionSessions.length,
    d.epdsEntries.length,
    d.programProgress.length,
    d.pregnancyProfile ? 1 : 0,
    d.postpartumProfile ? 1 : 0,
  ];
}

// Turn on encryption for an existing (plaintext) device: copy every record
// into the encrypted store under `keys`, then drop the plaintext tables. Reads
// happen while the session is still plaintext; writes after the key is
// installed. Verifies EVERY store's encrypted copy is complete, then persists
// the vault (via `persistVault`) BEFORE deleting the plaintext source, so a
// failed key write can never strand data encrypted with a lost key. Rolls the
// session back to plaintext if anything fails.
// ponytail: full crash-resumable migration (interrupted mid-write) is deferred
// to hardening — plaintext stays the source of truth until the verified clear,
// so a re-run recovers.
export async function encryptExistingData(
  keys: DerivedKeys,
  persistVault: () => void | Promise<void>,
): Promise<void> {
  // Refuse to run once a key is already installed: exportAll would then read the
  // (empty) encrypted store as the "plaintext" source, pass a 0===0 verify, and
  // wipe the real typed tables.
  if (storageIsEncrypted()) throw new Error('Encryption is already on.');
  const plaintext = await exportAll(); // session still null → reads typed tables
  try {
    setStorageKeys(keys);
    await importAll(plaintext); // now writes encrypted envelopes
    const check = await exportAll(); // session set → reads back from the encrypted store
    const before = storeCounts(plaintext);
    const after = storeCounts(check);
    if (before.some((n, i) => n !== after[i])) {
      throw new Error('Encryption did not complete — your data is unchanged.');
    }
    // Persist the key before the destructive clear: if this throws (quota,
    // private mode), we bail with plaintext still intact rather than losing it.
    await persistVault();
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
