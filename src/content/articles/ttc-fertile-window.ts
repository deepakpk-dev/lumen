// src/content/articles/ttc-fertile-window.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const ttcFertileWindow: ContentArticle = {
  slug: 'ttc-fertile-window',
  title: 'Your fertile window, explained',
  summary:
    'The handful of days each cycle when conception is possible — and how to recognise them.',
  body: `## When can you conceive?

Conception is only possible during a short **fertile window**: roughly the five days *before* ovulation plus ovulation day itself. Sperm can survive for up to about five days, while an egg lives for around 12–24 hours, so the days leading up to ovulation matter most.

## Finding your window

Ovulation usually happens about 12–14 days before your next period starts — not on a fixed calendar day. Because cycles vary, Lumen estimates your window from your own history and shows it with an honest confidence level rather than false precision.

Signs that ovulation is approaching include:

- Clear, stretchy, egg-white cervical mucus
- A positive LH (ovulation) test
- A small rise in basal body temperature *after* ovulation

## What this means for trying

Having sex in the two to three days before ovulation gives the best chance each cycle. There is no need to "save up" — regular intercourse across the window works well.

Every cycle is different, and a missed window is normal. If you have questions about your timing, a clinician or fertility specialist can help.`,
  topics: ['fertility'],
  phases: ['follicular', 'ovulation'],
  symptoms: [],
  lifeStages: ['ttc'],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS and ACOG guidance',
  lastReviewed: '2026-07-05',
  sources: [
    {
      label: 'NHS — Trying to get pregnant',
      url: 'https://www.nhs.uk/pregnancy/trying-for-a-baby/',
    },
    {
      label: 'ACOG — Fertility awareness-based methods of family planning',
      url: 'https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning',
    },
  ],
};
