
const CACHE_NAME = 'thay-ai-core-v3';
const CDN_CACHE_NAME = 'thay-ai-cdn-v1';

// Assets that must be pre-cached immediately
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Clean up old versions but keep the CDN cache (it's expensive to redownload)
          if (cacheName !== CACHE_NAME && cacheName !== CDN_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // --- STRATEGY 1: CACHE FIRST (For Immutable CDN Libraries) ---
  // Libraries from aistudiocdn, esm.sh, tailwindcss are versioned and unlikely to change.
  // We check cache first. If found, return immediately. If not, fetch -> cache -> return.
  if (
    url.hostname.includes('aistudiocdn.com') || 
    url.hostname.includes('cdn.tailwindcss.com') ||
    url.hostname.includes('esm.sh') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('gstatic.com')
  ) {
    event.respondWith(
      caches.open(CDN_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (e) {
          console.warn("CDN Fetch failed:", e);
          // Return a fallback or nothing, letting the app handle the error
          return new Response('', { status: 408, statusText: 'Request Timeout' });
        }
      })
    );
    return;
  }

  // --- STRATEGY 2: STALE-WHILE-REVALIDATE (For App Shell: index.html, local scripts) ---
  // Serve from cache immediately for speed, but update cache in background for next time.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback logic could go here
      });

      return cachedResponse || fetchPromise;
    })
  );
});
