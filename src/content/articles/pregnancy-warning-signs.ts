// src/content/articles/pregnancy-warning-signs.ts
import type { ContentArticle } from '@/src/domain/content/types';

export const pregnancyWarningSigns: ContentArticle = {
  slug: 'pregnancy-warning-signs',
  title: 'Pregnancy symptoms: when to call for help',
  summary:
    'Most symptoms are normal — but some need prompt attention. A simple guide to the difference.',
  body: `## Trust your instincts

Pregnancy comes with many uncomfortable-but-normal symptoms. This is not a diagnostic checklist — it is a reminder of the signs that mean **contact your maternity team promptly**, rather than waiting for your next appointment.

## Contact your team urgently if you have

- **Vaginal bleeding**, or fluid leaking from the vagina
- **Severe or constant tummy pain**
- A **bad headache** that will not go away, especially with vision changes (spots or blurring)
- Sudden **swelling** of the face, hands, or feet
- A **high temperature** or feeling generally very unwell
- **Reduced or changed baby movements** (once movements are established)
- Severe vomiting that stops you keeping fluids down
- Pain or burning when peeing, or a lot of itching

## Why it matters

Some of these can be signs of conditions like pre-eclampsia or infection that are very treatable when caught early. Maternity teams would always rather hear from you and reassure you than have you wait and worry.

You know your body. If something feels wrong — even if it is not on this list — call. In an emergency, contact your local emergency services.`,
  topics: ['pregnancy', 'symptoms'],
  phases: [],
  symptoms: [],
  lifeStages: ['pregnancy'],
  readingMinutes: 3,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-07-05',
  sources: [
    {
      label: 'NHS — Pregnancy: symptoms to never ignore',
      url: 'https://www.nhs.uk/pregnancy/related-conditions/',
    },
    {
      label: 'ACOG — Preeclampsia and high blood pressure during pregnancy',
      url: 'https://www.acog.org/womens-health/faqs/preeclampsia-and-high-blood-pressure-during-pregnancy',
    },
  ],
};
