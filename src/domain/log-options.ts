import type { FlowIntensity, MucusType, LHResult } from './types';

export const FLOW_OPTIONS: FlowIntensity[] = [
  'none',
  'spotting',
  'light',
  'medium',
  'heavy',
];

export const SYMPTOM_OPTIONS: string[] = [
  'Cramps',
  'Headache',
  'Bloating',
  'Tender breasts',
  'Acne',
  'Fatigue',
  'Backache',
  'Nausea',
];

export const MOOD_OPTIONS: string[] = [
  'Happy',
  'Calm',
  'Anxious',
  'Irritable',
  'Sad',
  'Energetic',
  'Mood swings',
];

export const MUCUS_OPTIONS: MucusType[] = [
  'dry',
  'sticky',
  'creamy',
  'watery',
  'egg-white',
];

export const LH_OPTIONS: LHResult[] = ['negative', 'positive'];
