import type {
  Cycle,
  DailyLog,
  CycleStats,
  Prediction,
  ISODate,
} from '@/src/domain/types';

export type InsightCategory = 'pattern' | 'trend' | 'anomaly' | 'guidance';
export type InsightSeverity = 'info' | 'attention';

export interface Insight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  priority: number;
  title: string;
  body: string;
  detail?: string;
}

export interface InsightInput {
  cycles: Cycle[];
  dailyLogs: DailyLog[];
  stats: CycleStats;
  prediction: Prediction | null;
  today: ISODate;
}

export const MIN_SYMPTOM_OCCURRENCES = 3;
export const PATTERN_CONCENTRATION = 0.6;
export const MIN_CYCLES_FOR_TRENDS = 2;
export const RECENT_CYCLE_WINDOW = 3;
export const OVERDUE_DAYS = 2;
export const SYMPTOM_CLUSTER_COUNT = 4;
export const SYMPTOM_CLUSTER_WINDOW = 3;

export const PRIORITY_ANOMALY = 100;
export const PRIORITY_PATTERN = 70;
export const PRIORITY_TREND = 50;
export const PRIORITY_GUIDANCE = 20;
