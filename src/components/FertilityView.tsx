'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useHealthData } from '@/src/state/useHealthData';
import { BbtChart } from '@/src/components/BbtChart';
import { ConceptionCard } from '@/src/components/ConceptionCard';
import { shouldShowResourceNote } from '@/src/domain/fertility/journey';
import { cToF } from '@/src/domain/fertility/units';

// Shared stroke style so section glyphs match the icon language established on
// the onboarding screens (thin outline, rounded joins).
const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function FertilityView() {
  const {
    dailyLogs,
    cycles,
    stats,
    ovulationConfirmation,
    conceptionToday,
    bbtUnit,
    ttcStartDate,
    loading,
  } = useHealthData();
  const [dismissed, setDismissed] = useState(false);

  if (loading) return <main className="p-6">Loading…</main>;

  const currentStart =
    [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate)).at(-1)
      ?.startDate ?? '';
  const points = dailyLogs
    .filter((l) => typeof l.bbt === 'number' && l.date >= currentStart)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => ({
      date: l.date,
      value: bbtUnit === 'F' ? cToF(l.bbt as number) : (l.bbt as number),
    }));

  const showNote = shouldShowResourceNote(cycles, ttcStartDate);

  return (
    <div className="lumen-fert relative isolate">
      <style>{`
        /* Ambient rose wash echoing the onboarding screens, so the fertility
           space reads as part of the same world rather than a plain page. */
        .lumen-fert-aurora {
          background:
            radial-gradient(55% 75% at 15% 0%, rgba(244, 63, 94, 0.12), transparent 62%),
            radial-gradient(45% 60% at 85% 4%, rgba(236, 72, 153, 0.08), transparent 60%),
            radial-gradient(70% 55% at 50% -12%, rgba(255, 228, 230, 0.55), transparent 72%);
        }
        @media (prefers-color-scheme: dark) {
          .lumen-fert-aurora {
            background:
              radial-gradient(55% 75% at 15% 0%, rgba(244, 63, 94, 0.14), transparent 62%),
              radial-gradient(45% 60% at 85% 4%, rgba(236, 72, 153, 0.10), transparent 60%);
          }
        }
        /* Staggered entrance matching the setup step's rhythm. */
        .lumen-fert .lumen-in {
          opacity: 0;
          animation: lumen-fert-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .lumen-fert [data-in='1'] { animation-delay: 0.03s; }
        .lumen-fert [data-in='2'] { animation-delay: 0.1s; }
        .lumen-fert [data-in='3'] { animation-delay: 0.18s; }
        .lumen-fert [data-in='4'] { animation-delay: 0.27s; }
        .lumen-fert [data-in='5'] { animation-delay: 0.36s; }
        @keyframes lumen-fert-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lumen-fert .lumen-in { animation: none; opacity: 1; }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="lumen-fert-aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
      />

      <main className="mx-auto max-w-md space-y-6 p-6">
        {/* Brand row: back-to-home on the left, wordmark on the right, mirroring
            the setup step so the two screens read as one flow. */}
        <div className="lumen-in flex items-center justify-between" data-in="1">
          <Link
            href="/"
            className="-ml-2 flex items-center gap-1 rounded-full py-1 pl-1 pr-3 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <svg aria-hidden="true" {...iconProps}>
              <path d="M15 6l-6 6 6 6" />
            </svg>
            Home
          </Link>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 shadow-[0_0_10px_rgba(225,29,72,0.5)]"
            />
            <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
              Lumen
            </span>
          </span>
        </div>

        <div className="lumen-in" data-in="1">
          <h1 className="bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 bg-clip-text text-[28px] font-bold tracking-tight text-transparent dark:from-rose-300 dark:via-rose-300 dark:to-pink-300">
            Fertility
          </h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300">
            Your fertile window, temperatures, and ovulation signals — all in one
            place.
          </p>
        </div>

        <div className="lumen-in" data-in="2">
          <ConceptionCard
            guidance={conceptionToday}
            confirmation={ovulationConfirmation}
            hasCycleHistory={stats.cycleCount > 0}
          />
        </div>

        {/* Logging is the primary action here: BBT, LH, and mucus entry all
            live on the daily log, so give it the flow's signature CTA. */}
        <Link
          href="/log"
          className="lumen-in group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-4 font-semibold text-white shadow-[0_12px_32px_-8px_rgba(225,29,72,0.55)] transition-all duration-200 hover:shadow-[0_16px_40px_-8px_rgba(225,29,72,0.65)] hover:brightness-105 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950"
          data-in="2"
        >
          Log today
          <svg
            aria-hidden="true"
            {...iconProps}
            strokeWidth={2}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </Link>

        {/* Informational sections stay flat and quiet — elevation is reserved
            for the guidance card and CTA so the hierarchy reads at a glance
            and the page stays short on phones. */}
        <section className="lumen-in space-y-2" data-in="3">
          <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">BBT chart</h2>
          <BbtChart
            points={points}
            ovulationDate={ovulationConfirmation?.ovulationDate}
            unit={bbtUnit}
          />
        </section>

        <section className="lumen-in space-y-1" data-in="4">
          <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Ovulation status
          </h2>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {ovulationConfirmation
              ? ovulationConfirmation.explanation
              : 'No ovulation signals logged for this cycle yet.'}
          </p>
        </section>

        {showNote && !dismissed && (
          <section className="lumen-in space-y-2" data-in="5">
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              You&apos;ve been tracking for a while. If you have questions about
              conceiving, it can help to talk with a healthcare provider — this is
              common and there is support available.
            </p>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded text-xs text-neutral-500 underline underline-offset-2 transition hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              Dismiss
            </button>
          </section>
        )}

        {/* The guidance card carries this disclaimer itself; repeat it at page
            level only when the card isn't rendered, so it never disappears but
            also never shows twice on one screen. */}
        {!conceptionToday && (
          <p className="lumen-in text-center text-[11px] text-neutral-500 dark:text-neutral-400" data-in="5">
            Lumen is not a contraceptive and not a substitute for fertility
            treatment or medical advice.
          </p>
        )}
      </main>
    </div>
  );
}
