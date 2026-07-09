// src/content/articles/hot-flashes-night-sweats.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const hotFlashesNightSweats: ContentArticle = {
  slug: 'hot-flashes-night-sweats',
  title: 'Hot flashes and night sweats',
  summary:
    'Vasomotor symptoms are the signature of the menopause transition. What helps, what triggers them, and when treatment is worth discussing.',
  body: `## Why they happen

Hot flashes — sudden waves of heat, often with flushing and sweating — and their night-time version, night sweats, are called vasomotor symptoms. They affect most people at some point during the menopause transition. Shifting estrogen levels appear to narrow the body's comfortable temperature range, so small changes tip you into a full heat-release response.

## Common triggers

Not every flash has a trigger, but these commonly make them more likely or more intense:

- Warm rooms, hot drinks, and heavy bedding
- Caffeine and alcohol
- Spicy food
- Stress and anxious moments
- Smoking

## What you can do today

- Dress in layers you can shed quickly, and keep the bedroom cooler at night
- Use breathable bedding; keep water nearby
- Try slow, paced breathing when a flash starts — it can take the edge off
- Notice your own triggers and trim the avoidable ones

## Treatment exists

If symptoms are disrupting your sleep or daily life, that is a legitimate reason to see a clinician — not something to simply endure. Hormone replacement therapy (also called menopausal hormone therapy) is effective for many people, and non-hormonal options exist too. Which, if any, is right for you is a conversation with your clinician, weighing your health history — it is not something an app can advise.

## Log them in Lumen

Logging hot flashes and night sweats alongside sleep and mood helps you see patterns — and gives you a concrete record to bring to an appointment instead of trying to remember a fuzzy few months.`,
  topics: ['menopause', 'symptoms'],
  phases: [],
  symptoms: [],
  lifeStages: ['menopause'],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS and ACOG guidance',
  lastReviewed: '2026-07-09',
  sources: [
    {
      label: 'NHS — Menopause: symptoms and treatment',
      url: 'https://www.nhs.uk/conditions/menopause/',
    },
    {
      label: 'ACOG — The Menopause Years',
      url: 'https://www.acog.org/womens-health/faqs/the-menopause-years',
    },
  ],
};
