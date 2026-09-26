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
const RELEASE_VERSION = '2026.09.13.115';
const FALLBACK_CACHE = CACHE_PREFIX + '-' + RELEASE_VERSION;
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
  './evidence.html',
  './style.css?v=115',
  './app.js?v=115',
  './stem_data.js?v=115',
  './js/api_client.js?v=115',
  './js/learning_telemetry.js?v=115',
  './js/payment_gateway.js?v=115',
  './js/app_core.js?v=115',
  './js/site_nav.js?v=115',
  './js/vocab_data.js?v=115',
  './js/i18n.js?v=115',
  './js/context_library.js?v=115',
  './js/challenge_library.js?v=115',
  './js/offscreen_library.js?v=115',
  './js/aha_engines.js?v=115',
  './js/topic_roles.js?v=115',
  './js/concept_graph.js?v=115',
  './favicon.svg',
  './manifest.webmanifest',
  './robots.txt',
  './sitemap.xml'
];

// Canonical offline navigation targets. The edge Worker maps these aliases
// online; the service worker must map them too so direct links still work offline.
const OFFLINE_NAVIGATION_MAP = {
  '/': './index.html',
  '/index.html': './index.html',
  '/library': './library.html',
  '/library.html': './library.html',
  '/progress': './progress.html',
  '/progress.html': './progress.html',
  '/why': './why.html',
  '/why.html': './why.html',
  '/about': './about.html',
  '/about.html': './about.html',
  '/coverage': './coverage.html',
  '/coverage.html': './coverage.html',
  '/contact': './contact.html',
  '/contact.html': './contact.html',
  '/support': './support.html',
  '/support.html': './support.html',
  '/privacy': './privacy.html',
  '/privacy.html': './privacy.html',
  '/terms': './terms.html',
  '/terms.html': './terms.html',
  '/refund': './refund.html',
  '/refund.html': './refund.html',
  '/parental-consent': './parental-consent.html',
  '/parental-consent.html': './parental-consent.html',
  '/safety': './safety.html',
  '/safety.html': './safety.html',
  '/evidence': './evidence.html',
  '/evidence.html': './evidence.html',
};

let CURRENT_CACHE = FALLBACK_CACHE;

function resolveCacheName() {
  return Promise.resolve(CACHE_PREFIX + '-' + RELEASE_VERSION);
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
        // Ignore query strings so versioned and unversioned requests share the
        // same safe cached asset instead of producing a false offline miss.
        return caches.match(request, { ignoreSearch: true }).then(function (cached) {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            const target = OFFLINE_NAVIGATION_MAP[requestUrl.pathname];
            if (target) {
              return caches.match(target, { ignoreSearch: true }).then(function (page) {
                if (page) return page;
                return new Response('<!doctype html><title>Skill X offline</title><main style="font-family:system-ui;padding:2rem"><h1>You are offline</h1><p>Reconnect to open this page. Your saved learner progress remains on this device.</p><a href="/index.html">Return to Skill X</a></main>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
              });
            }
            return new Response('<!doctype html><title>Skill X offline</title><main style="font-family:system-ui;padding:2rem"><h1>You are offline</h1><p>Reconnect to open this page. Your saved learner progress remains on this device.</p><a href="/index.html">Return to Skill X</a></main>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
          }
          return undefined;
        });
      })
  );
});
