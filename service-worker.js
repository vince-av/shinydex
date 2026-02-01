const CACHE_NAME = "shinydex-v7";

const STATIC_ASSETS = [
  "./style.css",
  "./app.js",
  "./manifest.json"
];

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const { request } = event;

  // 🟢 HTML SIEMPRE desde red
  if (request.mode === "navigate") {
    event.respondWith(fetch(request));
    return;
  }

  // 🟡 Assets desde caché
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request);
    })
  );
});
