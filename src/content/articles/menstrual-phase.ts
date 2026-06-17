// src/content/articles/menstrual-phase.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const menstrualPhase: ContentArticle = {
  slug: 'menstrual-phase',
  title: 'Your menstrual phase, explained',
  summary:
    'What happens during your period and simple ways to feel more comfortable.',
  body: `## What is happening

Your period marks day 1 of your cycle. The lining of the uterus, built up over the previous cycle, is shed. Periods commonly last around 3 to 7 days.

## How you might feel

Lower energy, cramps, and a need for more rest are common in these days. None of this means anything is wrong — it is a normal part of the cycle for many people.

## Gentle ways to cope

- Rest when you can, and keep hydrated
- Gentle movement, a warm bath, or a heat pad can ease cramps
- Eat regularly to steady your energy

See a clinician if your bleeding is unusually heavy, lasts longer than 7 days, or your periods stop unexpectedly.`,
  topics: ['menstruation', 'symptoms'],
  phases: ['menstrual'],
  symptoms: ['Cramps', 'Fatigue'],
  lifeStages: ['cycle'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    { label: 'NHS — Periods', url: 'https://www.nhs.uk/conditions/periods/' },
    {
      label: 'Office on Women\'s Health — Your menstrual cycle',
      url: 'https://www.womenshealth.gov/menstrual-cycle/your-menstrual-cycle',
    },
  ],
};
