const CACHE = 'lumen-shell-v3';
const SHELL = [
  '/', '/onboarding', '/log', '/calendar', '/history', '/insights', '/library',
  '/profile', '/notifications', '/settings', '/privacy',
];

function isStaticAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith('/_next/static/');
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    const assets = new Set();
    for (const route of SHELL) {
      const html = await (await cache.match(route)).text();
      for (const [, resource] of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
        const url = new URL(resource, self.location.origin);
        if (isStaticAsset(url)) assets.add(url.href);
      }
    }
    await cache.addAll([...assets]);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('lumen-shell-') && k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Page navigations (HTML) are network-first so a fresh shell — referencing the
  // current build's chunk hashes — is served whenever online. A cached shell with
  // stale hashes would 404 its scripts and render a blank screen. Fall back to the
  // cache (then the app root) only when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {}));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(url.pathname)) || caches.match('/')),
    );
    return;
  }

  // Cache content-hashed chunks when the user opens an additional route.
  if (isStaticAsset(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {}));
      }
      return response;
    })());
  }
});
