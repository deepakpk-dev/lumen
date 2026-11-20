'use client';

import { useState } from 'react';
import { PageShell } from '@/src/components/PageShell';
import { useHealthData } from '@/src/state/useHealthData';
import { KICK_TARGET } from '@/src/domain/pregnancy/kicks';
import { todayISO } from '@/src/domain/dates';

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `k_${Date.now()}_${Math.random()}`;
}

export function KickCounter() {
  const { saveKickSession, kickSessions } = useHealthData();
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [kicks, setKicks] = useState<string[]>([]);

  function start() {
    setStartedAt(new Date().toISOString());
    setKicks([]);
  }

  function recordKick() {
    setKicks((k) => [...k, new Date().toISOString()]);
  }

  async function finish() {
    if (!startedAt) return;
    await saveKickSession({
      id: newId(),
      date: todayISO(),
      startedAt,
      kickTimestamps: kicks,
      endedAt: new Date().toISOString(),
    });
    setStartedAt(null);
    setKicks([]);
  }

  return (
    <PageShell title="Kick counter" backHref="/pregnancy" backLabel="Pregnancy">

      {startedAt ? (
        <div className="space-y-4 text-center">
          <p className="text-4xl font-bold">{kicks.length} / {KICK_TARGET}</p>
          <button
            type="button"
            onClick={recordKick}
            className="lumen-button lumen-timer-button w-full"
          >
            Record a kick
          </button>
          <button type="button" onClick={finish} className="lumen-outline w-full">
            Finish
          </button>
        </div>
      ) : (
        <button type="button" onClick={start} className="lumen-button w-full">
          Start a session
        </button>
      )}

      <section className="lumen-card space-y-2">
        <h2 className="lumen-card-title">Recent sessions</h2>
        {kickSessions.length === 0 ? (
          <p className="lumen-help">No sessions yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
            {kickSessions.map((s) => (
              <li key={s.id}>{s.date}: {s.kickTimestamps.length} kick{s.kickTimestamps.length === 1 ? '' : 's'}</li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
        Counting movements is informational. Contact your provider if you notice reduced movement.
      </p>
    </PageShell>
  );
}
