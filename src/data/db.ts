import Dexie, { type Table } from 'dexie';
import type {
  Cycle,
  DailyLog,
  PregnancyProfile,
  KickSession,
  ContractionSession,
} from '@/src/domain/types';

export class HealthDB extends Dexie {
  cycles!: Table<Cycle, string>;
  dailyLogs!: Table<DailyLog, string>;
  pregnancyProfile!: Table<PregnancyProfile, string>;
  kickSessions!: Table<KickSession, string>;
  contractionSessions!: Table<ContractionSession, string>;

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
  }
}

export const db = new HealthDB();
