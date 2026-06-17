import Dexie, { type Table } from 'dexie';
import type { Cycle, DailyLog } from '@/src/domain/types';

export class HealthDB extends Dexie {
  cycles!: Table<Cycle, string>;
  dailyLogs!: Table<DailyLog, string>;

  constructor() {
    super('lumen-health');
    this.version(1).stores({
      cycles: 'id, startDate',
      dailyLogs: 'date',
    });
  }
}

export const db = new HealthDB();
