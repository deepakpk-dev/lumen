'use client';

import { useState } from 'react';
import Link from 'next/link';
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
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kick counter</h1>
        <Link href="/pregnancy" className="text-sm text-rose-600">Back</Link>
      </div>

      {startedAt ? (
        <div className="space-y-4 text-center">
          <p className="text-4xl font-bold">{kicks.length} / {KICK_TARGET}</p>
          <button
            type="button"
            onClick={recordKick}
            className="w-full rounded-md bg-rose-600 px-4 py-6 text-lg text-white"
          >
            Record a kick
          </button>
          <button type="button" onClick={finish} className="w-full rounded-md border px-4 py-2">
            Finish
          </button>
        </div>
      ) : (
        <button type="button" onClick={start} className="w-full rounded-md bg-rose-600 px-4 py-3 text-white">
          Start a session
        </button>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-600">Recent sessions</h2>
        {kickSessions.length === 0 ? (
          <p className="text-sm text-neutral-500">No sessions yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-neutral-700">
            {kickSessions.map((s) => (
              <li key={s.id}>{s.date}: {s.kickTimestamps.length} kicks</li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[11px] text-neutral-500">
        Counting movements is informational. Contact your provider if you notice reduced movement.
      </p>
    </main>
  );
}
