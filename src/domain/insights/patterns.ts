import type { CyclePhase } from '@/src/domain/types';
import type { Insight, InsightInput } from './types';
import {
  MIN_SYMPTOM_OCCURRENCES,
  PATTERN_CONCENTRATION,
  PRIORITY_PATTERN,
} from './types';
import { phaseForDate } from './phase-assignment';

export function generatePatternInsights(input: InsightInput): Insight[] {
  const { dailyLogs, cycles, stats } = input;

  const byTagPhase = new Map<string, Map<CyclePhase, number>>();
  const totals = new Map<string, number>();

  for (const log of dailyLogs) {
    const phase = phaseForDate(log.date, cycles, stats);
    if (!phase) continue;
    for (const tag of [...log.symptoms, ...log.moods]) {
      if (!byTagPhase.has(tag)) byTagPhase.set(tag, new Map());
      const phases = byTagPhase.get(tag)!;
      phases.set(phase, (phases.get(phase) ?? 0) + 1);
      totals.set(tag, (totals.get(tag) ?? 0) + 1);
    }
  }

  const insights: Insight[] = [];
  for (const [tag, phases] of byTagPhase) {
    const total = totals.get(tag) ?? 0;
    if (total < MIN_SYMPTOM_OCCURRENCES) continue;

    let topPhase: CyclePhase | null = null;
    let topCount = 0;
    for (const [phase, count] of phases) {
      if (count > topCount) {
        topCount = count;
        topPhase = phase;
      }
    }
    if (!topPhase || topCount / total < PATTERN_CONCENTRATION) continue;

    insights.push({
      id: `pattern:${tag}:${topPhase}`,
      category: 'pattern',
      severity: 'info',
      priority: PRIORITY_PATTERN,
      title: `${tag} often appears in your ${topPhase} phase`,
      body: `You logged ${tag} ${total} times — ${topCount} of those during your ${topPhase} phase.`,
      detail: 'Based on the days you logged this and the cycle phase each one fell in.',
    });
  }

  insights.sort((a, b) => a.id.localeCompare(b.id));
  return insights;
}
