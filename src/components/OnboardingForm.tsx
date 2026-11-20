'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { addDays, isValidISODate, parseISODate, toISODate, todayISO } from '@/src/domain/dates';
import type { TrackingGroup } from '@/src/domain/types';
import type { ReminderPrefs } from '@/src/settings/preferences';
import { LumenBrand } from './LumenBrand';
import { LumenIcon, type LumenIconName } from './LumenIcon';
import { OnboardingWelcome } from './OnboardingWelcome';
import { TrackingOptions, trackingOptions } from './TrackingOptions';

export type Goal = 'cycle' | 'ttc' | 'pregnant' | 'postpartum' | 'menopause';
type Step = 'focus' | 'date' | 'cycle' | 'period' | 'tracking' | 'reminders' | 'ready';
const goals: { key: Goal; label: string; hint: string; icon: LumenIconName }[] = [
  { key: 'cycle', label: 'Cycle tracking', hint: 'Log periods and see when your next period may start', icon: 'calendar' },
  { key: 'ttc', label: 'Trying to conceive', hint: 'Log temperature and ovulation tests to track fertility', icon: 'heart' },
  { key: 'pregnant', label: 'Pregnancy', hint: 'Follow your pregnancy week by week', icon: 'spark' },
  { key: 'postpartum', label: 'Postpartum recovery', hint: 'Track bleeding, symptoms, and mood after birth', icon: 'leaf' },
  { key: 'menopause', label: 'Perimenopause', hint: 'Track changes in your periods, sleep, and symptoms', icon: 'wave' },
];
const copy: Record<Step, [string, string, string]> = {
  focus: ['Choose a', 'tracking mode', 'This changes what you can log and what you’ll see on the Today screen.'],
  date: ['When did your', 'last period start?', 'Choose the first day of bleeding. If you’re unsure, you can continue without a date.'],
  cycle: ['How long is your', 'usual cycle?', 'Count from the first day of one period to the first day of the next. An estimate is fine.'],
  period: ['How long does your', 'period usually last?', 'Select the number of days you usually bleed, or continue without choosing.'],
  tracking: ['Choose what to', 'log first', 'These fields appear first in your daily log. You can still use the other fields.'],
  reminders: ['Choose your', 'reminders', 'Reminders appear when you open Lumen. You can leave them off or change them later in Settings.'],
  ready: ['Review your', 'setup', 'Check your choices, then finish setup to start tracking.'],
};
const formatDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });
const formatMonth = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const formatList = new Intl.ListFormat(undefined, { style: 'long', type: 'conjunction' });

function PeriodDatePicker({ value, today, onChange }: { value: string; today: string; onChange: (date: string) => void }) {
  const [month, setMonth] = useState(value || today);
  const current = parseISODate(month);
  const year = current.getFullYear();
  const index = current.getMonth();
  const first = new Date(year, index, 1);
  const blanks = (first.getDay() + 6) % 7;
  const days = new Date(year, index + 1, 0).getDate();
  const shift = (delta: number) => setMonth(toISODate(new Date(year, index + delta, 1)));
  return (
    <div className="lumen-card setup-calendar">
      <div className="flex items-center justify-between gap-2">
        <h2 className="lumen-card-title" aria-live="polite">{formatMonth.format(first)}</h2>
        <div className="flex gap-2">
          <button type="button" className="lumen-icon-button" aria-label="Previous month" onClick={() => shift(-1)}><LumenIcon name="left" size={16} /></button>
          <button type="button" className="lumen-icon-button" aria-label="Next month" disabled={month.slice(0, 7) >= today.slice(0, 7)} onClick={() => shift(1)}><LumenIcon name="chevron" size={16} /></button>
        </div>
      </div>
      <div className="setup-days">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((name) => <span key={name} aria-hidden="true">{name}</span>)}
        {Array.from({ length: blanks }, (_, i) => <span key={`blank-${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = toISODate(new Date(year, index, i + 1));
          return <button key={date} type="button" aria-label={formatDate.format(parseISODate(date))}
            aria-pressed={value === date} aria-current={date === today ? 'date' : undefined}
            disabled={date > today} onClick={() => onChange(date)}>{i + 1}</button>;
        })}
      </div>
      <label className="setup-label" htmlFor="last-period">First day of your last period</label>
      <input className="lumen-field" id="last-period" type="date" value={value} max={today}
        onChange={(event) => {
          const date = event.target.value;
          onChange(date);
          if (isValidISODate(date) && date <= today) setMonth(date);
        }} />
    </div>
  );
}

export function OnboardingForm({ onComplete }: { onComplete: (goal: Goal) => void }) {
  const { completeOnboarding } = useHealthData();
  const [step, setStep] = useState<Step | 'welcome'>('welcome');
  const [goal, setGoal] = useState<Goal>('cycle');
  const [date, setDate] = useState('');
  const [dateUnknown, setDateUnknown] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [lmpMode, setLmpMode] = useState(false);
  const [cycleLength, setCycleLength] = useState<number>();
  const [periodLength, setPeriodLength] = useState<number>();
  const [tracking, setTracking] = useState<TrackingGroup[]>(['mood', 'symptoms']);
  const [reminders, setReminders] = useState({ logReminder: false, periodReminder: false, fertileReminder: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const today = todayISO();
  const pregnant = goal === 'pregnant';
  const postpartum = goal === 'postpartum';
  const tracksCycle = !pregnant && !postpartum;
  const sequence: Step[] = tracksCycle
    ? ['focus', 'date', 'cycle', 'period', 'tracking', 'reminders', 'ready']
    : ['focus', 'date', 'tracking', 'ready'];
  const derivedDueDate = pregnant && lmpMode && isValidISODate(date) ? addDays(date, 280) : '';
  const pregnancyDueDate = lmpMode ? derivedDueDate : dueDate;
  const maxDueDate = addDays(today, 301);
  const validPastDate = (value: string) => isValidISODate(value) && value <= today;
  const dateReady = pregnant ? isValidISODate(pregnancyDueDate) && pregnancyDueDate >= today && pregnancyDueDate <= maxDueDate && (!lmpMode || validPastDate(date))
    : postpartum ? validPastDate(birthDate) : dateUnknown || validPastDate(date);
  const trackingChoices = trackingOptions(goal);
  const selectedTracking = trackingChoices.filter(({ key }) => tracking.includes(key));
  const reminderChoices: { key: keyof typeof reminders; label: string; hint: string; icon: LumenIconName }[] = [
    { key: 'logReminder', label: 'Daily log reminder', hint: 'On days when you haven’t logged anything', icon: 'smile' },
    { key: 'periodReminder', label: 'Period reminders', hint: 'Around your estimated period start', icon: 'calendar' },
    ...(goal === 'menopause' ? [] : [{ key: 'fertileReminder', label: 'Fertile window reminders', hint: 'During your estimated fertile window', icon: 'spark' }] as const),
  ];

  function go(next: Step | 'welcome') {
    setError('');
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || step === 'welcome') return;
    if (step === 'date' && !dateReady) return;
    if (step !== 'ready') {
      go(sequence[sequence.indexOf(step) + 1]);
      return;
    }
    if (!dateReady) { go('date'); return; }
    setSaving(true);
    setError('');
    const chosenReminders: Partial<ReminderPrefs> | undefined = tracksCycle
      ? { ...reminders, fertileReminder: goal !== 'menopause' && reminders.fertileReminder }
      : undefined;
    try {
      await completeOnboarding(goal, {
        date: (tracksCycle && !dateUnknown) || (pregnant && lmpMode) ? date : undefined,
        dueDate: pregnant ? pregnancyDueDate : undefined,
        birthDate: postpartum ? birthDate : undefined,
        cycleLength: tracksCycle ? cycleLength : undefined,
        periodLength: tracksCycle ? periodLength : undefined,
        tracking: selectedTracking.map(({ key }) => key),
        reminders: chosenReminders,
      });
      onComplete(goal);
    } catch {
      setError('Lumen couldn’t save your setup. Your choices are still here. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (step === 'welcome') return <OnboardingWelcome onStart={() => go('focus')} headingRef={headingRef} />;

  const position = sequence.indexOf(step);
  const [title, emphasis, description] = step === 'date' && pregnant
    ? lmpMode
      ? [copy.date[0], copy.date[1], 'Lumen uses this date to estimate your due date.']
      : ['When are you', 'due?', 'Lumen uses this date to show your pregnancy week.']
    : step === 'date' && postpartum
      ? ['When did you', 'give birth?', 'Lumen uses this date to show your recovery week.']
      : copy[step];
  const total = sequence.length - 1;
  const summary = step === 'ready' ? [
    ['Tracking mode', goals.find(({ key }) => key === goal)!.label],
    [pregnant ? 'Due date' : postpartum ? 'Birth date' : 'First day of your last period',
      dateUnknown && tracksCycle ? 'Skipped' : formatDate.format(parseISODate((pregnant ? pregnancyDueDate : postpartum ? birthDate : date) || today))],
    ...(tracksCycle ? [
      ['Usual cycle length', cycleLength ? `${cycleLength} days` : 'Skipped'],
      ['Usual period length', periodLength ? `${periodLength} days` : 'Skipped'],
    ] : []),
    ['First in your daily log', formatList.format(selectedTracking.map(({ label }) => label)) || 'Default order'],
    ...(tracksCycle ? [['Reminders', formatList.format(reminderChoices.filter(({ key }) => reminders[key]).map(({ label }) => label)) || 'Off']] : []),
  ] : [];

  return (
    <main className="lumen-setup">
      <header className="setup-top">
        <LumenBrand href="/onboarding" />
        <button type="button" className="lumen-text-link" onClick={() => go('welcome')}>Back to welcome</button>
      </header>
      <form onSubmit={handleSubmit}>
        {step !== 'ready' && (
          <div className="setup-progress">
            <div className="flex justify-between gap-2"><span>Setup</span><span>{position + 1} of {total}</span></div>
            <progress aria-label="Setup progress" value={position + 1} max={total} />
          </div>
        )}
        <div className="setup-heading">
          {step === 'ready' && <span className="setup-finish"><LumenIcon name="check" size={28} /></span>}
          <h1 className="lumen-title" ref={headingRef} tabIndex={-1}>{title} <em>{emphasis}</em></h1>
          <p className="lumen-subtitle">{description}</p>
        </div>
        {step === 'focus' && (
          <fieldset className="setup-choices">
            <legend className="sr-only">Tracking mode</legend>
            {goals.map(({ key, label, hint, icon }) => (
              <label className="setup-choice" key={key}>
                <span className="lumen-icon-box"><LumenIcon name={icon} /></span>
                <span className="setup-choice-copy"><strong>{label}</strong><small>{hint}</small></span>
                <input type="radio" className="lumen-check" name="goal" value={key} checked={goal === key} onChange={() => setGoal(key)} />
              </label>
            ))}
          </fieldset>
        )}
        {step === 'date' && (postpartum ? (
          <div className="lumen-card"><label className="setup-label" htmlFor="birth-date">Birth date</label>
            <input className="lumen-field" id="birth-date" type="date" value={birthDate} max={today} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
        ) : pregnant && !lmpMode ? (
          <>
            <div className="lumen-card"><label className="setup-label" htmlFor="due-date">Due date</label>
              <input className="lumen-field" id="due-date" type="date" value={dueDate} min={today} max={maxDueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <button type="button" className="lumen-text-link" onClick={() => setLmpMode(true)}>Estimate from your last period</button>
          </>
        ) : (
          <>
            <PeriodDatePicker value={date} today={today} onChange={(value) => { setDate(value); setDateUnknown(false); }} />
            {pregnant ? (
              <>
                {derivedDueDate && <p className="lumen-note mt-3">Estimated due date: {formatDate.format(parseISODate(derivedDueDate))}</p>}
                <button type="button" className="lumen-text-link" onClick={() => setLmpMode(false)}>Enter a due date instead</button>
              </>
            ) : (
              <label className="setup-inline-choice"><input type="checkbox" className="lumen-check" checked={dateUnknown}
                onChange={(event) => { setDateUnknown(event.target.checked); if (event.target.checked) setDate(''); }} /> I’m not sure of the date</label>
            )}
          </>
        ))}
        {step === 'cycle' && (
          <>
            <div className="lumen-card setup-number-card">
              <div className="flex items-center justify-between gap-3">
                <button type="button" className="lumen-icon-button" aria-label="Decrease cycle length" disabled={cycleLength === 20} onClick={() => setCycleLength(Math.max(20, (cycleLength ?? 28) - 1))}>−</button>
                <div><strong className="setup-number">{cycleLength ?? '—'}</strong><p className="lumen-muted text-xs">days on average</p></div>
                <button type="button" className="lumen-icon-button" aria-label="Increase cycle length" disabled={cycleLength === 45} onClick={() => setCycleLength(Math.min(45, (cycleLength ?? 28) + 1))}>+</button>
              </div>
              <input aria-label="Typical cycle length" className="setup-range" type="range" min={20} max={45} value={cycleLength ?? 28} onChange={(e) => setCycleLength(e.target.valueAsNumber)} />
              <div className="flex justify-between text-xs lumen-muted"><span>20 days</span><span>45 days</span></div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[26, 28, 30, 32].map((days) => <button key={days} type="button" className="lumen-chip" aria-pressed={days === cycleLength} onClick={() => setCycleLength(days)}>{days} days</button>)}
              </div>
            </div>
            <button type="button" className="lumen-text-link" onClick={() => setCycleLength(undefined)}>Leave cycle length blank</button>
            <p className="lumen-note">Lumen uses this estimate until you have recorded a complete cycle.</p>
          </>
        )}
        {step === 'period' && (
          <>
            <div className="lumen-card setup-number-card">
              <strong className="setup-number">{periodLength ?? '—'}</strong><p className="lumen-muted text-xs">days on average</p>
              <div className="setup-duration">
                {[2, 3, 4, 5, 6, 7, 8].map((days) => <button key={days} type="button" className="lumen-chip" aria-pressed={days === periodLength} onClick={() => setPeriodLength(days)}>{days}</button>)}
              </div>
            </div>
            <button type="button" className="lumen-text-link" onClick={() => setPeriodLength(undefined)}>Leave period length blank</button>
          </>
        )}
        {step === 'tracking' && <TrackingOptions choices={trackingChoices} selected={tracking} onChange={setTracking} />}
        {step === 'reminders' && (
          <fieldset className="setup-choices">
            <legend className="sr-only">In-app reminders</legend>
            {reminderChoices.map(({ key, label, hint, icon }) => (
              <label className="setup-choice" key={key}>
                <span className="lumen-icon-box"><LumenIcon name={icon} /></span>
                <span className="setup-choice-copy"><strong>{label}</strong><small>{hint}</small></span>
                <input className="setup-switch" type="checkbox" role="switch" checked={reminders[key]} onChange={(e) => setReminders({ ...reminders, [key]: e.target.checked })} />
              </label>
            ))}
          </fieldset>
        )}
        {step === 'ready' && <dl className="lumen-card setup-summary">{summary.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
        {error && <p className="lumen-note mt-3" role="alert">{error}</p>}
        <div className="setup-controls">
          <div className="setup-actions">
            <button className="lumen-outline" type="button" disabled={saving} onClick={() => go(position === 0 ? 'welcome' : sequence[position - 1])}><LumenIcon name="back" size={17} />Back</button>
            <button className="lumen-button" type="submit" disabled={saving || (step === 'date' && !dateReady)}>
              {saving ? 'Saving setup…' : step === 'ready' ? 'Finish setup' : 'Continue'}
              <LumenIcon name={step === 'ready' ? 'check' : 'arrow'} size={17} />
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
