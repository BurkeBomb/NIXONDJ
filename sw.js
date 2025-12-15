// Offline cache for the journal app
const CACHE = 'dj-cache-v9';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/style.css?v=9',
  './assets/app.js?v=9',
  './assets/db.js?v=9',
  './assets/export.js?v=9',
  './assets/logo-xdrip.png?v=9',
  './assets/logo.svg?v=9',
  './assets/icon-192.png?v=9',
  './assets/icon-192.png',
  './assets/icon-512.png?v=9',
  './assets/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : Promise.resolve()))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
