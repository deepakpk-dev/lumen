// src/content/articles/luteal-phase-pms.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const lutealPhasePms: ContentArticle = {
  slug: 'luteal-phase-pms',
  title: 'The luteal phase and PMS',
  summary:
    'After ovulation, progesterone rises. Here is why PMS‑type changes are common now.',
  body: `## What is happening

The luteal phase runs from ovulation to the start of your next period. Progesterone rises, and if there is no pregnancy it then falls, which triggers your period.

## Premenstrual symptoms

In the days before your period, many people experience premenstrual syndrome (PMS): mood changes, irritability, bloating, tender breasts, or tiredness. Symptoms usually ease once your period starts.

## What can help

- Regular sleep, movement, and balanced meals
- Reducing caffeine and alcohol if they affect you
- Noting which symptoms recur, so they feel less surprising

Talk to a clinician if symptoms are severe enough to disrupt your daily life — there are effective treatments.`,
  topics: ['pms', 'symptoms'],
  phases: ['luteal'],
  symptoms: ['Mood swings', 'Irritable', 'Bloating', 'Tender breasts'],
  lifeStages: ['cycle'],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    {
      label: 'NHS — Premenstrual syndrome (PMS)',
      url: 'https://www.nhs.uk/conditions/pre-menstrual-syndrome/',
    },
    {
      label: 'ACOG — Premenstrual syndrome',
      url: 'https://www.acog.org/womens-health/faqs/premenstrual-syndrome',
    },
  ],
};
