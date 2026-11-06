/* Score Snap service worker: app shell precache + sound files cached on first use */
const CORE = 'scoresnap-core-9bf63552', SF = 'scoresnap-sf-v1';
const FILES = ["./", "index.html", "fonts.css", "lib/abcjs-basic-min.js", "lib/pdf.min.js", "lib/pdf.worker.min.js", "manifest.webmanifest", "config.js", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon.png", "sf/000.mp3", "fonts/anuphan-latin-400-normal.woff2", "fonts/anuphan-latin-500-normal.woff2", "fonts/anuphan-latin-600-normal.woff2", "fonts/anuphan-latin-700-normal.woff2", "fonts/anuphan-thai-400-normal.woff2", "fonts/anuphan-thai-500-normal.woff2", "fonts/anuphan-thai-600-normal.woff2", "fonts/anuphan-thai-700-normal.woff2", "fonts/ibm-plex-mono-latin-400-normal.woff2", "fonts/ibm-plex-mono-latin-500-normal.woff2"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CORE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('scoresnap-core-') && k !== CORE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (/\/sf\/\d{3}\.mp3$/.test(url.pathname)) {
    e.respondWith(caches.open(SF).then(async c => { const hit = await c.match(req, { ignoreSearch:true }); if (hit) return hit; const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; }));
    return;
  }
  if (req.mode === 'navigate' || /\/config\.js$/.test(url.pathname)) {
    if (req.mode !== 'navigate') { e.respondWith(fetch(req.url, { cache: 'no-cache' }).then(r => { const cp = r.clone(); caches.open(CORE).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req))); return; }
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => { const cp = r.clone(); caches.open(CORE).then(c => c.put('index.html', cp)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch:true }).then(hit => hit || fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CORE).then(c => c.put(req, cp)); } return r; })));
});
