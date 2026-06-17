import type { Insight, InsightInput } from './types';
import { generatePatternInsights } from './patterns';
import { generateTrendInsights } from './trends';
import { generateAnomalyInsights } from './anomalies';
import { generateGuidanceInsights } from './guidance';

function severityRank(s: Insight['severity']): number {
  return s === 'attention' ? 0 : 1;
}

export function generateInsights(input: InsightInput): Insight[] {
  const all = [
    ...generateAnomalyInsights(input),
    ...generatePatternInsights(input),
    ...generateTrendInsights(input),
    ...generateGuidanceInsights(input),
  ];
  return all.sort((a, b) => {
    if (severityRank(a.severity) !== severityRank(b.severity)) {
      return severityRank(a.severity) - severityRank(b.severity);
    }
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.id.localeCompare(b.id);
  });
}

export function topInsight(list: Insight[]): Insight | null {
  return list[0] ?? null;
}
