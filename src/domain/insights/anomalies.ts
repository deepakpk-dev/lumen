import type { Insight, InsightInput } from './types';
import {
  OVERDUE_DAYS,
  SYMPTOM_CLUSTER_COUNT,
  SYMPTOM_CLUSTER_WINDOW,
  PRIORITY_ANOMALY,
} from './types';
import { daysBetween } from '@/src/domain/dates';
import { computeCycleLengths } from '@/src/domain/cycle-stats';

export function generateAnomalyInsights(input: InsightInput): Insight[] {
  const { cycles, dailyLogs, prediction, today } = input;
  const insights: Insight[] = [];

  // Overdue period
  if (prediction) {
    const startedOnOrAfterPredicted = cycles.some(
      (c) => daysBetween(prediction.nextPeriodStart, c.startDate) >= 0,
    );
    const daysLate = daysBetween(prediction.nextPeriodStart, today);
    if (!startedOnOrAfterPredicted && daysLate >= OVERDUE_DAYS) {
      insights.push({
        id: 'anomaly:overdue',
        category: 'anomaly',
        severity: 'attention',
        priority: PRIORITY_ANOMALY,
        title: 'Your period is later than predicted',
        body: `Your period is about ${daysLate} days later than predicted. Cycles naturally vary; if you're concerned, consider checking with a clinician.`,
      });
    }
  }

  // Unusual most-recent cycle length vs the prior norm
  const lengths = computeCycleLengths(cycles);
  if (lengths.length >= 3) {
    const last = lengths[lengths.length - 1];
    const prior = lengths.slice(0, -1);
    const mean = prior.reduce((a, b) => a + b, 0) / prior.length;
    const variance =
      prior.reduce((a, b) => a + (b - mean) ** 2, 0) / prior.length;
    const sd = Math.sqrt(variance);
    const margin = 2 * Math.max(1, Math.round(sd));
    const delta = Math.round(last - mean);
    if (Math.abs(delta) > margin) {
      const longer = delta > 0;
      insights.push({
        id: 'anomaly:cycle-length',
        category: 'anomaly',
        severity: 'attention',
        priority: PRIORITY_ANOMALY,
        title: longer
          ? 'Your last cycle was longer than usual'
          : 'Your last cycle was shorter than usual',
        body: `Your most recent cycle was ${Math.abs(delta)} days ${
          longer ? 'longer' : 'shorter'
        } than your earlier average of ${Math.round(mean)} days. If this is unexpected, consider checking with a clinician.`,
      });
    }
  }

  // Recent symptom cluster
  const distinctRecent = new Set<string>();
  for (const log of dailyLogs) {
    const age = daysBetween(log.date, today);
    if (age >= 0 && age < SYMPTOM_CLUSTER_WINDOW) {
      for (const s of log.symptoms) distinctRecent.add(s);
    }
  }
  if (distinctRecent.size >= SYMPTOM_CLUSTER_COUNT) {
    insights.push({
      id: 'anomaly:symptom-cluster',
      category: 'anomaly',
      severity: 'attention',
      priority: PRIORITY_ANOMALY,
      title: "You've logged several symptoms recently",
      body: `You've logged ${distinctRecent.size} different symptoms in the last ${SYMPTOM_CLUSTER_WINDOW} days. If you're not feeling well, consider checking with a clinician.`,
    });
  }

  return insights;
}
