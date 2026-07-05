import type { ContentProgram } from '@/src/domain/content/programs/types';

export const theFourthTrimester: ContentProgram = {
  slug: 'the-fourth-trimester',
  title: 'The fourth trimester',
  summary: 'Recovery, mental health, and what comes next after birth.',
  description:
    'The weeks after birth are their own kind of recovery. This program covers healing your body, looking after your mental health, and what to expect as your cycle eventually returns.',
  lifeStages: ['postpartum'],
  topics: ['postpartum', 'wellbeing'],
  steps: [
    { articleSlug: 'postpartum-recovery-basics' },
    { articleSlug: 'postpartum-mental-health' },
    { articleSlug: 'postpartum-cycle-return' },
  ],
};
