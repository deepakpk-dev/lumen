// src/content/index.ts
import type { ContentArticle } from '@/src/domain/content/types';
import { howTrackingWorks } from './articles/how-tracking-works';
import { menstrualPhase } from './articles/menstrual-phase';
import { follicularPhase } from './articles/follicular-phase';
import { ovulationFertileWindow } from './articles/ovulation-fertile-window';
import { lutealPhasePms } from './articles/luteal-phase-pms';

export const ARTICLES: ContentArticle[] = [
  howTrackingWorks,
  menstrualPhase,
  follicularPhase,
  ovulationFertileWindow,
  lutealPhasePms,
];
