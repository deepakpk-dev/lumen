'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useHealthData } from '@/src/state/useHealthData';
import type { Contraction, ContractionSession } from '@/src/domain/types';
import { fiveOneOneStatus } from '@/src/domain/pregnancy/contractions';
import { todayISO } from '@/src/domain/dates';

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `ct_${Date.now()}_${Math.random()}`;
}

export function ContractionTimer() {
  const { saveContractionSession, contractionSessions } = useHealthData();
  const [contractions, setContractions] = useState<Contraction[]>([]);
  const [openStart, setOpenStart] = useState<string | null>(null);

  function startContraction() {
    setOpenStart(new Date().toISOString());
  }

  function stopContraction() {
    if (!openStart) return;
    setContractions((cs) => [...cs, { start: openStart, end: new Date().toISOString() }]);
    setOpenStart(null);
  }

  async function save() {
    if (contractions.length === 0) return;
    await saveContractionSession({ id: newId(), date: todayISO(), contractions });
    setContractions([]);
  }

  const status = fiveOneOneStatus(contractions, new Date().toISOString());

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Contraction timer</h1>
        <Link href="/pregnancy" className="text-sm text-rose-600">Back</Link>
      </div>

      <p className="text-center text-sm text-neutral-700">
        {contractions.length} contraction{contractions.length === 1 ? '' : 's'} logged
      </p>

      {openStart ? (
        <button type="button" onClick={stopContraction} className="w-full rounded-md bg-neutral-700 px-4 py-6 text-lg text-white">
          Stop contraction
        </button>
      ) : (
        <button type="button" onClick={startContraction} className="w-full rounded-md bg-rose-600 px-4 py-6 text-lg text-white">
          Start contraction
        </button>
      )}

      {status.meetsCriteria && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {status.message}
        </p>
      )}

      <button type="button" onClick={save} className="w-full rounded-md border px-4 py-2">
        Save session
      </button>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-600">Recent sessions</h2>
        {contractionSessions.length === 0 ? (
          <p className="text-sm text-neutral-500">No sessions yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-neutral-700">
            {contractionSessions.map((s: ContractionSession) => (
              <li key={s.id}>{s.date}: {s.contractions.length} contractions</li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[11px] text-neutral-500">
        This timer is informational only and does not diagnose labor. Follow your provider&apos;s guidance.
      </p>
    </main>
  );
}
