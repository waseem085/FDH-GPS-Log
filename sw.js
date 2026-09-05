const CACHE_NAME = 'fdh-gps-logger-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){ return cache.addAll(APP_SHELL); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Cache-first for the app shell, network passthrough for everything else (e.g. the Sheet sync POST).
self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return; // don't intercept the Apps Script sync call

  event.respondWith(
    caches.match(event.request).then(function(cached){
      return cached || fetch(event.request).then(function(resp){
        return caches.open(CACHE_NAME).then(function(cache){
          cache.put(event.request, resp.clone());
          return resp;
        });
      }).catch(function(){ return cached; });
    })
  );
});
