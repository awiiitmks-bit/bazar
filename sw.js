// Service worker Cek Harga Bazar
// Ubah VERSION kalau mengganti daftar file di SHELL agar cache lama dibersihkan.
const VERSION = 'v1';
const CACHE = 'cekharga-' + VERSION;

const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    await Promise.all(CDN.map(u => fetch(u, {mode: 'no-cors'}).then(r => c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('cekharga-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// File milik sendiri (index.html, data.json, dll): ambil dari internet dulu agar selalu terbaru,
// kalau offline pakai salinan terakhir.
async function networkFirst(req) {
  const c = await caches.open(CACHE);
  const u = new URL(req.url);
  const key = u.origin + u.pathname; // abaikan ?v=... dan ?admin
  try {
    const res = await fetch(req);
    if (res && res.ok) c.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await c.match(key);
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const idx = (await c.match('./index.html')) || (await c.match('./'));
      if (idx) return idx;
    }
    throw err;
  }
}

// Library dari CDN: pakai cache dulu supaya bisa jalan offline.
async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req.url);
  if (hit) return hit;
  const res = await fetch(req);
  c.put(req.url, res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) e.respondWith(networkFirst(req));
  else if (CDN.includes(req.url)) e.respondWith(cacheFirst(req));
});
