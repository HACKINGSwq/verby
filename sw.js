const CACHE = 'verby-v79';
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(['/', '/index.html', '/manifest.json', '/app.js']).catch(() => {})
    )
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks =>
      Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin) return;
  if (u.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }
  if (/\.(js|css|html|json)$/.test(u.pathname) || u.pathname === '/') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(r => {
          if (r.ok) {
            const c = r.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, c)).catch(() => {});
          }
          return r;
        })
        .catch(() => caches.match(e.request).then(x => x || caches.match('/index.html')))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
