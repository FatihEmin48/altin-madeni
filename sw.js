// Service worker: uygulama kabuğunu önbelleğe alır → çevrimdışı açılır,
// tekrar açılışlar hızlanır. GitHub Pages alt yolunda çalışsın diye tüm yollar
// göreli (./) — kapsam sw.js'in bulunduğu klasördür.
// Dosyaları güncelleyince CACHE sürümünü artır (eski önbellek temizlenir).
const CACHE = 'altin-madeni-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './js/format.js',
  './js/config.js',
  './js/game.js',
  './js/sound.js',
  './js/cloud.js',
  './js/ui.js',
  './js/main.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Dış kaynaklar (Supabase CDN/API) önbelleğe alınmaz — ağa bırakılır.
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      const c = await caches.open(CACHE);
      c.put(req, res.clone());
      return res;
    } catch (err) {
      // Çevrimdışı gezinme → uygulama kabuğu (index.html).
      if (req.mode === 'navigate') return caches.match('./index.html');
      throw err;
    }
  })());
});
