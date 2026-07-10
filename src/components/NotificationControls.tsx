'use client';

import { useEffect, useState } from 'react';
import {
  getReminderPrefs,
  setReminderPrefs,
  type ReminderPrefs,
} from '@/src/settings/preferences';
import {
  notificationPermission,
  requestNotificationPermission,
  type NotifyPermission,
} from '@/src/notifications/notify';
import { useHealthData } from '@/src/state/useHealthData';

const TOGGLES: { key: keyof ReminderPrefs; label: string }[] = [
  { key: 'periodReminder', label: 'Period is coming up' },
  { key: 'fertileReminder', label: 'Fertile window & ovulation' },
  { key: 'logReminder', label: 'Reminder to log today' },
];

export function NotificationControls() {
  const { lifeStage } = useHealthData();
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  const [perm, setPerm] = useState<NotifyPermission>('default');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage / browser on mount
    setPrefs(getReminderPrefs());
    setPerm(notificationPermission());
  }, []);

  if (!prefs) return null;

  function update(patch: Partial<ReminderPrefs>) {
    const next = { ...prefs!, ...patch };
    setPrefs(next);
    setReminderPrefs(next);
  }

  async function toggleNotifications(on: boolean) {
    if (on) {
      const p = await requestNotificationPermission();
      setPerm(p);
      if (p !== 'granted') {
        update({ notifications: false });
        return;
      }
    }
    update({ notifications: on });
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Show device notifications</span>
        <input
          type="checkbox"
          checked={prefs.notifications}
          onChange={(e) => void toggleNotifications(e.target.checked)}
        />
      </label>
      {perm === 'denied' && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Notifications are blocked in your browser settings. Reminders still show inside the app.
        </p>
      )}
      {perm === 'unsupported' && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          This browser can&apos;t show device notifications. Reminders still show inside the app.
        </p>
      )}
      <div className="space-y-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        {/* The fertile-window reminder never fires in perimenopause (see
            src/domain/reminders.ts), so don't show a toggle that does nothing. */}
        {TOGGLES.filter((t) => t.key !== 'fertileReminder' || lifeStage !== 'menopause').map((t) => (
          <label key={t.key} className="flex items-center justify-between gap-3 text-sm">
            <span>{t.label}</span>
            <input
              type="checkbox"
              checked={prefs[t.key]}
              onChange={(e) => update({ [t.key]: e.target.checked })}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
