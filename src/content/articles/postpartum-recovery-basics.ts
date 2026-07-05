// src/content/articles/postpartum-recovery-basics.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const postpartumRecoveryBasics: ContentArticle = {
  slug: 'postpartum-recovery-basics',
  title: 'Postpartum recovery: the first weeks',
  summary:
    'What healing looks like after birth — bleeding, soreness, rest, and when to call.',
  body: `## Your body is healing

The weeks after birth (often called the fourth trimester) are a real recovery, whether you had a vaginal birth or a caesarean. Give yourself the same patience you would give any healing body.

## What is normal

- **Lochia** — postpartum bleeding that starts red and heavy, then gradually lightens and browns over a few weeks. In Lumen this is tracked separately from your period and never counts as a cycle.
- **Afterpains** — cramping as the uterus shrinks back, often stronger while breastfeeding
- Perineal or c-section soreness, night sweats, and deep tiredness

## Helping yourself heal

- Rest when you can, and accept help
- Eat and drink regularly; keep on top of pain relief and any stitches care
- Gentle movement as you feel able — no rush

## When to seek help

Contact your clinician promptly for: bleeding that suddenly gets heavier or has large clots, a fever, a wound that is red, hot, or leaking, severe pain, or foul-smelling discharge. These can signal an infection or other issue that is very treatable when caught early.

Recovery is not a race, and asking for help is part of it.`,
  topics: ['postpartum', 'wellbeing'],
  phases: [],
  symptoms: [],
  lifeStages: ['postpartum'],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS and ACOG guidance',
  lastReviewed: '2026-07-05',
  sources: [
    {
      label: 'NHS — Your body after the birth',
      url: 'https://www.nhs.uk/conditions/baby/support-and-services/your-body-after-the-birth/',
    },
    {
      label: 'ACOG — Postpartum care',
      url: 'https://www.acog.org/womens-health/faqs/postpartum-care',
    },
  ],
};
