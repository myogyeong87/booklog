const CACHE = 'booklog-v3';
const STATIC = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // HTML(페이지 탐색)은 항상 네트워크에서 직접 — 배포 즉시 반영
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')));
    return;
  }

  // 아이콘·manifest 등 정적 파일만 캐시 우선
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
