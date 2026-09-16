/* ==========================================================================
   Avyaan STEM Platform — Service Worker (offline support)
   Strategy: network-first with cache fallback.
   - Online: always serves fresh content and updates the cache in the background.
   - Offline: falls back to the last cached copy of the requested page.
   The offline cache is KEYED ON THE CONTENT VERSION served by /api/version:
   when the dataset version changes, the old cache is discarded on activate
   and rebuilt with the new assets — no manual cache busting needed.
   ========================================================================== */

const CACHE_PREFIX = 'avyaan-content';
const FALLBACK_CACHE = CACHE_PREFIX + '-unknown';
// NOTE: keep the ?v= query strings in sync with index.html when you ship an update
const CORE_ASSETS = [
  './index.html',
  './library.html',
  './progress.html',
  './about.html',
  './why.html',
  './coverage.html',
  './privacy.html',
  './terms.html',
  './refund.html',
  './parental-consent.html',
  './safety.html',
  './contact.html',
  './support.html',
  './style.css?v=64',
  './app.js?v=64',
  './stem_data.js?v=64',
  './js/api_client.js?v=64',
  './js/payment_gateway.js?v=64',
  './js/app_core.js?v=64',
  './js/site_nav.js?v=64',
  './js/vocab_data.js?v=64',
  './favicon.svg',
  './manifest.webmanifest',
  './robots.txt',
  './sitemap.xml'
];

let CURRENT_CACHE = FALLBACK_CACHE;

function resolveCacheName() {
  return fetch('/api/version', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (data) { return CACHE_PREFIX + '-' + (data.version || 'unknown'); })
    .catch(function () { return FALLBACK_CACHE; });
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    resolveCacheName().then(function (name) {
      CURRENT_CACHE = name;
      return caches.open(CURRENT_CACHE)
        .then(function (cache) { return cache.addAll(CORE_ASSETS); });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    Promise.all([
      // Remove any cache from an older content version (and the legacy pre-versioning cache)
      caches.keys().then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) { return key !== CURRENT_CACHE && (key.startsWith(CACHE_PREFIX) || key === 'avyaan-v2'); })
            .map(function (key) { return caches.delete(key); })
        );
      }),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  // Only handle GET requests for same-origin public pages and assets. Never
  // cache API or authenticated responses: cache keys do not include identity.
  const requestUrl = new URL(request.url);
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin || requestUrl.pathname === '/api' || requestUrl.pathname.startsWith('/api/')) {
    return;
  }
  event.respondWith(
    fetch(request)
      .then(function (response) {
        // Cache successful same-origin responses for offline fallback
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          event.waitUntil(caches.open(CURRENT_CACHE).then(function (cache) { return cache.put(request, copy); }));
        }
        return response;
      })
      .catch(function () {
        return caches.match(request).then(function (cached) {
          if (cached) return cached;
          // Lazy bundles may be requested WITHOUT their ?v= query (e.g. when
          // /api/version was unreachable at boot). Match the precached
          // versioned copy by stripping the query string.
          var noQuery = new URL(request.url);
          noQuery.search = '';
          if (noQuery.toString() !== request.url) {
            return caches.match(noQuery.toString());
          }
          // Only the root route may fall back to the home page. Returning the
          // homepage for an uncached legal/product route creates a misleading
          // navigation result; make the offline state explicit instead.
          if (request.mode === 'navigate' && (requestUrl.pathname === '/' || requestUrl.pathname === '/index.html')) {
            return caches.match('./index.html');
          }
          if (request.mode === 'navigate') {
            return new Response('<!doctype html><title>Skill X offline</title><main style="font-family:system-ui;padding:2rem"><h1>You are offline</h1><p>Reconnect to open this page. Your saved learner progress remains on this device.</p><a href="/index.html">Return to Skill X</a></main>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
          }
          return undefined;
        });
      })
  );
});
