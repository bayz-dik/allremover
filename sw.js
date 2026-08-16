// AllRemover service worker. Caches the app shell (same-origin files) so the
// UI opens offline, and caches the AI engine + model on first run so removal
// works fully offline afterwards.
//
// The engine (esm.sh) and the model data (staticimgly.com) are served with CORS
// (the library fetches them as ArrayBuffers), so their responses are readable
// and safe to cache. They live in a separate, un-versioned bucket so a shell
// bump doesn't force a multi-MB model re-download. Both are immutable, versioned
// URLs, so cache-first is correct: once cached, never re-fetch.
const CACHE = "allremover-v14";
const ENGINE_CACHE = "allremover-engine-v1";
// hosts that serve the immutable engine + model + Firebase SDK assets
const ENGINE_HOSTS = ["esm.sh", "staticimgly.com", "www.gstatic.com"];
const SHELL = [
  "./",
  "./index.html",
  "./about.html",
  "./privacy.html",
  "./terms.html",
  "./refund.html",
  "./contact.html",
  "./app.js",
  "./firebase-pro.js",
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
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE && k !== ENGINE_CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Engine + model (esm.sh, staticimgly.com): cache-first in a separate bucket.
  // These are large and immutable, so once fetched they serve offline forever.
  // esm.sh sends `Vary: User-Agent`, and the Cache API honors Vary on lookup —
  // but a SW Request can't read User-Agent, so a plain match() misses the cache
  // offline. ignoreVary makes the lookup succeed. (Safe here: same URL = same asset.)
  if (ENGINE_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req, { ignoreVary: true }).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          // cache successful responses; opaque (no-cors) responses have status 0
          // but are still replayable, so keep them too.
          if (res.ok || res.type === "opaque") {
            const copy = res.clone();
            caches.open(ENGINE_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
      )
    );
    return;
  }

  if (url.origin !== location.origin) return; // other cross-origin (ads) hit network

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
