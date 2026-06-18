'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { BbtChart } from '@/src/components/BbtChart';
import { ConceptionCard } from '@/src/components/ConceptionCard';
import { shouldShowResourceNote } from '@/src/domain/fertility/journey';
import { cToF } from '@/src/domain/fertility/units';

export function FertilityView() {
  const {
    dailyLogs,
    cycles,
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
    <main className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-xl font-semibold">Fertility</h1>

      <ConceptionCard guidance={conceptionToday} confirmation={ovulationConfirmation} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-600">BBT chart</h2>
        <BbtChart points={points} ovulationDate={ovulationConfirmation?.ovulationDate} unit={bbtUnit} />
      </section>

      <section className="space-y-1">
        <h2 className="text-sm font-medium text-neutral-600">Ovulation status</h2>
        <p className="text-sm text-neutral-700">
          {ovulationConfirmation
            ? ovulationConfirmation.explanation
            : 'No ovulation signals logged for this cycle yet.'}
        </p>
      </section>

      {showNote && !dismissed && (
        <section className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm text-neutral-700">
            You&apos;ve been tracking for a while. If you have questions about
            conceiving, it can help to talk with a healthcare provider — this is
            common and there is support available.
          </p>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs text-neutral-500 underline"
          >
            Dismiss
          </button>
        </section>
      )}

      <p className="text-[11px] text-neutral-500">
        Lumen is not a contraceptive and not a substitute for fertility
        treatment or medical advice.
      </p>
    </main>
  );
}
