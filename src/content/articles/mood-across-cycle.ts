// src/content/articles/mood-across-cycle.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const moodAcrossCycle: ContentArticle = {
  slug: 'mood-across-cycle',
  title: 'Mood changes across your cycle',
  summary:
    'Hormone shifts can influence how you feel. Here is what is common and when to get support.',
  body: `## Mood and hormones

Rising and falling hormones across the cycle can affect mood. Many people feel steadier in the first half of the cycle and notice more irritability, anxiety, or low mood in the days before their period.

## Looking after yourself

- Keep sleep, movement, and meals as regular as you can
- Be kind to yourself in the premenstrual days
- Logging mood helps you see your own pattern, which can make it feel more manageable

## When to reach out

If low mood, anxiety, or mood swings feel severe, last most of the month, or affect your relationships or daily life, talk to a clinician. Persistent or severe premenstrual mood symptoms can be treated.`,
  topics: ['pms', 'wellbeing'],
  phases: ['luteal'],
  symptoms: ['Anxious', 'Irritable', 'Sad', 'Mood swings'],
  lifeStages: ['cycle'],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    {
      label: 'NHS — Premenstrual syndrome (PMS)',
      url: 'https://www.nhs.uk/conditions/pre-menstrual-syndrome/',
    },
    {
      label: "Office on Women's Health — Your menstrual cycle",
      url: 'https://www.womenshealth.gov/menstrual-cycle/your-menstrual-cycle',
    },
  ],
};
