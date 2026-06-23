import Dexie, { type Table } from 'dexie';
import type {
  Cycle,
  DailyLog,
  PregnancyProfile,
  KickSession,
  ContractionSession,
  PostpartumProfile,
  EpdsEntry,
} from '@/src/domain/types';

export class HealthDB extends Dexie {
  cycles!: Table<Cycle, string>;
  dailyLogs!: Table<DailyLog, string>;
  pregnancyProfile!: Table<PregnancyProfile, string>;
  kickSessions!: Table<KickSession, string>;
  contractionSessions!: Table<ContractionSession, string>;
  postpartumProfile!: Table<PostpartumProfile, string>;
  epdsEntries!: Table<EpdsEntry, string>;

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
  }
}

export const db = new HealthDB();
