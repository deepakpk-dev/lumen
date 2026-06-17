// src/content/index.ts
import type { ContentArticle } from '@/src/domain/content/types';
import { howTrackingWorks } from './articles/how-tracking-works';
import { menstrualPhase } from './articles/menstrual-phase';
import { follicularPhase } from './articles/follicular-phase';
import { ovulationFertileWindow } from './articles/ovulation-fertile-window';
import { lutealPhasePms } from './articles/luteal-phase-pms';
import { periodCramps } from './articles/period-cramps';
import { moodAcrossCycle } from './articles/mood-across-cycle';
import { irregularCycles } from './articles/irregular-cycles';
import { premenstrualFatigue } from './articles/premenstrual-fatigue';
import { bloatingAndYourCycle } from './articles/bloating-and-your-cycle';

export const ARTICLES: ContentArticle[] = [
  howTrackingWorks,
  menstrualPhase,
  follicularPhase,
  ovulationFertileWindow,
  lutealPhasePms,
  periodCramps,
  moodAcrossCycle,
  irregularCycles,
  premenstrualFatigue,
  bloatingAndYourCycle,
];

export function findArticle(slug: string): ContentArticle | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
