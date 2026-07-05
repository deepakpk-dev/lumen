import type { ContentProgram } from '@/src/domain/content/programs/types';

export const understandingYourCycle: ContentProgram = {
  slug: 'understanding-your-cycle',
  title: 'Understanding your cycle',
  summary: 'A five-part guided tour from tracking basics through every phase.',
  description:
    'New to cycle tracking, or want the full picture? Work through these reads in order to understand what a menstrual cycle is and what happens in each phase.',
  lifeStages: ['cycle'],
  topics: ['getting-started', 'menstruation'],
  steps: [
    { articleSlug: 'how-tracking-works' },
    { articleSlug: 'menstrual-phase' },
    { articleSlug: 'follicular-phase' },
    { articleSlug: 'ovulation-fertile-window' },
    { articleSlug: 'luteal-phase-pms' },
  ],
};
