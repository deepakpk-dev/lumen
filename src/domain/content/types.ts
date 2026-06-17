import type { CyclePhase, LifeStage, ISODate } from '@/src/domain/types';
import type { InsightInput } from '@/src/domain/insights/types';

export const CONTENT_TOPICS = [
  'getting-started',
  'menstruation',
  'fertility',
  'pms',
  'symptoms',
  'irregular-cycles',
  'wellbeing',
] as const;

export type ContentTopic = (typeof CONTENT_TOPICS)[number];

export interface ContentSource {
  label: string;
  url: string;
}

export interface ContentArticle {
  slug: string;
  title: string;
  summary: string;
  body: string; // markdown
  topics: ContentTopic[];
  phases: CyclePhase[]; // [] = relevant to any phase
  symptoms: string[]; // members of SYMPTOM_OPTIONS / MOOD_OPTIONS
  lifeStages: LifeStage[]; // [] = universal; ['cycle'] for now
  readingMinutes: number;
  author: string;
  medicalReviewer: string;
  lastReviewed: ISODate;
  sources: ContentSource[];
}

export interface ContentContext {
  currentPhase: CyclePhase | null;
  recentSymptoms: string[];
  isIrregular: boolean;
  hasData: boolean;
  lifeStage: LifeStage;
}

export interface ScoredArticle {
  article: ContentArticle;
  score: number;
  matchReasons: string[];
}

// The engine consumes the same shape the insights engine does.
export type ContentInput = InsightInput;

export const RECENT_LOG_WINDOW = 14; // days
export const PHASE_MATCH_WEIGHT = 10;
export const SYMPTOM_MATCH_WEIGHT = 5;
export const IRREGULAR_BOOST = 8;
export const GETTING_STARTED_BOOST = 6;
export const DAILY_TOP_SLICE = 5;
