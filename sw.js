const CACHE_NAME = 'fdh-gps-logger-v9';
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

// Network-first for the app shell (HTML/manifest) so a new deploy shows up
// immediately. Falls back to the cached copy only when there's no connection.
// Icons rarely change, so those stay cache-first.
self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return; // don't intercept the Apps Script sync call

  const isAppShellDoc = event.request.mode === 'navigate' ||
    url.pathname.endsWith('.html') || url.pathname.endsWith('manifest.json') || url.pathname === '/' || url.pathname.endsWith('/');

  if(isAppShellDoc){
    event.respondWith(
      fetch(event.request).then(function(resp){
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, resp.clone()); });
        return resp;
      }).catch(function(){ return caches.match(event.request); })
    );
    return;
  }

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
