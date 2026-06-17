// src/content/articles/irregular-cycles.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const irregularCycles: ContentArticle = {
  slug: 'irregular-cycles',
  title: 'When cycles are irregular',
  summary:
    'Irregular periods are common and have many causes. Here is what is normal and when to check in.',
  body: `## What counts as irregular

Cycle length naturally varies. Periods are usually called irregular when the gap between them keeps changing, or your cycles are shorter than about 21 days or longer than about 35 days.

## Common causes

- The years after periods first start and the approach to menopause
- Stress, significant weight change, or intense exercise
- Hormonal contraception
- Conditions such as polycystic ovary syndrome (PCOS) or thyroid problems

## How Lumen handles it

When your cycles vary, Lumen widens its estimates and lowers its confidence rather than pretending to be precise. Keep logging — patterns can still emerge.

See a clinician if your periods suddenly become irregular, stop, or are very heavy, so any underlying cause can be checked.`,
  topics: ['irregular-cycles', 'menstruation'],
  phases: [],
  symptoms: [],
  lifeStages: ['cycle'],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    {
      label: 'NHS — Irregular periods',
      url: 'https://www.nhs.uk/conditions/irregular-periods/',
    },
    {
      label: "Office on Women's Health — Your menstrual cycle",
      url: 'https://www.womenshealth.gov/menstrual-cycle/your-menstrual-cycle',
    },
  ],
};
