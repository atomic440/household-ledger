// The Household Ledger service worker.
// All paths are relative to this file, so it works at the site root or in a
// GitHub Pages project subdirectory (e.g. https://user.github.io/household-ledger/).
// Bump VERSION whenever you deploy changed files so phones pick up the update.
const VERSION = 'ledger-v1.0.0';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './css/styles.css',
  './js/app.js', './js/data.js', './js/engine.js', './js/db.js', './js/backup.js',
  './fonts/cormorant-garamond-latin-500-normal.woff2', './fonts/cormorant-garamond-latin-600-normal.woff2', './fonts/cormorant-garamond-latin-700-normal.woff2',
  './fonts/cormorant-garamond-latin-500-italic.woff2', './fonts/cormorant-garamond-latin-600-italic.woff2',
  './fonts/inter-latin-400-normal.woff2', './fonts/inter-latin-500-normal.woff2', './fonts/inter-latin-600-normal.woff2', './fonts/inter-latin-700-normal.woff2',
  './icons/favicon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  // Page navigations: network first, fall back to the cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { caches.open(VERSION).then((c) => c.put('./index.html', res.clone())); return res; })
      .catch(() => caches.match('./index.html', { ignoreSearch: true })));
    return;
  }
  // App files: stale-while-revalidate.
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
