import type { Contraction, ISOTimestamp } from '@/src/domain/types';

const ms = (iso: ISOTimestamp): number => new Date(iso).getTime();

export function contractionDurationSeconds(c: Contraction): number | null {
  if (!c.end) return null;
  return Math.max(0, Math.round((ms(c.end) - ms(c.start)) / 1000));
}

export function contractionFrequencyMinutes(contractions: Contraction[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < contractions.length; i++) {
    out.push((ms(contractions[i].start) - ms(contractions[i - 1].start)) / 60000);
  }
  return out;
}

export interface FiveOneOneStatus {
  meetsCriteria: boolean;
  message: string;
}

const ADVISE = 'Your contractions match a 5-1-1 pattern. Consider contacting your provider or birth team.';
const KEEP_TRACKING = 'Keep tracking your contractions. This is informational only — contact your provider with any concerns.';

// Educational 5-1-1: contractions ~5 min apart, lasting ~1 min, sustained for ~1 hour.
// Non-diagnostic. Looks only at the trailing 60 minutes before `now`.
export function fiveOneOneStatus(
  contractions: Contraction[],
  now: ISOTimestamp,
): FiveOneOneStatus {
  const nowMs = ms(now);
  const windowStart = nowMs - 60 * 60000;
  const recent = contractions.filter((c) => ms(c.start) >= windowStart);

  if (recent.length < 2) return { meetsCriteria: false, message: KEEP_TRACKING };

  const span = ms(recent[recent.length - 1].start) - ms(recent[0].start);
  const intervals = contractionFrequencyMinutes(recent);
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const durations = recent
    .map(contractionDurationSeconds)
    .filter((d): d is number => d !== null);
  const avgDuration = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  const meetsCriteria =
    span >= 55 * 60000 && // sustained ~1 hour
    avgInterval <= 5 && // ~5 minutes apart
    avgDuration >= 60; // ~1 minute long

  return { meetsCriteria, message: meetsCriteria ? ADVISE : KEEP_TRACKING };
}
