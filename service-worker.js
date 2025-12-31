
const CACHE_NAME = 'fruit-block-blast-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://www.transparenttextures.com/patterns/cubes.png',
  'https://amfnhqsrjrtcdtslpbas.supabase.co/storage/v1/object/public/images/icon-fruitblockblast.png'
];

self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', (event) => {
  // Claim clients immediately
  event.waitUntil(self.clients.claim());

  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Stale-While-Revalidate Strategy
  // 1. Return from cache if available (fast)
  // 2. Update cache from network (fresh for next time)
  // 3. Fallback to network if not in cache
  
  // Skip non-GET requests and chrome-extension schemes
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
     return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // If valid response, update cache
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
           // Network failed
           return response;
        });

        // Return cached response immediately if available, else wait for network
        return response || fetchPromise;
      });
    })
  );
});
