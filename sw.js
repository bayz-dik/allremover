// AllRemover service worker. Caches the app shell (same-origin files) so the
// UI opens offline. The AI engine + jszip load from esm.sh (cross-origin) and
// are cached by the browser's own HTTP cache after first run — we deliberately
// don't try to cache opaque cross-origin responses here.
const CACHE = "allremover-v1";
const SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./config.js",
  "./logo.svg",
  "./sample.png",
  "./favicon-32.png",
  "./icon-192.png",
  "./icon-512.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // let cross-origin (esm.sh, ads) hit network

  // cache-first for the shell, fall back to network and cache fresh GETs
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit)
    )
  );
});
