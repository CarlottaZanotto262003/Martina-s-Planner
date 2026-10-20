/* Service worker: rende il sito utilizzabile offline (solo i file dell'app; i dati stanno in localStorage). */
const CACHE = 'martina-planner-v1';
const FILES = [
  './', 'index.html', 'manifest.json', 'css/style.css',
  'js/config.js', 'js/quotes.js', 'js/store.js', 'js/app.js',
  'js/views-home.js', 'js/views-subjects.js', 'js/views-thesis.js', 'js/views-exams.js', 'js/views-calendar.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;        // Google Fonts e Apps Script vanno in rete
  // Prima la rete (così gli aggiornamenti arrivano subito), cache come ripiego offline.
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  );
});
