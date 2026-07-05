// src/content/articles/ttc-bbt-confirming-ovulation.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const ttcBbtConfirmingOvulation: ContentArticle = {
  slug: 'ttc-bbt-confirming-ovulation',
  title: 'Basal body temperature and confirming ovulation',
  summary:
    'How the small post-ovulation temperature rise confirms that ovulation happened.',
  body: `## What BBT tells you

Basal body temperature (BBT) is your resting temperature, taken first thing in the morning before you get up. After ovulation, progesterone causes a small, sustained rise — often around 0.2–0.5°C. Seeing that shift is a way to *confirm* ovulation happened, though it appears **after** the fact rather than predicting it in advance.

## Measuring it well

- Take it at the same time each morning, after at least a few hours of sleep, before eating, drinking, or getting up.
- Use a thermometer with two decimal places for consistency.
- Log daily — a single reading means little; the *pattern* is what matters.

Lumen looks for a sustained shift (a reading that stays above the previous six days) and combines it with your LH and cervical-mucus logs to confirm ovulation and estimate your true luteal length.

## Keeping perspective

Illness, poor sleep, alcohol, and travel can all nudge a reading. One odd day is normal. BBT is a helpful signal for understanding your pattern — it is not a contraceptive method, and it does not replace advice from a clinician.`,
  topics: ['fertility'],
  phases: ['ovulation', 'luteal'],
  symptoms: [],
  lifeStages: ['ttc'],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with ACOG guidance',
  lastReviewed: '2026-07-05',
  sources: [
    {
      label: 'ACOG — Fertility awareness-based methods of family planning',
      url: 'https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning',
    },
    {
      label: 'Office on Women\'s Health — Trying to conceive',
      url: 'https://www.womenshealth.gov/pregnancy/you-get-pregnant/trying-conceive',
    },
  ],
};
