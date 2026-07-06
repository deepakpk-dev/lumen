'use client';

import { useEffect } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { getStorageKeys, onOutboxChanged } from '@/src/data/storage';
import { isSyncEnabled, syncNow } from '@/src/data/sync-engine';

// How long after the last local write before it pushes. Long enough to batch
// a burst of edits (a daily log save touches several fields), short enough
// that closing the tab minutes later rarely loses the push.
const WRITE_DEBOUNCE_MS = 4_000;

// Runs a sync on app open, whenever the tab becomes visible again, and
// debounced after local writes — the cadence a serverless PWA can actually
// deliver (design doc §5). Renders nothing. Failures are silent here;
// Settings has "Sync now" with real error reporting.
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
        // Offline or server unreachable — next open/focus/write retries.
      } finally {
        inFlight = false;
      }
    };
    void run();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run();
    };
    document.addEventListener('visibilitychange', onVisible);
    let timer: ReturnType<typeof setTimeout>;
    onOutboxChanged(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void run(), WRITE_DEBOUNCE_MS);
    });
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      onOutboxChanged(null);
      clearTimeout(timer);
    };
  }, [refresh, refreshSettings]);

  return null;
}
