/**
 * Public Pramana email receipt request. Cloudflare Pages Function: POST /api/lead/submit.
 * Uses PRAMANA_LEADS (D1), PRAMANA_OTP (KV), and RESEND_API_KEY bindings.
 * Questionnaire answers live only in short-lived KV until the address is verified.
 */
const TOPICS = ['map', 'roles', 'purpose', 'notice', 'providers', 'security', 'retention',
  'requests', 'evidence', 'children', 'automated', 'sdf', 'transfers', 'scope'];
const ANSWERS = new Set(['in-place', 'partial', 'not-in-place', 'unsure', 'na']);
const CONTEXTS = new Set(['service', 'care', 'education', 'finance', 'workforce', 'commerce']);
const SIZES = new Set(['', '1-10', '11-50', '51-250', '251+']);
const OTP_TTL_SECONDS = 600;
const REQUEST_PAUSE_MS = 60_000;
const REPEAT_PAUSE_MS = 86_400_000;
const MAX_BODY_BYTES = 8_192;

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }
});

const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max + 1) : '';
const validEmail = email => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/.test(email) && email.length <= 254;
const toUtc = value => value ? Date.parse(value.includes('T') ? value : value.replace(' ', 'T') + 'Z') : NaN;

async function keyFor(email) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email));
  return 'otp:' + [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
async function readBody(request) {
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return null;
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_BODY_BYTES) return null;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function ownOrigin(request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function onRequestPost({ request, env }) {
  if (!ownOrigin(request)) return json({ error: 'origin_not_allowed', message: 'Open the check on the Pramana website and try again.' }, 403);
  if (!env.PRAMANA_LEADS || !env.PRAMANA_OTP || !env.RESEND_API_KEY) {
    return json({ error: 'email_unavailable', message: 'Email is temporarily unavailable. You can still print your notes.' }, 503);
  }
  const body = await readBody(request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'invalid_request', message: 'Please check the form and try again.' }, 400);
  }
  if (body.website) return json({ status: 'request_received' });

  const name = clean(body.name, 100);
  const email = clean(body.email, 254).toLowerCase();
  const organization = clean(body.organization, 120);
  const role = clean(body.role, 80);
  const companySize = clean(body.company_size, 10);
  const sector = clean(body.sector, 20);
  const answers = body.answers;
  if (!name || name.length > 100 || !role || role.length > 80 || !validEmail(email)
    || organization.length > 120 || !SIZES.has(companySize) || !CONTEXTS.has(sector)
    || body.email_request !== true || typeof body.contact_me !== 'boolean'
    || !answers || typeof answers !== 'object' || Array.isArray(answers)
    || Object.keys(answers).length !== TOPICS.length
    || !TOPICS.every(topic => ANSWERS.has(answers[topic]))) {
    return json({ error: 'invalid_fields', message: 'Please complete your contact details and all 14 questions.' }, 400);
  }

  const now = Date.now();
  const key = await keyFor(email);
  let wrotePending = false;
  try {
    const recent = await env.PRAMANA_LEADS.prepare(
      'SELECT resend_at FROM report_requests WHERE email = ? AND resend_at IS NOT NULL ORDER BY id DESC LIMIT 1'
    ).bind(email).first();
    const existing = await env.PRAMANA_LEADS.prepare(
      'SELECT created_at, resend_at, consent_ver FROM leads WHERE email = ?'
    ).bind(email).first();
    const lastVerified = Math.max(toUtc(recent?.resend_at) || 0,
      toUtc(existing?.resend_at || (existing?.consent_ver === 'email-check-v2' ? null : existing?.created_at)) || 0);
    if (Number.isFinite(lastVerified) && now - lastVerified < REPEAT_PAUSE_MS) {
      return json({ status: 'request_received' });
    }
    const pending = await env.PRAMANA_OTP.get(key, { type: 'json' });
    if (pending && pending.expires_at > now && now - pending.sent_at < REQUEST_PAUSE_MS) {
      return json({ status: 'request_received' });
    }

    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const code = String(random[0] % 1_000_000).padStart(6, '0');
    const nonce = crypto.randomUUID();
    const pendingValue = {
      code_hash: await digest(nonce + ':' + code), nonce,
      email, name, organization, role, company_size: companySize, sector,
      contact_me: body.contact_me, answers,
      sent_at: now, expires_at: now + OTP_TTL_SECONDS * 1000, attempts: 0
    };
    await env.PRAMANA_OTP.put(key, JSON.stringify(pendingValue), { expirationTtl: OTP_TTL_SECONDS });
    wrotePending = true;
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'pramana-code-' + nonce
      },
      body: JSON.stringify({
        from: 'Pramana by Annapurna <noreply@annapurnaagenticsolutions.com>',
        to: [email],
        subject: 'Your Pramana verification code',
        text: 'Your Pramana verification code is ' + code + '. It expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.\n\nAnnapurna Agentic Solutions'
      })
    });
    if (!sent.ok) {
      await env.PRAMANA_OTP.delete(key);
      return json({ error: 'email_unavailable', message: 'We could not send the code. Please try again later, or print your notes.' }, 503);
    }
    return json({ status: 'request_received' });
  } catch {
    if (wrotePending) { try { await env.PRAMANA_OTP.delete(key); } catch {} }
    return json({ error: 'email_unavailable', message: 'Email is temporarily unavailable. You can still print your notes.' }, 503);
  }
}
