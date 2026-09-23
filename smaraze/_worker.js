/*
 * Cloudflare Pages Advanced Mode entry point.
 *
 * Static assets stay on Cloudflare's edge. API requests are proxied to the
 * separately deployed FastAPI origin so the browser uses one same-origin
 * URL and no CORS credentials need to be exposed in the frontend.
 */

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
  "img-src 'self' data: blob: https://*.razorpay.com",
  "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com",
  "worker-src 'self' blob:",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

function withSecurityHeaders(response, cacheControl) {
  const secured = new Response(response.body, response);
  secured.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  secured.headers.set('X-Content-Type-Options', 'nosniff');
  secured.headers.set('X-Frame-Options', 'DENY');
  secured.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  secured.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (cacheControl) {
    secured.headers.set('Cache-Control', cacheControl);
  }
  return secured;
}

function jsonError(status, detail) {
  return new Response(JSON.stringify({ detail }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function proxyApi(request, env) {
  const apiOrigin = String(env.API_ORIGIN || '').replace(/\/+$/, '');
  if (!apiOrigin) {
    return jsonError(503, 'API is not configured');
  }

  const incoming = new URL(request.url);
  let upstream;
  try {
    upstream = new URL(`${incoming.pathname}${incoming.search}`, `${apiOrigin}/`);
  } catch (_error) {
    return jsonError(500, 'API configuration is invalid');
  }

  const headers = new Headers(request.headers);
  // The upstream should see its own Host header. Preserve authentication and
  // content headers, while forwarding the original host/protocol for logs.
  headers.delete('Host');
  headers.delete('Content-Length');
  headers.delete('Origin');
  // Do not pass through spoofable forwarding headers from the browser.
  headers.delete('X-Forwarded-For');
  const connectingIp = headers.get('CF-Connecting-IP');
  if (connectingIp) headers.set('X-Forwarded-For', connectingIp);
  headers.set('X-Forwarded-Host', incoming.host);
  headers.set('X-Forwarded-Proto', incoming.protocol.replace(':', ''));

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  try {
    const response = await fetch(upstream, init);
    return withSecurityHeaders(response, 'no-store');
  } catch (_error) {
    return jsonError(502, 'API origin unavailable');
  }
}

const PAGE_ROUTES = {
  '/': '/index.html',
  '/library': '/library.html',
  '/progress': '/progress.html',
  '/why': '/why.html',
  '/about': '/about.html',
  '/coverage': '/coverage.html',
  '/contact': '/contact.html',
  '/support': '/support.html',
  '/privacy': '/privacy.html',
  '/terms': '/terms.html',
  '/refund': '/refund.html',
  '/parental-consent': '/parental-consent.html',
  '/safety': '/safety.html',
  '/class-coverage': '/class-coverage.html',
  '/curriculum': '/curriculum.html',
  '/knowledge-map': '/knowledge-map.html',
  '/board-prep': '/board-prep.html',
  '/mixed-review': '/mixed-review.html',
  '/spaced-review': '/spaced-review.html',
};

function assetContentType(pathname) {
  const path = pathname.toLowerCase().split('?')[0];
  if (path.endsWith('.html') || path === '/' || path.endsWith('/')) return 'text/html; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.js') || path.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.webmanifest')) return 'application/manifest+json; charset=utf-8';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.ico')) return 'image/x-icon';
  if (path.endsWith('.mp4')) return 'video/mp4';
  if (path.endsWith('.webm')) return 'video/webm';
  if (path.endsWith('.woff2')) return 'font/woff2';
  if (path.endsWith('.woff')) return 'font/woff';
  if (path.endsWith('.txt')) return 'text/plain; charset=utf-8';
  if (path.endsWith('.xml')) return 'application/xml; charset=utf-8';
  return null;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'skillx.smaraze.com') {
      const target = new URL(request.url);
      target.hostname = 'smaraze.com';
      target.protocol = 'https:';
      return new Response(null, {
        status: 301,
        headers: {
          Location: target.toString(),
          'Cache-Control': 'public, max-age=300',
        },
      });
    }
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return proxyApi(request, env);
    }

    const routeKey = url.pathname.length > 1 && url.pathname.endsWith('/')
      ? url.pathname.slice(0, -1)
      : url.pathname;
    const targetPath = (request.method === 'GET' || request.method === 'HEAD')
      ? (PAGE_ROUTES[routeKey] || url.pathname)
      : url.pathname;
    const targetUrl = new URL(request.url);
    targetUrl.pathname = targetPath;
    const assetRequest = targetPath === url.pathname
      ? request
      : new Request(targetUrl.toString(), {
          method: request.method,
          headers: request.headers,
          redirect: 'manual',
        });
    const asset = await env.ASSETS.fetch(assetRequest);
    const isVersioned = url.searchParams.has('v');
    const secured = withSecurityHeaders(
      asset,
      isVersioned ? 'public, max-age=31536000, immutable' : 'no-cache',
    );
    const contentType = assetContentType(targetPath);
    if (contentType) secured.headers.set('Content-Type', contentType);
    if (targetPath.endsWith('/stem_data.js') && contentType === 'text/javascript; charset=utf-8') {
      const source = await secured.text();
      try {
        const marker = 'const AVYAAN_DATA =';
        const markerIndex = source.indexOf(marker);
        const dataStart = markerIndex + marker.length;
        const exportIndex = source.indexOf('if (typeof module', dataStart);
        const dataEnd = exportIndex > dataStart ? source.lastIndexOf(';', exportIndex) : source.indexOf(';', dataStart);
        const publicData = JSON.parse(source.slice(dataStart, dataEnd).trim());
        delete publicData.demoUsers;
        const prices = { primary_paid: '1999 + GST/year; 999 + GST/6 months', pro_paid: '2999 + GST/year; 1499 + GST/6 months', master_paid: '4000 + GST/year; 2000 + GST/6 months' };
        for (const [id, tier] of Object.entries(publicData.tiers || {})) if (prices[id]) tier.price = prices[id];
        const rewritten = new Response(source.slice(0, dataStart) + '\\n' + JSON.stringify(publicData) + '\\n;', secured);
        rewritten.headers.set('Content-Type', 'text/javascript; charset=utf-8');
        rewritten.headers.set('Cache-Control', 'no-cache');
        return rewritten;
      } catch (_) { return jsonError(503, 'Public learning bundle unavailable'); }
    }    if (contentType && contentType.startsWith('text/html')) {
      secured.headers.set('Content-Type', 'text/html; charset=utf-8');
      return secured;
    }
    return secured;
  },
};
