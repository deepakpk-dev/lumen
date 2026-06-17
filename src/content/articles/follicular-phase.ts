// src/content/articles/follicular-phase.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const follicularPhase: ContentArticle = {
  slug: 'follicular-phase',
  title: 'The follicular phase: your rising-energy days',
  summary:
    'After your period, estrogen rises and many people feel more energetic and focused.',
  body: `## What is happening

The follicular phase runs from the end of your period up to ovulation. Your body prepares to release an egg, and estrogen gradually rises.

## How you might feel

Many people notice more energy, a brighter mood, and sharper focus during these days. It can be a good window for activities that take stamina or concentration.

## Making the most of it

- Use the energy boost for exercise or bigger tasks if it suits you
- Keep logging — this helps Lumen learn when your follicular phase tends to fall

Everyone is different, so notice your own pattern rather than expecting a textbook one.`,
  topics: ['menstruation', 'wellbeing'],
  phases: ['follicular'],
  symptoms: ['Energetic'],
  lifeStages: ['cycle'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with Office on Women\'s Health guidance',
  lastReviewed: '2026-06-17',
  sources: [
    {
      label: 'Office on Women\'s Health — Your menstrual cycle',
      url: 'https://www.womenshealth.gov/menstrual-cycle/your-menstrual-cycle',
    },
    { label: 'NHS — Periods', url: 'https://www.nhs.uk/conditions/periods/' },
  ],
};
