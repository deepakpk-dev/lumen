import type {
  Cycle,
  CycleStats,
  Confidence,
  CyclePhase,
  ISODate,
  Prediction,
} from './types';
import { LUTEAL_PHASE_LENGTH } from './types';
import { addDays } from './dates';
import { computeCycleStats } from './cycle-stats';
import type { OvulationConfirmation } from './fertility/types';

export interface ObservedFertility {
  lutealLength?: number;
  currentCycleOvulation?: OvulationConfirmation;
}

export function predictionConfidence(stats: CycleStats): Confidence {
  const inputCount = stats.inputCycleCount;
  if (stats.cycleCount >= 3 && stats.isRegular) return 'high';
  if (inputCount >= 3 && !stats.isRegular) return 'low';
  if (inputCount >= 1) return 'medium';
  return 'low';
}

export function getCyclePhase(cycleDay: number, stats: CycleStats): CyclePhase {
  const ovulationDay = stats.averageCycleLength - LUTEAL_PHASE_LENGTH;
  if (cycleDay <= stats.averagePeriodLength) return 'menstrual';
  if (cycleDay >= ovulationDay - 1 && cycleDay <= ovulationDay + 1)
    return 'ovulation';
  if (cycleDay < ovulationDay - 1) return 'follicular';
  return 'luteal';
}

function lastStart(cycles: Cycle[]): ISODate {
  return [...cycles]
    .map((c) => c.startDate)
    .sort((a, b) => a.localeCompare(b))
    .at(-1) as ISODate;
}

function buildExplanation(stats: CycleStats, confidence: Confidence): string {
  if (stats.cycleCount === 0) {
    return 'Based on a typical 28-day cycle. Predictions improve as you log more.';
  }
  const base = `Based on your last ${stats.cycleCount} cycle${
    stats.cycleCount === 1 ? '' : 's'
  } (average ${stats.averageCycleLength} days).`;
  if (confidence === 'low') {
    return `${base} Your cycles vary, so this is a wider, low-confidence estimate.`;
  }
  return base;
}

export function generatePrediction(
  cycles: Cycle[],
  _today: ISODate,
  observed?: ObservedFertility,
): Prediction | null {
  if (cycles.length === 0) return null;

  const stats = computeCycleStats(cycles);
  const confidence = predictionConfidence(stats);
  const start = lastStart(cycles);

  const luteal = observed?.lutealLength ?? LUTEAL_PHASE_LENGTH;
  const nextPeriodStart = addDays(start, stats.averageCycleLength);
  const margin = Math.max(1, Math.round(stats.cycleLengthStdDev));

  const refinedOvulation = observed?.currentCycleOvulation?.ovulationDate;
  const ovulationDate = refinedOvulation ?? addDays(nextPeriodStart, -luteal);
  const refined = Boolean(refinedOvulation || observed?.lutealLength);

  return {
    nextPeriodStart,
    nextPeriodStartRange: {
      earliest: addDays(nextPeriodStart, -margin),
      latest: addDays(nextPeriodStart, margin),
    },
    predictedPeriodLength: stats.averagePeriodLength,
    fertileWindow: {
      start: addDays(ovulationDate, -5),
      end: addDays(ovulationDate, 1),
    },
    ovulationDate,
    confidence,
    explanation: refined
      ? `${buildExplanation(stats, confidence)} Refined using your logged ovulation signals.`
      : buildExplanation(stats, confidence),
  };
}
