import type { Cycle, ISODate } from '@/src/domain/types';

export const TTC_RESOURCE_THRESHOLD = 6;

export function countTtcCycles(
  cycles: Cycle[],
  ttcStartDate: ISODate | null,
): number {
  if (!ttcStartDate) return 0;
  return cycles.filter((c) => c.startDate >= ttcStartDate).length;
}

export function shouldShowResourceNote(
  cycles: Cycle[],
  ttcStartDate: ISODate | null,
): boolean {
  return countTtcCycles(cycles, ttcStartDate) >= TTC_RESOURCE_THRESHOLD;
}
