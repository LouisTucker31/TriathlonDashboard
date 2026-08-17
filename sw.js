const CACHE_NAME = "triathlon-dashboard-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./css/calendar.css",
  "./js/utils.js",
  "./js/dialogs.js",
  "./js/storage.js",
  "./js/planStore.js",
  "./js/csvImport.js",
  "./js/calendar.js",
  "./js/dashboard.js",
  "./js/sessionModal.js",
  "./js/app.js",
  "./assets/favicon.ico",
  "./assets/icon.svg",
  "./assets/icon-32.png",
  "./assets/icon-180.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for the app shell, falling back to network; network requests
// that succeed also refresh the cache so updates eventually propagate.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
