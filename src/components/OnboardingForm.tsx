'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useHealthData } from '@/src/state/useHealthData';
import { addDays, parseISODate, todayISO } from '@/src/domain/dates';

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
  const { completeOnboarding } = useHealthData();
  const [step, setStep] = useState<'intro' | 'setup'>('intro');
  const [goal, setGoal] = useState<Goal>('cycle');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  // Pregnant users often know their last period, not their due date; this
  // toggles the due-date field to a last-period field and derives the due date.
  const [lmpMode, setLmpMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Which date the goal needs: the due date, unless the user is entering their
  // last period instead (always, for non-pregnant goals).
  const askingForPeriod = goal !== 'pregnant' || lmpMode;
  const missingDate = askingForPeriod ? !date : !dueDate;
  // Naegele's rule: due date = last period + 280 days.
  const derivedDueDate = goal === 'pregnant' && lmpMode && date ? addDays(date, 280) : '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The required date depends on the goal; bail if it's missing so a stray
    // submit can't seed a cycle off an empty date or route onward without setup.
    if (missingDate) return;
    setSaving(true);
    // One call seeds the goal's data, sets its life stage, and clears any prior
    // stage — so re-onboarding (or onboarding after a wipe) lands cleanly.
    await completeOnboarding(goal, { date, dueDate: derivedDueDate || dueDate });
    setSaving(false);
    onComplete(goal);
  }

  // Arrow-key navigation for the goal radiogroup: move selection and focus.
  function handleGoalKeyDown(e: React.KeyboardEvent) {
    const dir =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? 1
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? -1
          : 0;
    if (!dir) return;
    e.preventDefault();
    const i = goalOptions.findIndex((o) => o.value === goal);
    const next = goalOptions[(i + dir + goalOptions.length) % goalOptions.length].value;
    setGoal(next);
    document.getElementById(`goal-${next}`)?.focus();
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
          // Aurora glows layered over the brand gradient for depth.
          background:
            'radial-gradient(60% 45% at 80% -5%, rgba(255,255,255,0.14), transparent 60%), radial-gradient(50% 40% at 10% 108%, rgba(253,164,175,0.25), transparent 65%), linear-gradient(160deg, #e11d48, #9f1239 72%)',
          fontFamily: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          paddingTop: 'calc(env(safe-area-inset-top) + 28px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
          paddingLeft: 'calc(env(safe-area-inset-left) + 24px)',
          paddingRight: 'calc(env(safe-area-inset-right) + 24px)',
        }}
      >
        <style>{`
          /* Staggered entrance matching the setup step's rhythm. */
          .lumen-welcome .lumen-fade {
            opacity: 0;
            animation: lumen-fade-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
          }
          .lumen-welcome [data-in='1'] { animation-delay: 0.03s; }
          .lumen-welcome [data-in='2'] { animation-delay: 0.12s; }
          .lumen-welcome [data-in='3'] { animation-delay: 0.22s; }
          .lumen-welcome [data-in='4'] { animation-delay: 0.34s; }
          @keyframes lumen-fade-in {
            from { opacity: 0; transform: translateY(14px); }
            to   { opacity: 1; transform: none; }
          }
          @media (prefers-reduced-motion: reduce) {
            .lumen-welcome .lumen-fade { animation: none; opacity: 1; }
          }
        `}</style>

        <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
          {/* Wordmark */}
          <div className="lumen-fade flex items-center gap-2.5" data-in="1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon.svg"
              alt=""
              aria-hidden="true"
              className="h-[26px] w-[26px] rounded-[7px]"
              style={{ boxShadow: '0 0 16px rgba(255,255,255,0.35)' }}
            />
            <span className="text-[15px] font-bold tracking-[0.18em]">LUMEN</span>
          </div>

          {/* Heading */}
          <div className="lumen-fade mt-12" data-in="2">
            <h1 className="bg-gradient-to-br from-white via-white to-rose-200 bg-clip-text text-[34px] font-bold leading-10 tracking-[-0.5px] text-transparent">
              Welcome to Lumen
            </h1>
            <p className="mt-3 text-[17px] leading-6 text-white/90">
              A private space to track your cycle, pregnancy, and recovery.
            </p>
          </div>

          {/* Benefits */}
          <ul className="lumen-fade mt-9 space-y-5" data-in="3">
            <li className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.12)] ring-1 ring-white/25 backdrop-blur-sm"
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
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.12)] ring-1 ring-white/25 backdrop-blur-sm"
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
            className="lumen-fade group mt-10 w-full rounded-2xl bg-white px-4 py-4 text-base font-semibold text-[#9f1239] shadow-[0_12px_36px_rgba(0,0,0,0.25)] transition-all duration-200 hover:shadow-[0_16px_44px_rgba(0,0,0,0.3)] hover:brightness-[1.02] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-rose-700"
            data-in="4"
          >
            <span className="flex items-center justify-center gap-2">
              Continue
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </span>
          </button>

          {/* Returning users: backups and sync restore both live in Settings.
              Surfaced here so a new phone doesn't have to onboard from scratch
              first (design doc §6). */}
          <p className="lumen-fade mt-4 text-center" data-in="4">
            <Link
              href="/settings"
              className="rounded text-[13px] text-white/80 underline underline-offset-2 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-rose-700"
            >
              Already use Lumen? Restore your data
            </Link>
          </p>

          {/* Privacy link (in-gradient; replaces the global footer that this
              overlay covers) */}
          <p className="lumen-fade mt-2 text-center" data-in="4">
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

  // Due dates live in a known window (today .. ~43 weeks out); constrain the
  // picker so a typo can't set a past or absurd date.
  const today = todayISO();

  return (
    <div className="lumen-setup relative isolate">
      <style>{`
        /* Ambient rose wash echoing the intro's gradient, so setup feels like
           the welcome screen receding rather than a cold form. */
        .lumen-aurora {
          background:
            radial-gradient(55% 75% at 15% 0%, rgba(244, 63, 94, 0.14), transparent 62%),
            radial-gradient(45% 60% at 85% 4%, rgba(236, 72, 153, 0.10), transparent 60%),
            radial-gradient(70% 55% at 50% -12%, rgba(255, 228, 230, 0.65), transparent 72%);
        }
        @media (prefers-color-scheme: dark) {
          .lumen-aurora {
            background:
              radial-gradient(55% 75% at 15% 0%, rgba(244, 63, 94, 0.16), transparent 62%),
              radial-gradient(45% 60% at 85% 4%, rgba(236, 72, 153, 0.12), transparent 60%);
          }
        }
        /* Staggered entrance: each section rises in sequence. */
        .lumen-setup .lumen-in {
          opacity: 0;
          animation: lumen-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .lumen-setup [data-in='1'] { animation-delay: 0.03s; }
        .lumen-setup [data-in='2'] { animation-delay: 0.1s; }
        .lumen-setup [data-in='3'] { animation-delay: 0.18s; }
        .lumen-setup [data-in='4'] { animation-delay: 0.27s; }
        .lumen-setup [data-in='5'] { animation-delay: 0.36s; }
        @keyframes lumen-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: none; }
        }
        .lumen-check-pop { animation: lumen-pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes lumen-pop {
          from { transform: scale(0.4); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lumen-setup .lumen-in, .lumen-setup .lumen-check-pop { animation: none; opacity: 1; }
        }
      `}</style>

      <div aria-hidden="true" className="lumen-aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-96" />

      <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-6 p-6">
      {/* Carry the intro's wordmark into setup so the two screens read as one
          flow; the back button returns to it rather than trapping the user. */}
      <div className="lumen-in flex items-center justify-between" data-in="1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Back"
            onClick={() => setStep('intro')}
            className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 shadow-[0_0_10px_rgba(225,29,72,0.5)]"
          />
          <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
            Lumen
          </span>
        </div>
        <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
          Step 2 of 2
        </span>
      </div>

      {/* Two-segment progress bar mirroring the step label above. The second
          segment fills once the form is complete, so the bar doubles as live
          "ready to submit" feedback. */}
      <div aria-hidden="true" className="lumen-in flex gap-1.5" data-in="1">
        <span className="h-1 flex-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500" />
        <span
          className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
            missingDate
              ? 'bg-rose-200/70 dark:bg-rose-950'
              : 'bg-gradient-to-r from-pink-500 to-rose-500'
          }`}
        />
      </div>

      <div className="lumen-in" data-in="2">
        <h1 className="bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 bg-clip-text text-[28px] font-bold tracking-tight text-transparent dark:from-rose-300 dark:via-rose-300 dark:to-pink-300">
          Let&apos;s set things up
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300">
          A few quick details, then you&apos;re in. You can change any of this later.
        </p>
      </div>

      <fieldset
        role="radiogroup"
        onKeyDown={handleGoalKeyDown}
        className="lumen-in space-y-2.5 text-sm"
        data-in="3"
      >
        <legend className="mb-2.5 block font-semibold text-neutral-800 dark:text-neutral-100">
          What brings you to Lumen?
        </legend>
        {goalOptions.map((o) => {
          const selected = goal === o.value;
          return (
            <button
              key={o.value}
              id={`goal-${o.value}`}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setGoal(o.value)}
              className={`group flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left backdrop-blur transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 ${
                selected
                  ? '-translate-y-0.5 border-rose-500/70 bg-gradient-to-br from-rose-50 to-pink-50/60 shadow-[0_10px_30px_-10px_rgba(225,29,72,0.35)] dark:border-rose-500/50 dark:from-rose-950/50 dark:to-pink-950/30'
                  : 'border-neutral-200/80 bg-white/70 shadow-sm hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md dark:border-neutral-800 dark:bg-white/[0.04] dark:hover:border-rose-900'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                  selected
                    ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-[0_4px_14px_rgba(225,29,72,0.4)]'
                    : 'bg-neutral-100 text-neutral-500 group-hover:bg-rose-50 group-hover:text-rose-500 dark:bg-neutral-800 dark:text-neutral-400 dark:group-hover:bg-rose-950/60 dark:group-hover:text-rose-300'
                }`}
              >
                {goalIcon[o.value]}
              </span>
              <span className="flex-1">
                <span
                  className={`block font-semibold ${selected ? 'text-rose-900 dark:text-rose-100' : 'text-neutral-800 dark:text-neutral-100'}`}
                >
                  {o.label}
                </span>
                <span
                  className={`block text-xs leading-5 ${selected ? 'text-rose-700/80 dark:text-rose-300/80' : 'text-neutral-500 dark:text-neutral-400'}`}
                >
                  {o.hint}
                </span>
              </span>
              {selected && (
                <svg
                  aria-hidden="true"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lumen-check-pop shrink-0 text-rose-600 dark:text-rose-300"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              )}
            </button>
          );
        })}
      </fieldset>

      {askingForPeriod ? (
        <div className="lumen-in space-y-2.5" data-in="4">
          <label
            htmlFor="last-period"
            className="block text-sm font-semibold text-neutral-800 dark:text-neutral-100"
          >
            When did your last period start?
          </label>
          <input
            id="last-period"
            aria-label="last period start"
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-neutral-200/80 bg-white/70 px-3.5 py-3 text-[15px] shadow-sm backdrop-blur transition-colors [color-scheme:light] focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-neutral-800 dark:bg-white/[0.04] dark:[color-scheme:dark]"
          />
          <p className="flex items-start gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <LockIcon />
            <span>The first day of your most recent period. Not sure? Your best guess is fine.</span>
          </p>
          {goal === 'pregnant' && (
            <>
              {derivedDueDate && (
                <p className="flex items-center gap-2 rounded-xl border border-rose-200/80 bg-gradient-to-r from-rose-50 to-pink-50 px-3.5 py-2.5 text-[13px] font-medium text-rose-800 dark:border-rose-900 dark:from-rose-950/60 dark:to-pink-950/40 dark:text-rose-200">
                  <svg
                    aria-hidden="true"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
                    <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
                  </svg>
                  <span>
                    Estimated due date:{' '}
                    <strong className="font-semibold">
                      {parseISODate(derivedDueDate).toLocaleDateString(undefined, {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </strong>
                  </span>
                </p>
              )}
              <button
                type="button"
                onClick={() => setLmpMode(false)}
                className="text-xs font-medium text-rose-700 underline underline-offset-2 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-300 dark:hover:text-rose-200"
              >
                I know my due date
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="lumen-in space-y-2.5" data-in="4">
          <label
            htmlFor="due-date"
            className="block text-sm font-semibold text-neutral-800 dark:text-neutral-100"
          >
            What is your due date?
          </label>
          <input
            id="due-date"
            aria-label="due date"
            type="date"
            value={dueDate}
            min={today}
            max={addDays(today, 301)}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-xl border border-neutral-200/80 bg-white/70 px-3.5 py-3 text-[15px] shadow-sm backdrop-blur transition-colors [color-scheme:light] focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-neutral-800 dark:bg-white/[0.04] dark:[color-scheme:dark]"
          />
          <p className="flex items-start gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <LockIcon />
            <span>Your estimated due date — you can adjust it anytime.</span>
          </p>
          <button
            type="button"
            onClick={() => setLmpMode(true)}
            className="text-xs font-medium text-rose-700 underline underline-offset-2 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-300 dark:hover:text-rose-200"
          >
            Not sure? Enter your last period instead
          </button>
        </div>
      )}

      <div className="lumen-in space-y-3" data-in="5">
        <button
          type="submit"
          disabled={saving || missingDate}
          className={`group w-full rounded-2xl px-4 py-4 font-semibold transition-all duration-200 ${
            saving || missingDate
              ? 'cursor-not-allowed bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
              : 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-[0_12px_32px_-8px_rgba(225,29,72,0.55)] hover:shadow-[0_16px_40px_-8px_rgba(225,29,72,0.65)] hover:brightness-105 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            {saving ? 'Setting up…' : 'Get started'}
            {!saving && !missingDate && (
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            )}
          </span>
        </button>
        {missingDate && (
          <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
            {askingForPeriod
              ? 'Pick your last period date to continue'
              : 'Pick your due date to continue'}
          </p>
        )}
        {/* Restate the privacy promise at the moment of commitment. */}
        <p className="flex items-center justify-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
          <LockIcon />
          <span>Private — your answers never leave this device</span>
        </p>
      </div>
      </form>
    </div>
  );
}
