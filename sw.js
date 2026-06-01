const CACHE_NAME = "chord-ear-trainer-v19";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles.css?v=3",
  "./styles.css?v=4",
  "./styles.css?v=5",
  "./styles.css?v=6",
  "./styles.css?v=7",
  "./styles.css?v=8",
  "./styles.css?v=9",
  "./styles.css?v=10",
  "./styles.css?v=11",
  "./styles.css?v=12",
  "./styles.css?v=13",
  "./styles.css?v=14",
  "./styles.css?v=15",
  "./styles.css?v=16",
  "./styles.css?v=17",
  "./styles.css?v=18",
  "./styles.css?v=19",
  "./assets/level1.png",
  "./assets/level2.png",
  "./assets/level3.png",
  "./assets/samples/ATTRIBUTION.md",
  "./assets/samples/piano-A3.mp3",
  "./assets/samples/piano-A4.mp3",
  "./assets/samples/piano-C3.mp3",
  "./assets/samples/piano-C4.mp3",
  "./assets/samples/piano-C5.mp3",
  "./assets/samples/piano-Eb3.mp3",
  "./assets/samples/piano-Eb4.mp3",
  "./assets/samples/piano-Eb5.mp3",
  "./assets/samples/piano-Gb3.mp3",
  "./assets/samples/piano-Gb4.mp3",
  "./theory.js",
  "./theory.js?v=6",
  "./theory.js?v=7",
  "./theory.js?v=8",
  "./theory.js?v=9",
  "./theory.js?v=10",
  "./theory.js?v=11",
  "./theory.js?v=12",
  "./theory.js?v=13",
  "./theory.js?v=14",
  "./theory.js?v=15",
  "./theory.js?v=16",
  "./theory.js?v=17",
  "./theory.js?v=18",
  "./theory.js?v=19",
  "./app.js",
  "./app.js?v=3",
  "./app.js?v=4",
  "./app.js?v=5",
  "./app.js?v=6",
  "./app.js?v=7",
  "./app.js?v=8",
  "./app.js?v=9",
  "./app.js?v=10",
  "./app.js?v=11",
  "./app.js?v=12",
  "./app.js?v=13",
  "./app.js?v=14",
  "./app.js?v=15",
  "./app.js?v=16",
  "./app.js?v=17",
  "./app.js?v=18",
  "./app.js?v=19",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => (
      cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
    ))
  );
});
