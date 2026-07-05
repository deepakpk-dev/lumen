import type { DailyLog, ISODate, LifeStage, Prediction } from './types';
import { daysBetween } from './dates';
import type { ReminderPrefs } from '@/src/settings/preferences';

export type ReminderKind = 'period-soon' | 'fertile-window' | 'log-today';

export interface Reminder {
  kind: ReminderKind;
  title: string;
  body: string;
  href: string;
}

// Start reminding this many days before a predicted period start.
const PERIOD_LOOKAHEAD_DAYS = 2;

// Which reminders are due today, from local data only. Ordered by priority so
// the first element is the one worth surfacing on the home banner. Period and
// fertile reminders only apply while tracking a cycle (cycle/TTC) — pregnancy
// and postpartum have their own hubs and shouldn't get period nudges.
export function dueReminders(input: {
  prediction: Prediction | null;
  dailyLogs: DailyLog[];
  lifeStage: LifeStage;
  today: ISODate;
  prefs: ReminderPrefs;
}): Reminder[] {
  const { prediction, dailyLogs, lifeStage, today, prefs } = input;
  const cycleTracking = lifeStage === 'cycle' || lifeStage === 'ttc';
  const reminders: Reminder[] = [];

  if (prefs.periodReminder && cycleTracking && prediction) {
    const days = daysBetween(today, prediction.nextPeriodStart);
    if (days >= 0 && days <= PERIOD_LOOKAHEAD_DAYS) {
      reminders.push({
        kind: 'period-soon',
        title: 'Period expected soon',
        body:
          days === 0
            ? 'Your period is expected today.'
            : `Your period is expected in ${days} day${days === 1 ? '' : 's'}.`,
        href: '/calendar',
      });
    }
  }

  if (prefs.fertileReminder && cycleTracking && prediction) {
    const { start, end } = prediction.fertileWindow;
    if (today >= start && today <= end) {
      const onOvulation = today === prediction.ovulationDate;
      reminders.push({
        kind: 'fertile-window',
        title: onOvulation ? 'Estimated ovulation day' : 'Fertile window',
        body: onOvulation
          ? 'Today is your estimated ovulation day.'
          : 'You are in your estimated fertile window.',
        href: lifeStage === 'ttc' ? '/fertility' : '/calendar',
      });
    }
  }

  if (prefs.logReminder && cycleTracking && !dailyLogs.some((l) => l.date === today)) {
    reminders.push({
      kind: 'log-today',
      title: 'Log today',
      body: "You haven't logged anything today.",
      href: '/log',
    });
  }

  return reminders;
}
