const SOURCES = new Set(['products', 'play', 'playstore']);
const INTERESTS = new Set(['portfolio', 'play', 'apps', 'pramana', 'feedback']);
const OTP_TTL_SECONDS = 600;
const REQUEST_PAUSE_MS = 60_000;
const REPEAT_PAUSE_MS = 86_400_000;
const MAX_BODY_BYTES = 4_096;
const CONSENT_VERSION = 'website-subscription-v1';
const PRIVACY_NOTICE_VERSION = 'website-2026-09-29';

const allowedOrigins = new Set([
  'https://annapurnaagenticsolutions.com',
  'https://www.annapurnaagenticsolutions.com',
  'https://play.annapurnaagenticsolutions.com',
  'http://127.0.0.1:8037',
  'http://localhost:8037'
]);

export const json = (value, status = 200, request) => {
  const origin = request?.headers.get('Origin');
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin'
  };
  if (origin && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return new Response(JSON.stringify(value), { status, headers });
};

export const originAllowed = request => {
  const origin = request.headers.get('Origin');
  return !origin || allowedOrigins.has(origin);
};

export const readBody = async request => {
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return null;
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_BODY_BYTES) return null;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

export const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max + 1) : '';
export const isEmail = email => email.length <= 254 && /^[^@\s]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/.test(email);
export const validSource = source => SOURCES.has(source);
export const validInterest = interest => !interest || INTERESTS.has(interest);
export const now = () => Date.now();
export const otpTtl = OTP_TTL_SECONDS;
export const requestPause = REQUEST_PAUSE_MS;
export const repeatPause = REPEAT_PAUSE_MS;
export const consentVersion = CONSENT_VERSION;
export const privacyNoticeVersion = PRIVACY_NOTICE_VERSION;

export async function sha256(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function keyFor(email) {
  return 'subscription:' + await sha256(email);
}

export function otpEmail(code) {
  return {
    from: 'Annapurna Agentic Solutions <noreply@annapurnaagenticsolutions.com>',
    subject: 'Confirm your Annapurna updates subscription',
    text: `Your Annapurna verification code is ${code}. It expires in 10 minutes.\n\nYou requested product, Play or feedback updates from Annapurna Agentic Solutions. If you did not request this, you can ignore this email.`
  };
}

export function options({ request }) {
  return json({ status: 'ok' }, 200, request);
}
