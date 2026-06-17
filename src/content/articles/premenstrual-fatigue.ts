// src/content/articles/premenstrual-fatigue.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const premenstrualFatigue: ContentArticle = {
  slug: 'premenstrual-fatigue',
  title: 'Why you feel tired before your period',
  summary: 'Premenstrual tiredness is common. Here is why, and what can help.',
  body: `## Why it happens

Feeling more tired in the days before your period is a common premenstrual symptom. Hormone shifts, disrupted sleep, and mood changes can all play a part.

## What can help

- Aim for a regular sleep routine, especially in the luteal phase
- Gentle daytime activity can lift energy more than resting all day
- Balanced meals help steady your energy; limit caffeine late in the day

## Worth checking

Tiredness that is constant, severe, or not linked to your cycle can have other causes, such as low iron — particularly if your periods are heavy. If it persists, ask a clinician about it.`,
  topics: ['symptoms', 'wellbeing'],
  phases: ['luteal'],
  symptoms: ['Fatigue'],
  lifeStages: ['cycle'],
  readingMinutes: 2,
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
