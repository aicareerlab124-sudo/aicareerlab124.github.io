/* Offline support for the AI Career Lab site. Bump VERSION when you upload a new index.html to clear old copies. */
const VERSION = "acl-v1";
const PAGE = VERSION + "-page", LIBS = "acl-libs-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(PAGE).then(c => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== PAGE && k !== LIBS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // The page itself: try the network first so updates show, fall back to the saved copy offline.
  if (req.mode === "navigate" || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(PAGE).then(c => c.put("./index.html", copy)); return r; })
      .catch(() => caches.match("./index.html").then(r => r || caches.match("./"))));
    return;
  }
  // Python (Pyodide) and fonts never change for a given address: keep them after the first download.
  if (url.hostname === "cdn.jsdelivr.net" && url.pathname.startsWith("/pyodide/") || url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com") {
    e.respondWith(caches.open(LIBS).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }))));
    return;
  }
  // Small files next to the page (icons, data): cache as they are used.
  if (url.origin === location.origin && !/\.(mp4|webm)$/.test(url.pathname) && !url.pathname.endsWith("admin.html")) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(PAGE).then(c => c.put(req, copy)); } return r; })));
  }
});
