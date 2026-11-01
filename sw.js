// Offline support with automatic updates.
// The game files are checked online every time the app opens; the saved copy is
// used only when there is no connection, so new versions arrive on their own.
const CACHE = 'afa-cache';
const CORE = ['./', './index.html', './firebase-config.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './fonts/sniglet-latin-400-normal.woff2', './fonts/sniglet-latin-800-normal.woff2',
  './fonts/lexend-latin-400-normal.woff2', './fonts/lexend-latin-600-normal.woff2', './fonts/lexend-latin-800-normal.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if(req.method !== 'GET' || url.origin !== location.origin) return;   // Firebase sync goes straight to the network
  const isAsset = /\/(fonts|icons)\//.test(url.pathname);
  if(isAsset){
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); return res })));
    return;
  }
  // Game files: try the network first (with a short timeout), fall back to the saved copy.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try{
      const res = await Promise.race([fetch(req, {cache:'no-cache'}), new Promise((_, rej) => setTimeout(() => rej('timeout'), 4000))]);
      if(res && res.ok){ cache.put(req, res.clone()); return res }
      throw 'bad';
    }catch(err){
      return (await cache.match(req, {ignoreSearch:true})) || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
    }
  })());
});
