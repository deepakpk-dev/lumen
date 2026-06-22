'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // In development the cache-first service worker serves a stale app shell
    // that references previous build chunk hashes; those 404 on the next dev
    // run and leave a blank screen. Never run it in dev, and proactively tear
    // down any worker/caches left behind by an earlier dev session.
    if (process.env.NODE_ENV === 'development') {
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => void r.unregister()));
      if ('caches' in window) {
        void caches.keys().then((keys) => keys.forEach((k) => void caches.delete(k)));
      }
      return;
    }

    void navigator.serviceWorker.register('/sw.js');
  }, []);
  return null;
}
