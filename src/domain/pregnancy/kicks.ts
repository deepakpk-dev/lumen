import type { ISOTimestamp, KickSession } from '@/src/domain/types';

export const KICK_TARGET = 10;

export interface KickSummary {
  count: number;
  elapsedMinutes: number;
  reachedTarget: boolean;
}

export function summarizeKickSession(
  session: KickSession,
  now?: ISOTimestamp,
): KickSummary {
  const count = session.kickTimestamps.length;
  const endIso = session.endedAt ?? now ?? session.startedAt;
  const startMs = new Date(session.startedAt).getTime();
  const endMs = new Date(endIso).getTime();
  const elapsedMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));
  return { count, elapsedMinutes, reachedTarget: count >= KICK_TARGET };
}
