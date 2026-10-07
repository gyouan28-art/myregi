// マイレジ オフライン用サービスワーカー
// 一度読み込んだ画面を端末に保存し、電波がなくても開けるようにする。
// 売上などのデータは扱わない（データは今まで通り localStorage に保存）。
// 版を上げるときは、index.html の APP_VERSION と同じ文字にそろえる（違うと「新しい版があります」が出る）
const VERSION = '2026-10-07c';
const CACHE = 'myregi-' + VERSION;
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-v2-192.png', './icon-v2-512.png'];

self.addEventListener('install', event => {
  // 'reload' でブラウザの一時保存を通さず、必ず公開中の最新ファイルを取り込む
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
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

// 画面から「版は？」と聞かれたら答える（画面の版と違えば、画面が更新の案内を出す）
self.addEventListener('message', event => {
  if (event.data === 'version?' && event.source) event.source.postMessage({ version: VERSION });
});
