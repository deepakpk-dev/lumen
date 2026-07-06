'use client';

import { useEffect } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { getStorageKeys } from '@/src/data/storage';
import { isSyncEnabled, syncNow } from '@/src/data/sync-engine';

// Runs a sync on app open and whenever the tab becomes visible again — the
// "on open" cadence a serverless PWA can actually deliver (design doc §5).
// Renders nothing. Failures are silent here; Settings has "Sync now" with
// real error reporting.
export function SyncRunner() {
  const { refresh, refreshSettings } = useHealthData();

  useEffect(() => {
    let inFlight = false;
    const run = async () => {
      const keys = getStorageKeys();
      if (inFlight || !keys || !isSyncEnabled()) return;
      inFlight = true;
      try {
        const { applied } = await syncNow(keys);
        if (applied > 0) {
          refreshSettings(); // a pulled prefs record may have changed life stage
          await refresh();
        }
      } catch {
        // Offline or server unreachable — next open/focus retries.
      } finally {
        inFlight = false;
      }
    };
    void run();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh, refreshSettings]);

  return null;
}
