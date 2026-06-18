import type { Cycle } from '@/src/domain/types';
import type { OvulationConfirmation } from './types';
import { daysBetween } from '@/src/domain/dates';

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const m =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Math.round(m);
}

export function estimateLutealLength(
  confirmations: OvulationConfirmation[],
  cycles: Cycle[],
): number | null {
  const sorted = [...cycles].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
  const intervals: number[] = [];
  for (const conf of confirmations) {
    if (conf.status !== 'confirmed') continue;
    const idx = sorted.findIndex((c) => c.id === conf.cycleId);
    const next = idx >= 0 ? sorted[idx + 1] : undefined;
    if (!next) continue;
    const days = daysBetween(conf.ovulationDate, next.startDate);
    if (days > 0) intervals.push(days);
  }
  if (intervals.length < 2) return null;
  return median(intervals);
}
