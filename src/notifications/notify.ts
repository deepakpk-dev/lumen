'use client';

import type { ISODate } from '@/src/domain/types';
import type { Reminder } from '@/src/domain/reminders';

export type NotifyPermission = 'default' | 'granted' | 'denied' | 'unsupported';

function supported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotifyPermission {
  return supported() ? Notification.permission : 'unsupported';
}

export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (!supported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

// ponytail: a local-only PWA has no push server, so reminders can only fire
// while the app is open (we fire on home mount). True background delivery would
// need either a push server — which breaks the local-first privacy model — or
// the experimental Notification Triggers API. Dedupe per kind per day so opening
// the app repeatedly doesn't re-notify.
const FIRED_KEY = 'lumen.notify.fired';

function firedToday(today: ISODate): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { date: string; kinds: string[] };
      if (parsed.date === today) return new Set(parsed.kinds);
    }
  } catch {
    /* corrupt/absent — treat as nothing fired yet */
  }
  return new Set();
}

function markFired(today: ISODate, kinds: Set<string>): void {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify({ date: today, kinds: [...kinds] }));
  } catch {
    /* storage full/blocked — best effort */
  }
}

export async function fireReminderNotifications(
  reminders: Reminder[],
  today: ISODate,
): Promise<void> {
  if (!supported() || Notification.permission !== 'granted') return;
  const fired = firedToday(today);
  const pending = reminders.filter((r) => !fired.has(r.kind));
  if (pending.length === 0) return;

  // showNotification via the service worker is more reliable on mobile; fall
  // back to the constructor when there's no active worker (e.g. dev).
  const reg =
    'serviceWorker' in navigator
      ? await navigator.serviceWorker.getRegistration()
      : undefined;

  for (const r of pending) {
    try {
      if (reg) {
        await reg.showNotification(r.title, {
          body: r.body,
          tag: `lumen-${r.kind}`,
          data: { href: r.href },
        });
      } else {
        new Notification(r.title, { body: r.body, tag: `lumen-${r.kind}` });
      }
      fired.add(r.kind);
    } catch {
      /* one notification failing shouldn't block the rest */
    }
  }
  markFired(today, fired);
}
