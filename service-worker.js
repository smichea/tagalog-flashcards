const CACHE_NAME = 'tagalog-flashcards-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/flashcards.csv',
  '/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        return response; // Serve from cache
      }
      // Otherwise, fetch from network and update cache
      return fetch(request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(request, networkResponse.clone());
          return networkResponse;
        });
      });
    }).catch(() => {
      // Fallback if both cache and network fail
      if (request.url.endsWith('flashcards.csv')) {
        return new Response('Tagalog,English\n', { headers: { 'Content-Type': 'text/csv' } });
      }
    })
  );
});
