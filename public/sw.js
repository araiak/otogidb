/**
 * Service Worker for OtogiDB
 * Caches Cloudinary images to reduce bandwidth and improve repeat visit performance.
 *
 * Strategy:
 * - Cache-first for Cloudinary images (immutable by URL)
 * - Network-first for everything else (HTML, JSON, etc.)
 */

const CACHE_NAME = 'otogidb-images-v1';
const CLOUDINARY_HOST = 'res.cloudinary.com';

// Install: Skip waiting to activate immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('otogidb-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch: Cache-first for Cloudinary images
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept Cloudinary image requests
  if (url.hostname !== CLOUDINARY_HOST) {
    return; // Let browser handle normally
  }

  // Only cache GET requests for images
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Cache hit - return cached response
          return cachedResponse;
        }

        // Cache miss - fetch from network and cache
        return fetch(event.request).then((networkResponse) => {
          // Only cache successful responses
          if (networkResponse.ok) {
            // Clone the response since we need to use it twice
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((error) => {
          console.error('SW fetch failed:', error);
          // Could return a placeholder here if desired
          throw error;
        });
      });
    })
  );
});

// Optional: Listen for messages to clear cache
self.addEventListener('message', (event) => {
  if (event.data === 'clearCache') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('Image cache cleared');
    });
  }
});
