// マイレジ オフライン用サービスワーカー
// 一度読み込んだ画面を端末に保存し、電波がなくても開けるようにする。
// 売上などのデータは扱わない（データは今まで通り localStorage に保存）。
const CACHE = 'myregi-v4';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-v2-192.png', './icon-v2-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 保存してある画面をすぐ出し、電波があれば裏で最新版に入れ替える（次回起動から反映）
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
    const network = fetch(req)
      .then(res => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
      .catch(() => cached);
    return cached || network;
  }));
});
