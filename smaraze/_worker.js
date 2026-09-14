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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return proxyApi(request, env);
    }

    const asset = await env.ASSETS.fetch(request);
    const isVersioned = url.searchParams.has('v');
    return withSecurityHeaders(
      asset,
      isVersioned ? 'public, max-age=31536000, immutable' : 'no-cache',
    );
  },
};
