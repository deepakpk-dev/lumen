export type ISODate = string; // 'YYYY-MM-DD'

export type FlowIntensity = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

export type LHResult = 'negative' | 'positive';
export type MucusType = 'dry' | 'sticky' | 'creamy' | 'watery' | 'egg-white';

export type LifeStage = 'cycle' | 'ttc' | 'pregnancy' | 'postpartum' | 'menopause';

export interface DailyLog {
  date: ISODate;
  flow?: FlowIntensity;
  symptoms: string[];
  moods: string[];
  notes?: string;
  // TTC signals (Phase 3) — optional, only set in TTC mode
  bbt?: number; // canonical °C
  lh?: LHResult;
  mucus?: MucusType;
  intercourse?: boolean;
  intercourseProtected?: boolean;
  // Postpartum (Phase 5) — bleeding after birth; kept separate from `flow`
  // so it never feeds cycle stats or predictions.
  lochia?: FlowIntensity;
}

export interface Cycle {
  id: string;
  startDate: ISODate; // day 1 = first day of period
  endDate?: ISODate; // last day of period
}

export interface CycleStats {
  cycleCount: number;
  averageCycleLength: number;
  cycleLengthStdDev: number;
  averagePeriodLength: number;
  isRegular: boolean;
  inputCycleCount: number;
}

export type Confidence = 'high' | 'medium' | 'low';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export interface Prediction {
  nextPeriodStart: ISODate;
  nextPeriodStartRange: { earliest: ISODate; latest: ISODate };
  predictedPeriodLength: number;
  fertileWindow: { start: ISODate; end: ISODate };
  ovulationDate: ISODate;
  confidence: Confidence;
  explanation: string;
}

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;
export const LUTEAL_PHASE_LENGTH = 14;
export const REGULARITY_STDDEV_THRESHOLD = 3;

export type ISOTimestamp = string; // ISO 8601 datetime, e.g. '2026-06-21T14:03:00.000Z'

export type PregnancyEndReason = 'birth' | 'loss';
export type DueDateSource = 'lmp' | 'manual' | 'cycle';
export type PregnancyStatus = 'active' | 'ended';

export interface PregnancyProfile {
  id: 'current'; // singleton key
  dueDate: ISODate;
  lmp?: ISODate; // present when known or derived
  dueDateSource: DueDateSource;
  startedAt: ISODate; // when pregnancy mode was switched on
  status: PregnancyStatus;
  endReason?: PregnancyEndReason;
  endDate?: ISODate;
}

export interface KickSession {
  id: string;
  date: ISODate; // local date of the session
  startedAt: ISOTimestamp;
  kickTimestamps: ISOTimestamp[];
  endedAt?: ISOTimestamp;
}

export interface Contraction {
  start: ISOTimestamp;
  end?: ISOTimestamp;
}

export interface ContractionSession {
  id: string;
  date: ISODate;
  contractions: Contraction[];
}

export type PostpartumStatus = 'active' | 'ended';
export type PostpartumReturnTo = 'cycle' | 'ttc';

export interface PostpartumProfile {
  id: 'current'; // singleton key
  birthDate: ISODate;
  startedAt: ISODate;
  breastfeeding?: boolean; // content/education only — never a prediction input
  status: PostpartumStatus;
  endDate?: ISODate;
  returnedTo?: PostpartumReturnTo;
}

export interface EpdsEntry {
  id: string;
  date: ISODate;
  responses: number[]; // the 10 raw 0–3 values
  total: number;
  band: 'low' | 'possible' | 'probable';
}
