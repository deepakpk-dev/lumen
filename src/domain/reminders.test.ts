import { describe, it, expect } from 'vitest';
import { dueReminders } from './reminders';
import { DEFAULT_REMINDER_PREFS } from '@/src/settings/preferences';
import type { Prediction } from './types';

const prediction: Prediction = {
  nextPeriodStart: '2026-07-07',
  nextPeriodStartRange: { earliest: '2026-07-05', latest: '2026-07-09' },
  predictedPeriodLength: 5,
  fertileWindow: { start: '2026-06-20', end: '2026-06-25' },
  ovulationDate: '2026-06-23',
  confidence: 'high',
  explanation: 'test',
};

const base = {
  prediction,
  dailyLogs: [],
  lifeStage: 'cycle' as const,
  prefs: DEFAULT_REMINDER_PREFS,
};

describe('dueReminders', () => {
  it('flags an upcoming period within the lookahead window', () => {
    const kinds = dueReminders({ ...base, today: '2026-07-06' }).map((r) => r.kind);
    expect(kinds).toContain('period-soon');
  });

  it('does not flag a period that is still far off', () => {
    const kinds = dueReminders({ ...base, today: '2026-07-01' }).map((r) => r.kind);
    expect(kinds).not.toContain('period-soon');
  });

  it('flags the fertile window and labels the ovulation day', () => {
    const fertile = dueReminders({ ...base, today: '2026-06-21' });
    expect(fertile.find((r) => r.kind === 'fertile-window')?.title).toBe('Fertile window');
    const ovulation = dueReminders({ ...base, today: '2026-06-23' });
    expect(ovulation.find((r) => r.kind === 'fertile-window')?.title).toBe(
      'Estimated ovulation day',
    );
  });

  it('reminds to log when nothing is logged today, and stops once logged', () => {
    const today = '2026-07-01';
    expect(dueReminders({ ...base, today }).map((r) => r.kind)).toContain('log-today');
    const logged = dueReminders({
      ...base,
      today,
      dailyLogs: [{ date: today, flow: 'none', symptoms: [], moods: [] }],
    });
    expect(logged.map((r) => r.kind)).not.toContain('log-today');
  });

  it('respects preference toggles', () => {
    const off = dueReminders({
      ...base,
      today: '2026-06-23',
      prefs: {
        notifications: false,
        logReminder: false,
        periodReminder: false,
        fertileReminder: false,
      },
    });
    expect(off).toEqual([]);
  });

  it('suppresses cycle reminders outside cycle tracking (e.g. pregnancy)', () => {
    const preg = dueReminders({ ...base, today: '2026-06-23', lifeStage: 'pregnancy' });
    expect(preg).toEqual([]);
  });

  it('orders period ahead of fertile ahead of log for the home banner', () => {
    // A day that is both in the fertile window and has no log; period is far off.
    const kinds = dueReminders({ ...base, today: '2026-06-21' }).map((r) => r.kind);
    expect(kinds).toEqual(['fertile-window', 'log-today']);
  });
});
