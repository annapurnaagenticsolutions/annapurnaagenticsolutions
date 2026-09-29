const CACHE_NAME = "paheli-bazaar-v03-showcase";
const ASSETS = [
  "./", "./index.html", "./styles.css", "./app.js", "./manifest.json",
  "./data/shops.json", "./data/puzzles.json", "./data/rounds.json", "./data/titles.json", "./data/reactions.json",
  "./assets/icons/app-icon-192.png", "./assets/icons/app-icon-512.png"
];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))); });
self.addEventListener("fetch", event => { event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))); });
