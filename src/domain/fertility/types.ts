import type { Confidence, ISODate } from '@/src/domain/types';

export type OvulationMethod = 'bbt' | 'lh' | 'mucus';

export interface OvulationConfirmation {
  cycleId: string;
  ovulationDate: ISODate;
  status: 'confirmed' | 'likely';
  methods: OvulationMethod[];
  confidence: Confidence;
  explanation: string;
}

export type ConceptionLevel = 'high' | 'medium' | 'low';

export interface ConceptionGuidance {
  date: ISODate;
  level: ConceptionLevel;
  label: string;
  reason: string;
}
