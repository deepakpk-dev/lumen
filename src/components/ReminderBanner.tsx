'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useHealthData } from '@/src/state/useHealthData';
import { dueReminders } from '@/src/domain/reminders';
import { getReminderPrefs } from '@/src/settings/preferences';
import { fireReminderNotifications } from '@/src/notifications/notify';
import { todayISO } from '@/src/domain/dates';
import { LumenIcon } from './LumenIcon';

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
      className="lumen-note flex items-center gap-3"
    >
      <LumenIcon name="bell" size={18} />
      <span><strong className="block">{top.title}</strong>{top.body}</span>
    </Link>
  );
}
