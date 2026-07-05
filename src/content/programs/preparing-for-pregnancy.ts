import type { ContentProgram } from '@/src/domain/content/programs/types';

export const preparingForPregnancy: ContentProgram = {
  slug: 'preparing-for-pregnancy',
  title: 'Preparing for pregnancy',
  summary: 'A step-by-step guide to timing, fertility signals, and when to seek help.',
  description:
    'Trying to conceive? This program walks through your fertile window, the signals that pinpoint ovulation, how to time things without the pressure, and when it makes sense to talk to a clinician.',
  lifeStages: ['ttc'],
  topics: ['fertility', 'wellbeing'],
  steps: [
    { articleSlug: 'ttc-fertile-window' },
    { articleSlug: 'ttc-cervical-mucus-lh' },
    { articleSlug: 'ttc-bbt-confirming-ovulation' },
    { articleSlug: 'ttc-timing-conception' },
    { articleSlug: 'ttc-when-to-seek-help' },
  ],
};
