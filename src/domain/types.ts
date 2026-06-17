export type ISODate = string; // 'YYYY-MM-DD'

export type FlowIntensity = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

export type LifeStage = 'cycle' | 'ttc' | 'pregnancy' | 'menopause';

export interface DailyLog {
  date: ISODate;
  flow?: FlowIntensity;
  symptoms: string[];
  moods: string[];
  notes?: string;
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
