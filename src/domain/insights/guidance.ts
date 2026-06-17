import type { CyclePhase } from '@/src/domain/types';
import type { Insight, InsightInput } from './types';
import { PRIORITY_GUIDANCE } from './types';
import { phaseForDate } from './phase-assignment';

const GUIDANCE: Record<CyclePhase, { title: string; body: string }> = {
  menstrual: {
    title: "You're in your menstrual phase",
    body: 'Your period is here. Rest, hydration, and gentle movement can help with cramps and fatigue.',
  },
  follicular: {
    title: "You're in your follicular phase",
    body: 'Estrogen is rising after your period. Many people feel more energetic and focused now.',
  },
  ovulation: {
    title: "You're around ovulation",
    body: "You're near your most fertile days. Some people notice more energy and a higher libido.",
  },
  luteal: {
    title: "You're in your luteal phase",
    body: 'Progesterone rises after ovulation. PMS-type changes like mood shifts or bloating are common now.',
  },
};

export function generateGuidanceInsights(input: InsightInput): Insight[] {
  const phase = phaseForDate(input.today, input.cycles, input.stats);
  if (!phase) return [];
  const g = GUIDANCE[phase];
  return [
    {
      id: `guidance:${phase}`,
      category: 'guidance',
      severity: 'info',
      priority: PRIORITY_GUIDANCE,
      title: g.title,
      body: g.body,
    },
  ];
}
