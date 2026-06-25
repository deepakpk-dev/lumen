'use client';

import { useEffect, useState } from 'react';
import {
  getLifeStage,
  setLifeStage,
  getBbtUnit,
  setBbtUnit,
  type BbtUnit,
} from '@/src/settings/preferences';
import { todayISO } from '@/src/domain/dates';

export function TtcControls() {
  const [ready, setReady] = useState(false);
  const [ttc, setTtc] = useState(false);
  const [unit, setUnit] = useState<BbtUnit>('C');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time hydration from localStorage; SSR-safe via the `ready` gate
    setTtc(getLifeStage() === 'ttc');
    setUnit(getBbtUnit());
    setReady(true);
  }, []);

  function toggleTtc() {
    const next = !ttc;
    setLifeStage(next ? 'ttc' : 'cycle', todayISO());
    setTtc(next);
  }

  function chooseUnit(u: BbtUnit) {
    setBbtUnit(u);
    setUnit(u);
  }

  if (!ready) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        TTC mode is <span className="font-medium">{ttc ? 'on' : 'off'}</span>.
      </p>
      <button
        type="button"
        onClick={toggleTtc}
        className={`w-full rounded-md px-4 py-3 text-white ${ttc ? 'bg-neutral-600' : 'bg-rose-600'}`}
      >
        {ttc ? 'Turn off TTC mode' : 'Turn on TTC mode'}
      </button>
      {ttc && (
        <div className="flex items-center gap-2 text-sm">
          <span>Temperature unit:</span>
          {(['C', 'F'] as BbtUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => chooseUnit(u)}
              className={`inline-flex min-h-[44px] items-center rounded-full border px-4 ${unit === u ? 'border-rose-600 bg-rose-600 text-white' : 'border-neutral-300 dark:border-neutral-700'}`}
            >
              °{u}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
