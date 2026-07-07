import type { ContentProgram } from '@/src/domain/content/programs/types';
import { understandingYourCycle } from './understanding-your-cycle';
import { preparingForPregnancy } from './preparing-for-pregnancy';
import { yourPregnancyJourney } from './your-pregnancy-journey';
import { theFourthTrimester } from './the-fourth-trimester';

export const PROGRAMS: ContentProgram[] = [
  understandingYourCycle,
  preparingForPregnancy,
  yourPregnancyJourney,
  theFourthTrimester,
];
