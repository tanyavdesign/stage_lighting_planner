// Service worker: keeps a copy of the app on the device so it opens without a connection.
//
// The app's own files are fetched from the network first, so a new version shows up as
// soon as there is a connection; the saved copy is only used when there is none. Files
// from elsewhere (the 3D library, the font) rarely change, so their saved copy is used
// straight away and refreshed in the background.
const CACHE = 'stage-lighting-v22';
const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png', 'icons/icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
];

self.addEventListener('install', (event) => {
  // Save what we can; one file failing (say, no connection to the 3D library) must not stop the rest.
  event.waitUntil(caches.open(CACHE)
    .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
    .then(() => self.clients.claim()));
});

const save = (request, response) => {
  if (response && (response.ok || response.type === 'opaque')) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const own = new URL(request.url).origin === self.location.origin;
  if (own) {
    // The app's files carry a ?v= number; offline, any saved copy of the same file will do.
    event.respondWith(fetch(request)
      .then((response) => save(request, response))
      .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))));
  } else {
    event.respondWith(caches.match(request).then((hit) => {
      const fresh = fetch(request).then((response) => save(request, response)).catch(() => hit);
      return hit || fresh;
    }));
  }
});
