// src/content/articles/pregnancy-first-trimester.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const pregnancyFirstTrimester: ContentArticle = {
  slug: 'pregnancy-first-trimester',
  title: 'The first trimester: what to expect',
  summary:
    'Weeks 1–12: early symptoms, what is developing, and the first steps of prenatal care.',
  body: `## Your body in the first trimester

The first trimester covers weeks 1 to 12. Hormones rise quickly, and even before you look pregnant you may feel very different. Common early symptoms include:

- Nausea or "morning" sickness (which can strike any time of day)
- Tiredness and a strong need for sleep
- Tender, swollen breasts
- Needing to pee more often
- Food aversions or heightened smell

## What is developing

This is a period of rapid development: by the end of week 12 the major organs have begun to form and the heartbeat can often be seen on a scan.

## First steps

- Start or continue **folic acid** (400 micrograms daily) and consider vitamin D
- Book your first antenatal (booking) appointment with your midwife or clinician
- Avoid alcohol and smoking, and check which foods and medicines to avoid

## A note on worry

Early pregnancy can feel fragile and anxious, especially around symptoms coming and going. Some spotting can be normal, but bleeding, severe pain, or a fever are reasons to contact your maternity team. When in doubt, ask — that is what they are there for.`,
  topics: ['pregnancy'],
  phases: [],
  symptoms: [],
  lifeStages: ['pregnancy'],
  trimesters: [1],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-07-05',
  sources: [
    {
      label: 'NHS — You and your baby at 1 to 12 weeks pregnant',
      url: 'https://www.nhs.uk/pregnancy/week-by-week/1-to-12/',
    },
    {
      label: 'ACOG — First trimester',
      url: 'https://www.acog.org/womens-health/faqs/how-your-fetus-grows-during-pregnancy',
    },
  ],
};
