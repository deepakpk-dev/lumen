'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useHealthData } from '@/src/state/useHealthData';
import { BbtChart } from '@/src/components/BbtChart';
import { ConceptionCard } from '@/src/components/ConceptionCard';
import { PageShell } from '@/src/components/PageShell';
import { shouldShowResourceNote } from '@/src/domain/fertility/journey';
import { cToF } from '@/src/domain/fertility/units';

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
    <PageShell
      title="Fertility"
      subtitle="Your fertile window, temperatures, and ovulation signals — all in one place."
    >
      <ConceptionCard
        guidance={conceptionToday}
        confirmation={ovulationConfirmation}
        hasCycleHistory={stats.cycleCount > 0}
      />

      {/* Logging is the primary action here: BBT, LH, and mucus entry all
          live on the daily log, so give it the flow's signature CTA. */}
      <Link
        href="/log"
        className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-4 font-semibold text-white shadow-[0_12px_32px_-8px_rgba(225,29,72,0.55)] transition-all duration-200 hover:shadow-[0_16px_40px_-8px_rgba(225,29,72,0.65)] hover:brightness-105 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950"
      >
        Log today
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
      </Link>

      {/* Informational sections stay flat and quiet — elevation is reserved
          for the guidance card and CTA so the hierarchy reads at a glance
          and the page stays short on phones. */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">BBT chart</h2>
        <BbtChart
          points={points}
          ovulationDate={ovulationConfirmation?.ovulationDate}
          unit={bbtUnit}
        />
      </section>

      <section className="space-y-1">
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
        <section className="space-y-2">
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
        <p className="text-center text-[11px] text-neutral-500 dark:text-neutral-400">
          Lumen is not a contraceptive and not a substitute for fertility
          treatment or medical advice.
        </p>
      )}
    </PageShell>
  );
}
