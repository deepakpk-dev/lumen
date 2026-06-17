// src/content/articles/ovulation-fertile-window.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const ovulationFertileWindow: ContentArticle = {
  slug: 'ovulation-fertile-window',
  title: 'Ovulation and your fertile window',
  summary:
    'When ovulation happens, what the fertile window means, and the signs some people notice.',
  body: `## What is ovulation

Ovulation is when an ovary releases an egg. In many cycles it happens roughly two weeks before the next period, though the exact timing varies from person to person and cycle to cycle.

## The fertile window

The days leading up to and including ovulation are the most fertile part of the cycle, because sperm can survive for several days. This is the window to focus on if you are trying to conceive — or to be aware of if you are avoiding pregnancy.

## Signs some people notice

- Clearer, stretchy cervical mucus
- A small rise in energy or libido
- Mild one‑sided twinges

Lumen estimates your fertile window from your logged history. Treat it as a guide, not a guarantee — it is not a contraceptive method.`,
  topics: ['fertility'],
  phases: ['ovulation'],
  symptoms: ['Energetic'],
  lifeStages: ['cycle'],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    {
      label: 'NHS — Working out when you are most fertile',
      url: 'https://www.nhs.uk/pregnancy/trying-for-a-baby/working-out-when-youre-most-fertile/',
    },
    {
      label: 'Office on Women\'s Health — Your menstrual cycle',
      url: 'https://www.womenshealth.gov/menstrual-cycle/your-menstrual-cycle',
    },
  ],
};
