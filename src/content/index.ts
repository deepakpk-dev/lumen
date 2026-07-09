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
// TTC
import { ttcFertileWindow } from './articles/ttc-fertile-window';
import { ttcBbtConfirmingOvulation } from './articles/ttc-bbt-confirming-ovulation';
import { ttcCervicalMucusLh } from './articles/ttc-cervical-mucus-lh';
import { ttcTimingConception } from './articles/ttc-timing-conception';
import { ttcWhenToSeekHelp } from './articles/ttc-when-to-seek-help';
// Pregnancy
import { pregnancyFirstTrimester } from './articles/pregnancy-first-trimester';
import { pregnancySecondTrimester } from './articles/pregnancy-second-trimester';
import { pregnancyThirdTrimester } from './articles/pregnancy-third-trimester';
import { pregnancyWarningSigns } from './articles/pregnancy-warning-signs';
import { pregnancyFetalMovement } from './articles/pregnancy-fetal-movement';
// Postpartum
import { postpartumRecoveryBasics } from './articles/postpartum-recovery-basics';
import { postpartumMentalHealth } from './articles/postpartum-mental-health';
import { postpartumCycleReturn } from './articles/postpartum-cycle-return';
// Perimenopause
import { perimenopauseWhatChanges } from './articles/perimenopause-what-changes';
import { hotFlashesNightSweats } from './articles/hot-flashes-night-sweats';
import { perimenopauseWhenToSeeADoctor } from './articles/perimenopause-when-to-see-a-doctor';

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
  // TTC
  ttcFertileWindow,
  ttcBbtConfirmingOvulation,
  ttcCervicalMucusLh,
  ttcTimingConception,
  ttcWhenToSeekHelp,
  // Pregnancy
  pregnancyFirstTrimester,
  pregnancySecondTrimester,
  pregnancyThirdTrimester,
  pregnancyWarningSigns,
  pregnancyFetalMovement,
  // Postpartum
  postpartumRecoveryBasics,
  postpartumMentalHealth,
  postpartumCycleReturn,
  // Perimenopause
  perimenopauseWhatChanges,
  hotFlashesNightSweats,
  perimenopauseWhenToSeeADoctor,
];

export function findArticle(slug: string): ContentArticle | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
