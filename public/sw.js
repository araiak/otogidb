/**
 * Service Worker for OtogiDB
 * Caches Cloudinary images and local static icons.
 *
 * Strategy:
 * - Pre-cache local icons on install (eliminates duplicate fetches)
 * - Cache-first for Cloudinary images (immutable by URL)
 * - Cache-first for local /icons/ requests
 * - Network-first for everything else (HTML, JSON, etc.)
 */

const CACHE_NAME = 'otogidb-images-v1';
const STATIC_CACHE_NAME = 'otogidb-static-v1';
const CLOUDINARY_HOST = 'res.cloudinary.com';

// Pre-cache all local icons on install so they are immediately available
// without any network round-trips and without duplicate fetches on first load.
const PRECACHE_ICONS = [
  '/icons/attributes/anima.png',
  '/icons/attributes/divina.png',
  '/icons/attributes/phantasma.png',
  '/icons/rarity/star.png',
  '/icons/types/assist.png',
  '/icons/types/healer.png',
  '/icons/types/melee.png',
  '/icons/types/ranged.png',
];

// Install: pre-cache icons, then activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ICONS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('otogidb-') && name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: route to appropriate cache strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Cache-first for Cloudinary images
  if (url.hostname === CLOUDINARY_HOST) {
    event.respondWith(cacheFirst(event.request, CACHE_NAME));
    return;
  }

  // Cache-first for local icons (pre-cached on install)
  if (url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE_NAME));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

// Listen for messages to clear cache
self.addEventListener('message', (event) => {
  if (event.data === 'clearCache') {
    Promise.all([
      caches.delete(CACHE_NAME),
      caches.delete(STATIC_CACHE_NAME),
    ]).then(() => {
      console.log('All caches cleared');
    });
  }
});
