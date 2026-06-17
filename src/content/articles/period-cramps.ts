// src/content/articles/period-cramps.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const periodCramps: ContentArticle = {
  slug: 'period-cramps',
  title: 'Managing period cramps',
  summary: 'Why cramps happen and practical ways to ease them.',
  body: `## Why cramps happen

Period pain is caused by the muscular wall of the uterus tightening to help shed its lining. Stronger contractions can briefly reduce blood flow and cause the cramping ache many people feel.

## What can help

- A heat pad or warm bath on your lower tummy
- Gentle exercise, stretching, or walking
- Over‑the‑counter pain relief such as ibuprofen can help many people — follow the label and check it is suitable for you

## When to seek advice

See a clinician if your pain is severe, getting worse over time, or not helped by usual measures, or if it comes with very heavy bleeding. These can be signs worth investigating.`,
  topics: ['symptoms', 'menstruation'],
  phases: ['menstrual'],
  symptoms: ['Cramps', 'Backache'],
  lifeStages: ['cycle'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    {
      label: 'NHS — Period pain',
      url: 'https://www.nhs.uk/conditions/period-pain/',
    },
    {
      label: 'ACOG — Dysmenorrhea: painful periods',
      url: 'https://www.acog.org/womens-health/faqs/dysmenorrhea-painful-periods',
    },
  ],
};
