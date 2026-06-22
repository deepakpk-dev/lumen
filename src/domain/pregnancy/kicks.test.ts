import { describe, it, expect } from 'vitest';
import { summarizeKickSession, KICK_TARGET } from './kicks';
import type { KickSession } from '@/src/domain/types';

function ts(min: number): string {
  return new Date(Date.UTC(2026, 5, 21, 10, min, 0)).toISOString();
}

describe('summarizeKickSession', () => {
  it('counts kicks and reaches the target at 10', () => {
    const session: KickSession = {
      id: 'k1',
      date: '2026-06-21',
      startedAt: ts(0),
      kickTimestamps: Array.from({ length: 10 }, (_, i) => ts(i)),
      endedAt: ts(9),
    };
    const s = summarizeKickSession(session);
    expect(KICK_TARGET).toBe(10);
    expect(s.count).toBe(10);
    expect(s.elapsedMinutes).toBe(9);
    expect(s.reachedTarget).toBe(true);
  });

  it('uses `now` for an unfinished session', () => {
    const session: KickSession = {
      id: 'k2',
      date: '2026-06-21',
      startedAt: ts(0),
      kickTimestamps: [ts(1), ts(2)],
    };
    const s = summarizeKickSession(session, ts(5));
    expect(s.count).toBe(2);
    expect(s.elapsedMinutes).toBe(5);
    expect(s.reachedTarget).toBe(false);
  });
});
