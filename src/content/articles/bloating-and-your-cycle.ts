// src/content/articles/bloating-and-your-cycle.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const bloatingAndYourCycle: ContentArticle = {
  slug: 'bloating-and-your-cycle',
  title: 'Bloating and your cycle',
  summary:
    'Why you might feel bloated before your period and simple ways to ease it.',
  body: `## Why it happens

Many people feel bloated or notice fluid retention in the days before their period. This is a common premenstrual symptom linked to hormone changes, and it usually settles once your period begins.

## What can help

- Drink plenty of water and go easy on very salty foods
- Regular gentle movement can help
- Smaller, more frequent meals may feel more comfortable

## When to check

Bloating that is persistent, severe, or comes with other new symptoms — and does not follow your usual cycle pattern — is worth raising with a clinician.`,
  topics: ['symptoms'],
  phases: ['luteal'],
  symptoms: ['Bloating'],
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
