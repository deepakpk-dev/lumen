// src/content/articles/perimenopause-when-to-see-a-doctor.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const perimenopauseWhenToSeeADoctor: ContentArticle = {
  slug: 'perimenopause-when-to-see-a-doctor',
  title: 'Perimenopause: when to see a doctor',
  summary:
    'Irregular is expected in the transition — but some bleeding patterns are not perimenopause and deserve a check.',
  body: `## Irregular is normal; these are not

Perimenopause makes cycles unpredictable, and that alone is not alarming. But a few patterns fall outside normal transition changes and warrant a visit to a clinician — not to frighten you, but because they are checkable and often very treatable:

- **Any bleeding after twelve months without a period.** Once menopause is reached, bleeding is never "just a late period" — always get it checked.
- **Very heavy bleeding** — soaking through a pad or tampon every hour, or passing large clots.
- **Bleeding between periods, or after sex.**
- **Cycles persistently shorter than 21 days.**

## Symptoms that disrupt your life are also a reason

You do not need a red-flag symptom to deserve help. If hot flashes, sleep problems, mood changes, or brain fog are disrupting your work, sleep, or relationships, say so at an appointment — effective treatments exist, and "it's just menopause" is not a reason to endure years of poor quality of life.

## Bring your record

A concrete log beats memory. Lumen's doctor summary (under Settings → Your data, or the /report page) prints your recent cycles, bleeding, and logged symptoms — bring it, and the conversation starts from data instead of guesswork.`,
  topics: ['menopause', 'wellbeing'],
  phases: [],
  symptoms: [],
  lifeStages: ['menopause'],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS and ACOG guidance',
  lastReviewed: '2026-07-09',
  sources: [
    {
      label: 'NHS — Menopause',
      url: 'https://www.nhs.uk/conditions/menopause/',
    },
    {
      label: 'ACOG — The Menopause Years',
      url: 'https://www.acog.org/womens-health/faqs/the-menopause-years',
    },
  ],
};
