// Slime Knight — offline cache
// Bump CACHE_NAME whenever any file in CORE_ASSETS changes, so old caches get replaced.
const CACHE_NAME = 'slime-knight-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './index.js',
  './index.pck',
  './index.wasm',
  './index.png',
  './index.icon.png',
  './index.apple-touch-icon.png',
  './apple-touch-icon.png',
  './index.audio.worklet.js',
  './index.audio.position.worklet.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Cache-first for same-origin game assets, falling back to network (and
// caching whatever comes back) for anything not precached.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
