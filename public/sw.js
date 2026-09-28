// Arus — Service Worker (selective cache for PWA)
const CACHE_NAME = 'arus-v2';
// Only precache the dashboard shell (NOT the Next.js landing page)
const PRECACHE_URLS = ['/arus.html', '/manifest.json'];

// URLs that should NEVER be cached (always network-first)
const NEVER_CACHE = [
  '/api/',           // API calls
  '/_next/',         // Next.js JS/CSS chunks (change every deploy)
  '/',               // Landing page (SSR, changes every deploy)
];

function shouldNeverCache(url) {
  return NEVER_CACHE.some(prefix => url.pathname.startsWith(prefix));
}

// Install: precache dashboard shell only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: smart routing
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls or Next.js assets — always go to network
  if (shouldNeverCache(url)) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // For API calls, return offline JSON
        if (url.pathname.startsWith('/api/')) {
          return new Response(JSON.stringify({ error: 'Offline — periksa koneksi internet.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        // For other non-cached routes, return a basic offline page
        return new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // Dashboard static assets: cache-first, fall back to network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful GET responses for dashboard assets only
        if (event.request.method === 'GET' && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
