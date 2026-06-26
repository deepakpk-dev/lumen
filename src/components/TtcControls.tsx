'use client';

import { useHealthData } from '@/src/state/useHealthData';
import type { BbtUnit } from '@/src/settings/preferences';

export function TtcControls({ onEnabled }: { onEnabled?: () => void }) {
  const { lifeStage, bbtUnit, setTtcMode, setBbtUnitPreference } = useHealthData();
  const ttc = lifeStage === 'ttc';

  function toggleTtc() {
    const next = !ttc;
    setTtcMode(next);
    if (next) onEnabled?.();
  }

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
              aria-pressed={bbtUnit === u}
              onClick={() => setBbtUnitPreference(u)}
              className={`inline-flex min-h-[44px] items-center rounded-full border px-4 ${bbtUnit === u ? 'border-rose-600 bg-rose-600 text-white' : 'border-neutral-300 dark:border-neutral-700'}`}
            >
              °{u}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
