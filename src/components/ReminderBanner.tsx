'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useHealthData } from '@/src/state/useHealthData';
import { dueReminders } from '@/src/domain/reminders';
import { getReminderPrefs } from '@/src/settings/preferences';
import { fireReminderNotifications } from '@/src/notifications/notify';
import { todayISO } from '@/src/domain/dates';

// The single most relevant reminder for today, shown on Home. Also fires opt-in
// OS notifications for whatever is due (deduped per day inside notify).
export function ReminderBanner() {
  const { prediction, dailyLogs, lifeStage } = useHealthData();
  const today = todayISO();
  const prefs = getReminderPrefs();
  const reminders = dueReminders({ prediction, dailyLogs, lifeStage, today, prefs });

  useEffect(() => {
    if (prefs.notifications && reminders.length > 0) {
      void fireReminderNotifications(reminders, today);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per mount for today's due set
  }, [today, reminders.length]);

  if (reminders.length === 0) return null;
  const top = reminders[0];
  return (
    <Link
      href={top.href}
      className="block rounded-md border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/40"
    >
      <p className="text-sm font-medium text-rose-900 dark:text-rose-100">{top.title}</p>
      <p className="text-xs text-rose-800/80 dark:text-rose-200/80">{top.body}</p>
    </Link>
  );
}
