/**
 * MigrantPortal service worker
 * - Cache-first for static shell (HTML, CSS, JS, images, fonts)
 * - Network-first with passthrough for /api/ and Railway backend
 * - Offline fallback page for navigations
 * Bump CACHE_NAME on every deploy.
 */
const CACHE_NAME = 'migrantportal-v8';
const OFFLINE_URL = '/offline';

const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/i18n.js',
  '/api.js',
  '/logo.png',
  '/logo.webp',
  '/logo.svg',
  '/favicon.ico',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Best-effort precache — don't fail install if one file is missing.
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((n) => (n === CACHE_NAME ? null : caches.delete(n)))
      );
      await self.clients.claim();
    })()
  );
});

function isBackend(url) {
  return url.includes('migrant-portal-production-3826.up.railway.app') ||
         url.includes('/api/');
}

function isAnalytics(url) {
  return url.includes('google-analytics.com') ||
         url.includes('googletagmanager.com');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url;

  // Only handle GET — mutations pass through
  if (req.method !== 'GET') return;

  // Skip cross-origin analytics/beacons
  if (isAnalytics(url)) return;

  // Network-first for backend API calls — never stale data
  if (isBackend(url)) {
    event.respondWith(
      fetch(req).catch(() => new Response(
        JSON.stringify({ error: 'offline' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Navigation requests: try network, fall back to cache, then offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Fetch by URL string, not the captured navigate-mode Request —
          // reusing `req` here throws "Failed to fetch" once Cloudflare's
          // .html -> clean-URL 308 redirect is in the chain.
          const fresh = await fetch(req.url, { redirect: 'follow' });
          if (!fresh.redirected) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(req, fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch (_) {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(req);
          if (cached) return cached;
          const offline = await cache.match(OFFLINE_URL);
          return offline || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((resp) => {
        if (!resp || resp.status !== 200 || resp.type === 'opaque') return resp;
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => hit);
    })
  );
});
