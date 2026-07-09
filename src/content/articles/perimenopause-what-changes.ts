// src/content/articles/perimenopause-what-changes.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const perimenopauseWhatChanges: ContentArticle = {
  slug: 'perimenopause-what-changes',
  title: 'What changes in perimenopause',
  summary:
    'The years before menopause bring real changes to your cycle. Here is what to expect — and what Lumen does differently for you.',
  body: `## The transition, not the end

Perimenopause is the stretch of years when your body gradually transitions toward menopause. It typically begins in your 40s — sometimes in your late 30s — and commonly lasts around four to eight years. It ends at menopause itself, which is defined simply: twelve consecutive months without a period.

## What your cycle does

As ovulation becomes less predictable, cycles change. They may get shorter for a while, then longer; the gap between periods can swing noticeably from one cycle to the next. Bleeding can be heavier or lighter than you're used to. All of this is a normal part of the transition — it reflects shifting hormone levels, not something you did or failed to do.

## Pregnancy is still possible

This matters and is easy to miss: until you have gone a full twelve months without a period, you can still ovulate and you can still become pregnant. If pregnancy would be unwelcome, keep using contraception through the transition — irregular cycles are not protection.

## How Lumen handles it

In perimenopause mode, Lumen keeps tracking your cycles and still gives you a heads-up before a likely period — but it widens its estimates and lowers its confidence instead of pretending to be precise. Because ovulation timing becomes erratic, Lumen stops displaying a fertile window in this stage: showing one would imply an accuracy that doesn't exist here. Your logs still matter — symptom patterns like hot flashes and sleep changes become the most useful thing to track.`,
  topics: ['menopause', 'irregular-cycles'],
  phases: [],
  symptoms: [],
  lifeStages: ['menopause'],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-07-09',
  sources: [
    {
      label: 'NHS — Menopause',
      url: 'https://www.nhs.uk/conditions/menopause/',
    },
    {
      label: "Office on Women's Health — Menopause basics",
      url: 'https://www.womenshealth.gov/menopause/menopause-basics',
    },
  ],
};
