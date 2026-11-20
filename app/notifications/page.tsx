'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageShell } from '@/src/components/PageShell';
import { LumenIcon } from '@/src/components/LumenIcon';
import { useHealthData } from '@/src/state/useHealthData';
import { dueReminders } from '@/src/domain/reminders';
import { getReminderPrefs } from '@/src/settings/preferences';

export default function NotificationsPage() {
  const { today, prediction, lifeStage, dailyLogs, loading, personalization, updatePersonalization } = useHealthData();
  const reminders = loading ? [] : dueReminders({ today, prediction, lifeStage, dailyLogs, prefs: getReminderPrefs() });
  const reviewed = personalization?.reviewedReminders;
  const unread = reminders.filter(({ kind }) => reviewed?.date !== today || !reviewed.kinds.includes(kind));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function markRead() {
    setSaving(true);
    setError(false);
    try {
      const kinds = new Set(reviewed?.date === today ? reviewed.kinds : []);
      reminders.forEach(({ kind }) => kinds.add(kind));
      await updatePersonalization({ reviewedReminders: { date: today, kinds: [...kinds] } });
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell title="Notifications" eyebrow="Your updates" subtitle="Reminders from your Lumen preferences." backHref={null}>
      <section className="lumen-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="lumen-card-title">Today</h2>
          {unread.length > 0 && <button type="button" className="lumen-text-link" disabled={saving} onClick={markRead}>Mark all as read</button>}
        </div>
        {loading && <p className="lumen-subtitle">Loading…</p>}
        {!loading && reminders.length === 0 && <p className="lumen-subtitle">No reminders due today.</p>}
        {reminders.map((reminder) => (
          <Link href={reminder.href} key={reminder.kind} className="lumen-row">
            <span className="lumen-icon-box"><LumenIcon name={reminder.kind === 'log-today' ? 'heart' : 'calendar'} size={17} /></span>
            <span className="lumen-row-copy">
              <strong>{reminder.title} {unread.includes(reminder) && <span className="lumen-badge">New</span>}</strong>
              <small className="lumen-muted">{reminder.body}</small>
            </span>
            <LumenIcon name="chevron" size={16} />
          </Link>
        ))}
        {error && <p role="alert" className="lumen-note">Couldn’t update your reminders. Please try again.</p>}
      </section>
      <section className="lumen-card">
        <h2 className="lumen-card-title">Only what helps</h2>
        <p className="lumen-subtitle">Choose which reminders appear here.</p>
        <Link href="/settings#reminders" className="lumen-text-link">Your reminder preferences <LumenIcon name="arrow" size={17} /></Link>
      </section>
    </PageShell>
  );
}
