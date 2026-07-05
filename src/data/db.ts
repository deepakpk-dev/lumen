import Dexie, { type Table } from 'dexie';
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
import type { SyncEnvelope } from '@/src/crypto/envelope';

// One encrypted record as stored on-device. `recordKey` (opaque HMAC of
// store:key) is the primary key; `storeKey` (opaque HMAC of the store name)
// is indexed so we can list a store's records without a plaintext store column.
export type StoredEnvelope = SyncEnvelope & { storeKey: string };

export class HealthDB extends Dexie {
  cycles!: Table<Cycle, string>;
  dailyLogs!: Table<DailyLog, string>;
  pregnancyProfile!: Table<PregnancyProfile, string>;
  kickSessions!: Table<KickSession, string>;
  contractionSessions!: Table<ContractionSession, string>;
  postpartumProfile!: Table<PostpartumProfile, string>;
  epdsEntries!: Table<EpdsEntry, string>;
  programProgress!: Table<ProgramProgress, string>;
  // Encrypted store: populated only when a passcode/vault is active. Plaintext
  // (no-passcode) users leave this empty and keep using the typed tables above.
  records!: Table<StoredEnvelope, string>;

  constructor() {
    super('lumen-health');
    this.version(1).stores({
      cycles: 'id, startDate',
      dailyLogs: 'date',
    });
    this.version(2).stores({
      cycles: 'id, startDate',
      dailyLogs: 'date',
      pregnancyProfile: 'id',
      kickSessions: 'id, date',
      contractionSessions: 'id, date',
    });
    this.version(3).stores({
      cycles: 'id, startDate',
      dailyLogs: 'date',
      pregnancyProfile: 'id',
      kickSessions: 'id, date',
      contractionSessions: 'id, date',
      postpartumProfile: 'id',
      epdsEntries: 'id, date',
    });
    this.version(4).stores({
      cycles: 'id, startDate',
      dailyLogs: 'date',
      pregnancyProfile: 'id',
      kickSessions: 'id, date',
      contractionSessions: 'id, date',
      postpartumProfile: 'id',
      epdsEntries: 'id, date',
      programProgress: 'programSlug',
    });
    this.version(5).stores({
      cycles: 'id, startDate',
      dailyLogs: 'date',
      pregnancyProfile: 'id',
      kickSessions: 'id, date',
      contractionSessions: 'id, date',
      postpartumProfile: 'id',
      epdsEntries: 'id, date',
      programProgress: 'programSlug',
      records: 'recordKey, storeKey',
    });
  }
}

export const db = new HealthDB();
