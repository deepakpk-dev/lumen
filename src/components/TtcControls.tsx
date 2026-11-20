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
      <p className="lumen-help">
        TTC mode is <span className="font-medium">{ttc ? 'on' : 'off'}</span>.
      </p>
      <button
        type="button"
        onClick={toggleTtc}
        className={`w-full ${ttc ? 'lumen-outline' : 'lumen-button'}`}
      >
        {ttc ? 'Turn off TTC mode' : 'Turn on TTC mode'}
      </button>
      {ttc && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Temperature unit:</span>
          {(['C', 'F'] as BbtUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={bbtUnit === u}
              onClick={() => setBbtUnitPreference(u)}
              className="lumen-chip"
            >
              °{u}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
