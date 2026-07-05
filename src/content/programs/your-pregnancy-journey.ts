import type { ContentProgram } from '@/src/domain/content/programs/types';

export const yourPregnancyJourney: ContentProgram = {
  slug: 'your-pregnancy-journey',
  title: 'Your pregnancy journey',
  summary: 'Trimester by trimester, plus movements and the signs that need a call.',
  description:
    'A guided path through pregnancy: what to expect in each trimester, how to get to know your baby’s movements, and the symptoms that mean you should contact your maternity team.',
  lifeStages: ['pregnancy'],
  topics: ['pregnancy'],
  steps: [
    { articleSlug: 'pregnancy-first-trimester' },
    { articleSlug: 'pregnancy-second-trimester' },
    { articleSlug: 'pregnancy-third-trimester' },
    { articleSlug: 'pregnancy-fetal-movement' },
    { articleSlug: 'pregnancy-warning-signs' },
  ],
};
