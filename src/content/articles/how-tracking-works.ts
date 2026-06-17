// src/content/articles/how-tracking-works.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const howTrackingWorks: ContentArticle = {
  slug: 'how-tracking-works',
  title: 'How period tracking works',
  summary:
    'What a menstrual cycle is, why logging helps, and how Lumen turns your logs into predictions.',
  body: `## What is a menstrual cycle?

Your cycle is counted from the first day of one period to the first day of the next. A typical cycle is around 28 days, but anywhere from about 21 to 35 days is common, and cycles often vary from month to month.

## Why logging helps

The more days you log — your period, symptoms, and mood — the better Lumen can describe your personal pattern. Predictions start from a typical 28‑day cycle and become more accurate, and more honest about uncertainty, as your own history builds up.

## What to log

- The days your period starts and ends
- Flow (spotting through heavy)
- Symptoms like cramps, headaches, or bloating
- Mood

There is no "perfect" cycle. Logging is simply a way to understand your own body.`,
  topics: ['getting-started', 'menstruation'],
  phases: [],
  symptoms: [],
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
