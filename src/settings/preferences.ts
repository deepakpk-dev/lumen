import type { ISODate, LifeStage } from '@/src/domain/types';

export type BbtUnit = 'C' | 'F';

const LIFESTAGE_KEY = 'lumen.settings.lifeStage';
const BBTUNIT_KEY = 'lumen.settings.bbtUnit';
const TTCSTART_KEY = 'lumen.settings.ttcStartDate';
const REMINDERS_KEY = 'lumen.settings.reminders';

function ls(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function getLifeStage(): LifeStage {
  return (ls()?.getItem(LIFESTAGE_KEY) as LifeStage | null) ?? 'cycle';
}

export function getTtcStartDate(): ISODate | null {
  return ls()?.getItem(TTCSTART_KEY) ?? null;
}

export function setLifeStage(stage: LifeStage, today: ISODate): void {
  const store = ls();
  if (!store) return;
  store.setItem(LIFESTAGE_KEY, stage);
  if (stage === 'ttc') {
    if (!store.getItem(TTCSTART_KEY)) store.setItem(TTCSTART_KEY, today);
  } else {
    store.removeItem(TTCSTART_KEY);
  }
}

export function getBbtUnit(): BbtUnit {
  return (ls()?.getItem(BBTUNIT_KEY) as BbtUnit | null) ?? 'C';
}

export function setBbtUnit(unit: BbtUnit): void {
  ls()?.setItem(BBTUNIT_KEY, unit);
}

export interface ReminderPrefs {
  notifications: boolean; // also fire OS notifications (needs browser permission)
  logReminder: boolean;
  periodReminder: boolean;
  fertileReminder: boolean;
}

// In-app reminders on by default (they only surface when actually due, so they
// don't nag); OS notifications stay off until the user opts in and grants
// permission.
export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  notifications: false,
  logReminder: true,
  periodReminder: true,
  fertileReminder: true,
};

export function getReminderPrefs(): ReminderPrefs {
  const raw = ls()?.getItem(REMINDERS_KEY);
  if (!raw) return DEFAULT_REMINDER_PREFS;
  try {
    return { ...DEFAULT_REMINDER_PREFS, ...(JSON.parse(raw) as Partial<ReminderPrefs>) };
  } catch {
    return DEFAULT_REMINDER_PREFS;
  }
}

export function setReminderPrefs(prefs: ReminderPrefs): void {
  ls()?.setItem(REMINDERS_KEY, JSON.stringify(prefs));
}

export function clearPreferences(): void {
  const store = ls();
  if (!store) return;
  store.removeItem(LIFESTAGE_KEY);
  store.removeItem(BBTUNIT_KEY);
  store.removeItem(TTCSTART_KEY);
  store.removeItem(REMINDERS_KEY);
}
