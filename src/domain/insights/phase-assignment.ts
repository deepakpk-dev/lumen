import type { Cycle, CycleStats, CyclePhase, ISODate } from '@/src/domain/types';
import { daysBetween } from '@/src/domain/dates';
import { getCyclePhase } from '@/src/domain/prediction';

export function phaseForDate(
  date: ISODate,
  cycles: Cycle[],
  stats: CycleStats,
): CyclePhase | null {
  const start = cycles
    .map((c) => c.startDate)
    .filter((s) => s <= date)
    .sort((a, b) => a.localeCompare(b))
    .at(-1);
  if (!start) return null;
  const cycleDay = daysBetween(start, date) + 1;
  return getCyclePhase(cycleDay, stats);
}
