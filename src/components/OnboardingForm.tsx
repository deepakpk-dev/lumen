'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useHealthData } from '@/src/state/useHealthData';
import { todayISO } from '@/src/domain/dates';

export type Goal = 'cycle' | 'ttc' | 'pregnant';

// Shared stroke style so the goal glyphs match the icon language established on
// the intro screen (thin outline, rounded joins).
const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

// One glyph per goal: a droplet for cycle, a sprout for conceiving, a heart for
// pregnancy. Decorative only — the button's label/hint text carries the meaning.
const goalIcon: Record<Goal, ReactNode> = {
  cycle: (
    <svg aria-hidden="true" {...iconProps}>
      <path d="M12 3s6 6.4 6 10a6 6 0 0 1-12 0c0-3.6 6-10 6-10z" />
    </svg>
  ),
  ttc: (
    <svg aria-hidden="true" {...iconProps}>
      <path d="M12 21v-7" />
      <path d="M12 14c0-3 2-5 5-5 0 3-2 5-5 5z" />
      <path d="M12 14c0-2.6-1.8-4.5-4.5-4.5 0 2.6 1.8 4.5 4.5 4.5z" />
    </svg>
  ),
  pregnant: (
    <svg aria-hidden="true" {...iconProps}>
      <path d="M12 20s-6.5-4.2-6.5-9A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 6.5 4c0 4.8-6.5 9-6.5 9z" />
    </svg>
  ),
};

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function OnboardingForm({ onComplete }: { onComplete: (goal: Goal) => void }) {
  const { startPeriod, startPregnancyMode, setTtcMode } = useHealthData();
  const [step, setStep] = useState<'intro' | 'setup'>('intro');
  const [goal, setGoal] = useState<Goal>('cycle');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The required date depends on the goal; bail if it's missing so a stray
    // submit can't seed a cycle off an empty date or route onward without setup.
    if (goal === 'pregnant' ? !dueDate : !date) return;
    setSaving(true);
    if (goal === 'pregnant') {
      await startPregnancyMode({ dueDate });
    } else {
      // Both cycle and TTC need a seeded cycle so predictions and the fertile
      // window work from day one; TTC additionally switches on fertility mode.
      await startPeriod(date);
      if (goal === 'ttc') setTtcMode(true);
    }
    setSaving(false);
    onComplete(goal);
  }

  const goalOptions: { value: Goal; label: string; hint: string }[] = [
    { value: 'cycle', label: 'Track my cycle', hint: 'Periods, symptoms, and predictions' },
    { value: 'ttc', label: 'Trying to conceive', hint: 'Fertile window, BBT, and ovulation' },
    { value: 'pregnant', label: "I'm pregnant", hint: 'Week-by-week, kicks, and contractions' },
  ];

  if (step === 'intro') {
    // Full-bleed gradient welcome. Rendered as a fixed overlay so it covers the
    // app's global footer (which would clash on the gradient) and supplies its
    // own privacy link. Tapping Continue swaps to the unchanged setup step, at
    // which point this unmounts and the normal layout (incl. footer) returns.
    return (
      <div
        className="lumen-welcome fixed inset-0 z-50 overflow-y-auto text-white"
        style={{
          background: 'linear-gradient(160deg, #e11d48, #9f1239 72%)',
          fontFamily: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          paddingTop: 'calc(env(safe-area-inset-top) + 28px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
          paddingLeft: 'calc(env(safe-area-inset-left) + 24px)',
          paddingRight: 'calc(env(safe-area-inset-right) + 24px)',
        }}
      >
        <style>{`
          .lumen-welcome .lumen-fade { animation: lumen-fade-in .5s ease-out both; }
          @keyframes lumen-fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: none; }
          }
          @media (prefers-reduced-motion: reduce) {
            .lumen-welcome .lumen-fade { animation: none; }
          }
        `}</style>

        <div className="lumen-fade mx-auto flex min-h-full w-full max-w-md flex-col">
          {/* Wordmark */}
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="h-[22px] w-[22px] rounded-full"
              style={{
                background: 'radial-gradient(circle at 32% 30%, #fff, #ffd7df 60%, #fbb6c4)',
                boxShadow: '0 0 16px rgba(255,255,255,0.55)',
              }}
            />
            <span className="text-[15px] font-bold tracking-[0.18em]">LUMEN</span>
          </div>

          {/* Heading */}
          <div className="mt-12">
            <h1 className="text-[34px] font-bold leading-10 tracking-[-0.5px]">Welcome to Lumen</h1>
            <p className="mt-3 text-[17px] leading-6 text-white/90">
              A private space to track your cycle, pregnancy, and recovery.
            </p>
          </div>

          {/* Benefits */}
          <ul className="mt-9 space-y-5">
            <li className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="11" width="16" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <p className="text-[15px] leading-[22px]">
                <span className="font-semibold">Your data stays on this device.</span> Nothing is
                uploaded — no accounts, no tracking.
              </p>
            </li>
            <li className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l7 3v5c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6l7-3z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </span>
              <p className="text-[15px] leading-[22px]">
                <span className="font-semibold">It&apos;s not medical advice.</span> Lumen is for
                self-tracking and general information — it is not a contraceptive and not a
                substitute for professional care.
              </p>
            </li>
          </ul>

          {/* Spacer pushes the CTA to the bottom on tall screens; collapses (and
              the screen scrolls) on short ones. */}
          <div className="flex-1" aria-hidden="true" />

          {/* CTA */}
          <button
            type="button"
            onClick={() => setStep('setup')}
            className="mt-10 w-full rounded-xl bg-white px-4 py-3.5 text-base font-semibold text-[#9f1239] shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition hover:bg-white/95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-rose-700"
          >
            Continue
          </button>

          {/* Privacy link (in-gradient; replaces the global footer that this
              overlay covers) */}
          <p className="mt-4 text-center">
            <Link
              href="/privacy"
              className="rounded text-[13px] text-white/80 underline underline-offset-2 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-rose-700"
            >
              Privacy &amp; your data →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // The button stays disabled until the goal's required date is set; this same
  // flag drives the visible reason below it, so an inactive button never reads
  // as a broken one.
  const missingDate = goal === 'pregnant' ? !dueDate : !date;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-6 p-6">
      {/* Carry the intro's wordmark into setup so the two screens read as one
          flow, and signal that setup is the last thing between them and the app. */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-rose-600" />
          <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
            Lumen
          </span>
        </div>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">Step 2 of 2</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Let&apos;s set things up</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          A few quick details, then you&apos;re in.
        </p>
      </div>

      <fieldset className="space-y-2.5 text-sm">
        <legend className="mb-2 block font-medium">What brings you to Lumen?</legend>
        {goalOptions.map((o) => {
          const selected = goal === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={selected}
              onClick={() => setGoal(o.value)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                selected
                  ? 'border-rose-600 bg-rose-50 dark:border-rose-500 dark:bg-rose-950/40'
                  : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  selected
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                }`}
              >
                {goalIcon[o.value]}
              </span>
              <span className="flex-1">
                <span
                  className={`block font-medium ${selected ? 'text-rose-900 dark:text-rose-100' : ''}`}
                >
                  {o.label}
                </span>
                <span
                  className={`block text-xs ${selected ? 'text-rose-700/80 dark:text-rose-300/80' : 'text-neutral-500 dark:text-neutral-400'}`}
                >
                  {o.hint}
                </span>
              </span>
              {selected && (
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 text-rose-600 dark:text-rose-300"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              )}
            </button>
          );
        })}
      </fieldset>

      {goal !== 'pregnant' ? (
        <div className="space-y-2">
          <label htmlFor="last-period" className="block text-sm font-medium">
            When did your last period start?
          </label>
          <input
            id="last-period"
            aria-label="last period start"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 [color-scheme:light] focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-neutral-700 dark:bg-transparent dark:[color-scheme:dark]"
          />
          <p className="flex items-start gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <LockIcon />
            <span>The first day of your most recent period. Not sure? Your best guess is fine.</span>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <label htmlFor="due-date" className="block text-sm font-medium">
            What is your due date?
          </label>
          <input
            id="due-date"
            aria-label="due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 [color-scheme:light] focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-neutral-700 dark:bg-transparent dark:[color-scheme:dark]"
          />
          <p className="flex items-start gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <LockIcon />
            <span>Your estimated due date — you can adjust it anytime.</span>
          </p>
        </div>
      )}

      <div className="space-y-2">
        <button
          type="submit"
          disabled={saving || missingDate}
          className={`w-full rounded-xl px-4 py-3.5 font-semibold transition ${
            saving || missingDate
              ? 'cursor-not-allowed bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
              : 'bg-rose-600 text-white shadow-[0_8px_24px_rgba(225,29,72,0.25)] hover:bg-rose-700 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2'
          }`}
        >
          Get started
        </button>
        {missingDate && (
          <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
            {goal === 'pregnant'
              ? 'Pick your due date to continue'
              : 'Pick your last period date to continue'}
          </p>
        )}
      </div>
    </form>
  );
}
