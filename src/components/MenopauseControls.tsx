'use client';

import { useHealthData } from '@/src/state/useHealthData';

export function MenopauseControls({ onEnabled }: { onEnabled?: () => void }) {
  const { lifeStage, setMenopauseMode } = useHealthData();
  const on = lifeStage === 'menopause';

  function toggle() {
    const next = !on;
    setMenopauseMode(next);
    if (next) onEnabled?.();
  }

  return (
    <div className="space-y-3">
      <p className="lumen-help">
        Perimenopause mode is <span className="font-medium">{on ? 'on' : 'off'}</span>.
      </p>
      <button
        type="button"
        onClick={toggle}
        className={`w-full ${on ? 'lumen-outline' : 'lumen-button'}`}
      >
        {on ? 'Turn off perimenopause mode' : 'Turn on perimenopause mode'}
      </button>
    </div>
  );
}
