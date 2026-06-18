import type { DailyLog, ISODate, Prediction } from '@/src/domain/types';
import type {
  ConceptionGuidance,
  ConceptionLevel,
  OvulationConfirmation,
} from './types';
import { daysBetween } from '@/src/domain/dates';

const LABEL: Record<ConceptionLevel, string> = {
  high: 'High chance to conceive',
  medium: 'Medium chance to conceive',
  low: 'Low chance to conceive',
};

function mk(date: ISODate, level: ConceptionLevel, reason: string): ConceptionGuidance {
  return { date, level, label: LABEL[level], reason };
}

export function conceptionGuidance(
  date: ISODate,
  prediction: Prediction | null,
  confirmation: OvulationConfirmation | null,
  todaysLog: DailyLog | undefined,
): ConceptionGuidance {
  if (todaysLog?.lh === 'positive') {
    return mk(date, 'high', 'Positive LH test today — ovulation is likely imminent.');
  }
  if (todaysLog?.mucus === 'egg-white') {
    return mk(date, 'high', 'Fertile egg-white mucus today — a peak-fertility sign.');
  }

  const ovDate = confirmation?.ovulationDate ?? prediction?.ovulationDate ?? null;
  if (!ovDate) {
    return mk(date, 'low', 'Not enough data yet to estimate your fertile window.');
  }

  if (confirmation?.status === 'confirmed' && date > confirmation.ovulationDate) {
    return mk(date, 'low', 'Ovulation has passed this cycle.');
  }

  const offset = daysBetween(ovDate, date); // negative = before ovulation
  if (offset === 0 || offset === -1 || offset === -2) {
    return mk(date, 'high', 'You are in your most fertile days.');
  }
  if ((offset <= -3 && offset >= -5) || offset === 1) {
    return mk(date, 'medium', 'You are near your fertile window.');
  }
  return mk(date, 'low', 'You are outside your fertile window today.');
}
