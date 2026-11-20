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
  { key: 'periodReminder', label: 'Period reminders' },
  { key: 'fertileReminder', label: 'Fertile window reminders' },
  { key: 'logReminder', label: 'Daily log reminder' },
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
      <label className="lumen-choice-row justify-between">
        <span>Show device notifications</span>
        <input
          className="setup-switch"
          role="switch"
          type="checkbox"
          checked={prefs.notifications}
          onChange={(e) => void toggleNotifications(e.target.checked)}
        />
      </label>
      {perm === 'denied' && (
        <p className="lumen-note lumen-warning">
          To see device notifications, allow them for Lumen in your browser settings.
          Your reminders still appear in the app.
        </p>
      )}
      {perm === 'unsupported' && (
        <p className="lumen-help">
          This browser can&apos;t show device notifications. Reminders still show inside the app.
        </p>
      )}
      <div className="lumen-divider border-t pt-2">
        {/* The fertile-window reminder never fires in perimenopause (see
            src/domain/reminders.ts), so don't show a toggle that does nothing. */}
        {TOGGLES.filter((t) => t.key !== 'fertileReminder' || lifeStage !== 'menopause').map((t) => (
          <label key={t.key} className="lumen-choice-row justify-between">
            <span>{t.label}</span>
            <input
              className="setup-switch"
              role="switch"
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
