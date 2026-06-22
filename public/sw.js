const CACHE = 'lumen-shell-v2';
const SHELL = ['/', '/log', '/calendar', '/history', '/settings'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Page navigations (HTML) are network-first so a fresh shell — referencing the
  // current build's chunk hashes — is served whenever online. A cached shell with
  // stale hashes would 404 its scripts and render a blank screen. Fall back to the
  // cache (then the app root) only when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE).then((c) => c.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
    );
    return;
  }

  // Static assets are content-hashed and immutable, so cache-first is safe.
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
