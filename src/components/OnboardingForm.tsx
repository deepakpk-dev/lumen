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
  { key: 'cycle', label: 'Track my cycle', hint: 'Understand your pattern over time', icon: 'calendar' },
  { key: 'ttc', label: 'Trying to conceive', hint: 'Explore cycle and fertility signals', icon: 'heart' },
  { key: 'pregnant', label: "I'm pregnant", hint: 'A little support, week by week', icon: 'spark' },
  { key: 'postpartum', label: 'Postpartum recovery', hint: 'Make space for your recovery', icon: 'leaf' },
  { key: 'menopause', label: 'Navigating perimenopause', hint: 'Understand your changing rhythm', icon: 'wave' },
];
const copy: Record<Step, [string, string, string, string]> = {
  focus: ['First, the important part', 'What brings you', 'here?', 'We’ll shape your experience around what matters to you right now.'],
  date: ['Your cycle basics', 'When did your last', 'period start?', 'Choose the first day of your most recent period. It’s okay if you’re unsure.'],
  cycle: ['Everyone is different', 'How long is your', 'cycle?', 'Count from the first day of one period to the first day of the next. An estimate is fine.'],
  period: ['One more detail', 'How long does your', 'period last?', 'Think about the number of days you typically bleed. You can skip this if you’re unsure.'],
  tracking: ['Make it yours', 'What would you like to', 'track?', 'Your choices appear first in your daily check-in. You can still use the other fields whenever you want.'],
  reminders: ['Only if you want', 'Would you like', 'reminders?', 'Choose the reminders you want to see when you open Lumen. You can change them in Settings.'],
  ready: ['All set, your way', 'A beautiful place to', 'begin.', 'Your choices are ready. You can change them from My space.'],
};
const formatDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });
const formatMonth = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

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
      <input className="lumen-field" id="last-period" aria-label="last period start" type="date" value={value} max={today}
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
    { key: 'logReminder', label: 'Daily check-in', hint: 'A gentle moment to log how you feel', icon: 'smile' },
    { key: 'periodReminder', label: 'Period reminders', hint: 'A heads-up near an estimated start date', icon: 'calendar' },
    ...(goal === 'menopause' ? [] : [{ key: 'fertileReminder', label: 'Fertile window', hint: 'A reminder when your estimate is coming up', icon: 'spark' }] as const),
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
  const [eyebrow, title, emphasis, description] = step === 'date' && (pregnant || postpartum)
    ? ['Your journey', 'A little about', 'your dates.', pregnant ? 'Enter your estimated due date or the date your last period began.' : 'Choose the date you gave birth to see your recovery timeline.']
    : copy[step];
  const total = sequence.length - 1;
  const summary = step === 'ready' ? [
    ['Your focus', goals.find(({ key }) => key === goal)!.label],
    [pregnant ? 'Due date' : postpartum ? 'Birth date' : 'Last period start',
      dateUnknown && tracksCycle ? 'Not sure yet' : formatDate.format(parseISODate((pregnant ? pregnancyDueDate : postpartum ? birthDate : date) || today))],
    ...(tracksCycle ? [
      ['Typical cycle', cycleLength ? `${cycleLength} days` : 'Not sure yet'],
      ['Period duration', periodLength ? `${periodLength} days` : 'Not sure yet'],
    ] : []),
    ['Tracking', selectedTracking.map(({ label }) => label).join(', ') || 'No fields prioritized'],
    ...(tracksCycle ? [['Reminders', reminderChoices.filter(({ key }) => reminders[key]).map(({ label }) => label).join(', ') || 'Off']] : []),
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
            <div className="flex justify-between gap-2"><span>Personalize your experience</span><span>{position + 1} of {total}</span></div>
            <progress aria-label="Setup progress" value={position + 1} max={total} />
          </div>
        )}
        <div className="setup-heading">
          {step === 'ready' && <span className="setup-finish"><LumenIcon name="check" size={28} /></span>}
          <p className="lumen-eyebrow">{eyebrow}</p>
          <h1 className="lumen-title" ref={headingRef} tabIndex={-1}>{title} <em>{emphasis}</em></h1>
          <p className="lumen-subtitle">{description}</p>
        </div>
        {step === 'focus' && (
          <fieldset className="setup-choices">
            <legend className="sr-only">What brings you to Lumen?</legend>
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
            <button type="button" className="lumen-text-link" onClick={() => setLmpMode(true)}>Not sure? Enter your last period instead</button>
          </>
        ) : (
          <>
            <PeriodDatePicker value={date} today={today} onChange={(value) => { setDate(value); setDateUnknown(false); }} />
            {pregnant ? (
              <>
                {derivedDueDate && <p className="lumen-note mt-3">Estimated due date: {formatDate.format(parseISODate(derivedDueDate))}</p>}
                <button type="button" className="lumen-text-link" onClick={() => setLmpMode(false)}>I know my due date</button>
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
            <button type="button" className="lumen-text-link" onClick={() => setCycleLength(undefined)}>My cycle varies / I’m not sure</button>
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
            <button type="button" className="lumen-text-link" onClick={() => setPeriodLength(undefined)}>I’m not sure yet</button>
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
              {saving ? 'Setting up…' : step === 'ready' ? 'Finish setup' : step === sequence.at(-2) ? 'See my summary' : 'Continue'}
              <LumenIcon name={step === 'ready' ? 'check' : 'arrow'} size={17} />
            </button>
          </div>
          <p><LumenIcon name="lock" size={13} /> Stored on this device, with optional encrypted sync</p>
        </div>
      </form>
    </main>
  );
}
