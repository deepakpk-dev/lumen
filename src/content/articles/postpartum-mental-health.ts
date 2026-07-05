// src/content/articles/postpartum-mental-health.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const postpartumMentalHealth: ContentArticle = {
  slug: 'postpartum-mental-health',
  title: 'Postpartum mental health: baby blues and beyond',
  summary:
    'The difference between the common "baby blues" and postnatal depression — and how to reach for support.',
  body: `## The "baby blues"

In the first days after birth, many people feel tearful, irritable, or low as hormones shift and sleep disappears. These **baby blues** usually start a few days in and lift on their own within about two weeks.

## When it is more than the blues

If low mood, anxiety, or a sense of numbness **lasts beyond two weeks** or feels heavy, it may be **postnatal depression** — which is common and very treatable. Signs can include:

- Persistent sadness, hopelessness, or crying
- Losing interest in things, or in the baby
- Trouble sleeping even when the baby sleeps, or sleeping too much
- Feeling worthless, guilty, or intensely anxious

Postnatal anxiety and, rarely, more serious conditions can also occur. None of this is a failing or your fault.

## Screening and support

Lumen offers the Edinburgh Postnatal Depression Scale (EPDS) as a gentle check-in. It is not a diagnosis — a higher score simply suggests it is worth talking to someone.

**Please reach out now** — to your clinician, health visitor, or a trusted person — if you feel unable to cope, or if you ever have thoughts of harming yourself or your baby. Help is available and effective, and asking for it is a sign of strength. In a crisis, contact your local emergency services.`,
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
      label: 'NHS — Postnatal depression',
      url: 'https://www.nhs.uk/mental-health/conditions/post-natal-depression/',
    },
    {
      label: 'ACOG — Postpartum depression',
      url: 'https://www.acog.org/womens-health/faqs/postpartum-depression',
    },
  ],
};
