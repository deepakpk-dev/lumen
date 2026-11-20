'use client';

import { useState } from 'react';
import { PageShell } from '@/src/components/PageShell';
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
    <PageShell title="Contraction timer" backHref="/pregnancy" backLabel="Pregnancy">

      <p className="text-center text-sm text-neutral-700 dark:text-neutral-300">
        {contractions.length} contraction{contractions.length === 1 ? '' : 's'} logged
      </p>

      {openStart ? (
        <button type="button" onClick={stopContraction} className="lumen-outline lumen-timer-button w-full">
          Stop contraction
        </button>
      ) : (
        <button type="button" onClick={startContraction} className="lumen-button lumen-timer-button w-full">
          Start contraction
        </button>
      )}

      {status.meetsCriteria && (
        <p className="lumen-panel lumen-warning text-sm">
          {status.message}
        </p>
      )}

      <button type="button" onClick={save} className="lumen-outline w-full">
        Save session
      </button>

      <section className="lumen-card space-y-2">
        <h2 className="lumen-card-title">Recent sessions</h2>
        {contractionSessions.length === 0 ? (
          <p className="lumen-help">No sessions yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
            {contractionSessions.map((s: ContractionSession) => (
              <li key={s.id}>{s.date}: {s.contractions.length} contraction{s.contractions.length === 1 ? '' : 's'}</li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
        This timer is informational only and does not diagnose labor. Follow your provider&apos;s guidance.
      </p>
    </PageShell>
  );
}
