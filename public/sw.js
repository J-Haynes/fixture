const CACHE = 'fixture-v1';

// Only pre-cache the true app shell — static files that never change between deploys.
// /_next/static/ assets are intentionally excluded: Next.js content-hashes them and
// sets Cache-Control: immutable on them in production, so the browser HTTP cache
// handles them correctly without SW involvement. Caching them here caused hydration
// mismatches whenever the JS bundle changed (SW served stale code).
const SHELL = ['/', '/manifest.json', '/icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Skip API routes — always fetch live
  if (url.pathname.startsWith('/api/')) return;

  // Skip /_next/static/ — the browser HTTP cache owns these.
  // In production Next.js sets Cache-Control: max-age=31536000, immutable on every
  // hashed chunk, so they're cached forever and bust automatically on new deploys.
  if (url.pathname.startsWith('/_next/')) return;

  // Network-first for pages and other assets (offline fallback via cache)
  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then(hit => hit ?? caches.match('/'))
      )
  );
});
