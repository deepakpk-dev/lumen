import type { ContentProgram } from '@/src/domain/content/programs/types';

export const understandingPerimenopause: ContentProgram = {
  slug: 'understanding-perimenopause',
  title: 'Understanding perimenopause',
  summary: 'A three-part guide to the transition: what changes, what helps, and when to get checked.',
  description:
    'Navigating the years before menopause? Work through these reads in order to understand what is happening, how to handle the signature symptoms, and which changes deserve a doctor visit.',
  lifeStages: ['menopause'],
  topics: ['menopause'],
  steps: [
    { articleSlug: 'perimenopause-what-changes' },
    { articleSlug: 'hot-flashes-night-sweats' },
    { articleSlug: 'perimenopause-when-to-see-a-doctor' },
  ],
};
