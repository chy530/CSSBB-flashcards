// Offline support. Every file is served from the cache first so the app opens
// instantly and works without a connection; each launch also checks the
// network in the background, so updated content appears on the next launch.
const CACHE = 'cssbb-cards-v1';
const CORE = ['./', 'index.html', 'styles.css', 'app.js', 'data/cards.json',
  'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const fresh = fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  });
  e.waitUntil(fresh.then(() => {}, () => {}));
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fresh));
});
