// src/content/articles/pregnancy-fetal-movement.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const pregnancyFetalMovement: ContentArticle = {
  slug: 'pregnancy-fetal-movement',
  title: 'Getting to know your baby’s movements',
  summary:
    'Why your baby’s own pattern matters more than a magic number of kicks.',
  body: `## Your baby's normal is what counts

Most people begin to feel movements between about 16 and 24 weeks. As pregnancy progresses, those movements settle into a pattern that is unique to your baby — quiet times, active times, and favourite spots.

There is **no set number** of movements you should feel. What matters is getting to know *your* baby's usual pattern, so you notice if it changes.

## Using the kick counter

Lumen's kick counter lets you time a session when your baby is usually active — many people choose after a meal or in the evening. It is a way to tune in, not a test to pass.

## When to act

If your baby's movements **slow down, stop, or change** noticeably, contact your maternity team **straight away** — day or night. Do not wait until morning, and do not rely on home remedies like cold drinks to "wake" the baby first. Reduced movement can occasionally be an early sign that a baby needs checking, and it is always worth a call.

You will never be wasting anyone's time by checking.`,
  topics: ['pregnancy'],
  phases: [],
  symptoms: [],
  lifeStages: ['pregnancy'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-07-05',
  sources: [
    {
      label: 'NHS — Your baby’s movements',
      url: 'https://www.nhs.uk/pregnancy/keeping-well/your-babys-movements/',
    },
    {
      label: 'ACOG — Kick counts / fetal movement',
      url: 'https://www.acog.org/womens-health/faqs/special-tests-for-monitoring-fetal-health',
    },
  ],
};
