/* Skill X API Worker
 * Cloudflare-native API foundation for smaraze.com.
 *
 * This service deliberately stores preview metadata only in D1. Full lesson
 * bodies and answer keys must be added through the authenticated entitlement
 * path once the content migration is complete.
 */

const PLANS = [
  { id: 'band_1_4', name: 'Classes 1–4 (Foundational STEM)', min_grade: 1, max_grade: 4, prices: { '6m': 999, '1y': 1999 } },
  { id: 'band_5_7', name: 'Classes 5–7 (Preparatory STEM)', min_grade: 5, max_grade: 7, prices: { '6m': 1499.5, '1y': 2999 } },
  { id: 'band_8_10', name: 'Classes 8–10 (Secondary & Board Prep)', min_grade: 8, max_grade: 10, prices: { '6m': 2000, '1y': 4000 } },
];

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extra } });
}

function cors(request, response) {
  const origin = request.headers.get('Origin');
  if (origin === 'https://smaraze.com' || origin === 'https://www.smaraze.com') {
    response.headers.set('access-control-allow-origin', origin);
    response.headers.set('access-control-allow-credentials', 'true');
    response.headers.set('vary', 'Origin');
  }
  return response;
}

function b64u(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function unb64u(value) {
  const s = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const raw = atob(s);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function hex(bytes) { return [...bytes].map(x => x.toString(16).padStart(2, '0')).join(''); }
function uuid() { return crypto.randomUUID(); }

async function pbkdf2(password, saltBytes, iterations = 100000) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' }, key, 256);
  return new Uint8Array(bits);
}
async function hashPassword(password) {
  if (typeof password !== 'string' || new TextEncoder().encode(password).byteLength > 72) throw new Error('Password must be at most 72 UTF-8 bytes.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  return `pbkdf2$${iterations}$${b64u(salt)}$${b64u(await pbkdf2(password, salt, iterations))}`;
}
async function verifyPassword(password, encoded) {
  try {
    const [scheme, iterText, saltText, digestText] = String(encoded).split('$');
    if (scheme !== 'pbkdf2') return false;
    const iterations = Number(iterText);
    if (!Number.isInteger(iterations) || iterations < 10000 || iterations > 100000) return false;
    const got = await pbkdf2(password, unb64u(saltText), iterations);
    const want = unb64u(digestText);
    if (got.length !== want.length) return false;
    let diff = 0; for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
    return diff === 0;
  } catch (_) { return false; }
}

async function signJwt(payload, secret) {
  const enc = new TextEncoder();
  const header = b64u(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`)));
  return `${header}.${body}.${b64u(sig)}`;
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))));
}
async function readJwt(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ') || !env.JWT_SECRET) return null;
  const token = auth.slice(7).trim();
  const parts = token.split('.'); if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(unb64u(parts[1])));
    if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    const expected = await signJwt(payload, env.JWT_SECRET);
    const a = new TextEncoder().encode(token), b = new TextEncoder().encode(expected);
    if (a.length !== b.length) return null; let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    if (diff) return null;
    const row = await env.DB.prepare('SELECT id,name,email,role,tier,enrolled_class,subscription_band,subscription_duration,subscription_expires_at,account_status FROM users WHERE id = ? AND account_status = \'active\'').bind(payload.sub).first();
    return row || null;
  } catch (_) { return null; }
}
async function requireUser(request, env) { return readJwt(request, env); }

function quoteFor(plan, duration) {
  const base = plan.prices[duration];
  const gst = Math.round(base * 0.18 * 100) / 100;
  const total = Math.round((base + gst) * 100) / 100;
  return { band: plan.id, band_name: plan.name, min_grade: plan.min_grade, max_grade: plan.max_grade, duration, duration_label: duration === '6m' ? '6 Months' : '1 Year', base_inr: base, gst_rate: 0.18, gst_inr: gst, total_inr: total, amount_paise: Math.round(total * 100) };
}

async function handle(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': 'https://smaraze.com', 'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS', 'access-control-allow-headers': 'Authorization,Content-Type,Idempotency-Key', 'access-control-max-age': '86400' } });
  if (url.pathname === '/api/health' || url.pathname === '/health') {
    try { await env.DB.prepare('SELECT 1 AS ok').first(); return json({ status: 'ok', service: 'smaraze-api', database: 'ok' }); }
    catch (_) { return json({ status: 'degraded', service: 'smaraze-api', database: 'unavailable' }, 503); }
  }
  if (url.pathname === '/api/payments/plans' && request.method === 'GET') {
    return json({ plans: PLANS.flatMap(p => ['6m', '1y'].map(d => quoteFor(p, d))) });
  }
  if (url.pathname === '/api/auth/register' && request.method === 'POST') {
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const name = String(body.name || '').trim(), email = String(body.email || '').trim().toLowerCase(), password = body.password;
    const enrolled = Number(body.enrolled_class || 1), role = ['Parent', 'Student', 'Admin'].includes(body.role) ? body.role : 'Parent';
    if (!name || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || !Number.isInteger(enrolled) || enrolled < 1 || enrolled > 10) return json({ detail: 'Name, valid email, and class 1–10 are required.' }, 422);
    let passwordHash; try { passwordHash = await hashPassword(password); } catch (e) { return json({ detail: e.message }, 422); }
    const id = `u_${uuid().replaceAll('-', '')}`;
    try {
      await env.DB.prepare('INSERT INTO users (id,name,email,password_hash,role,tier,enrolled_class,account_status) VALUES (?,?,?,? ,?,\'free\',?,\'active\')').bind(id, name, email, passwordHash, role, enrolled).run();
    } catch (e) { if (String(e).toLowerCase().includes('unique')) return json({ detail: 'Unable to create account.' }, 409); return json({ detail: 'Account creation failed.' }, 500); }
    const user = { id, name, email, role, tier: 'free', enrolled_class: enrolled, account_status: 'active' };
    const token = await signJwt({ sub: id, role, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 86400, jti: uuid() }, env.JWT_SECRET || 'unset');
    return json({ status: 'success', auth_mode: 'bearer', user: { ...user, token } }, 201);
  }
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const email = String(body.email || '').trim().toLowerCase(), password = body.password;
    const row = await env.DB.prepare('SELECT * FROM users WHERE email = ? AND account_status = \'active\'').bind(email).first();
    if (!row || !(await verifyPassword(password, row.password_hash))) return json({ detail: 'Invalid email or password.' }, 401);
    const user = { id: row.id, name: row.name, email: row.email, role: row.role, tier: row.tier || 'free', enrolled_class: row.enrolled_class || 1, subscription_band: row.subscription_band, subscription_duration: row.subscription_duration, subscription_expires_at: row.subscription_expires_at, account_status: row.account_status };
    const token = await signJwt({ sub: row.id, role: row.role, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 86400, jti: uuid() }, env.JWT_SECRET || 'unset');
    return json({ status: 'success', auth_mode: 'bearer', user: { ...user, token } });
  }
  if (url.pathname === '/api/auth/me' && request.method === 'GET') {
    const user = await requireUser(request, env); return user ? json({ user }) : json({ detail: 'Authentication required.' }, 401);
  }
  if (url.pathname === '/api/topics' && request.method === 'GET') {
    const classLevel = url.searchParams.get('class_level') || 'all', subject = url.searchParams.get('subject') || 'all', search = (url.searchParams.get('search') || '').trim();
    const clauses = ['1=1']; const params = [];
    if (classLevel !== 'all' && /^\d+$/.test(classLevel)) { clauses.push('grade_min <= ? AND grade_max >= ?'); params.push(Number(classLevel), Number(classLevel)); }
    if (subject !== 'all') { clauses.push('subject = ?'); params.push(subject); }
    if (search) { clauses.push('(title LIKE ? OR summary LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const rows = await env.DB.prepare(`SELECT id,title,subject,grade_min,grade_max,chapter,strand,icon,summary,tier_required,deep_link_url FROM content_registry WHERE ${clauses.join(' AND ')} AND status = 'published' ORDER BY grade_min,id LIMIT 100`).bind(...params).all();
    return json({ topics: rows.results || [] });
  }
  if (url.pathname === '/api/payments/create-order' && request.method === 'POST') {
    const user = await requireUser(request, env); if (!user) return json({ detail: 'Authentication required.' }, 401);
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return json({ detail: 'Payment gateway is not configured.' }, 503);
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const duration = body.duration === '6m' ? '6m' : body.duration === '1y' ? '1y' : null;
    const enrolled = Number(user.enrolled_class || 1);
    const expectedBand = enrolled <= 4 ? 'band_1_4' : enrolled <= 7 ? 'band_5_7' : 'band_8_10';
    const plan = PLANS.find(p => p.id === (body.band || expectedBand));
    if (!duration || !plan || plan.id !== expectedBand) return json({ detail: 'The selected plan does not match the learner class.' }, 422);
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (idempotencyKey) { const existing = await env.DB.prepare('SELECT order_id,amount,currency,band,duration,total_amount FROM payments WHERE user_id = ? AND idempotency_key = ?').bind(user.id, idempotencyKey).first(); if (existing) return json({ status: 'success', order_id: existing.order_id, amount: existing.amount, currency: existing.currency, key_id: env.RAZORPAY_KEY_ID, band: existing.band, duration: existing.duration, total_inr: existing.total_amount }); }
    const quote = quoteFor(plan, duration);
    const receipt = 'rcpt_' + user.id.slice(0, 8) + '_' + uuid().replaceAll('-', '').slice(0, 10);
    const auth = btoa(env.RAZORPAY_KEY_ID + ':' + env.RAZORPAY_KEY_SECRET);
    let gateway; try { const response = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: quote.amount_paise, currency: 'INR', receipt, notes: { user_id: user.id, band: plan.id, duration } }) }); gateway = await response.json(); if (!response.ok || !gateway.id) return json({ detail: 'Payment gateway order creation failed.' }, 502); } catch (_) { return json({ detail: 'Payment gateway unavailable.' }, 502); }
    const paymentId = 'pay_' + uuid().replaceAll('-', '').slice(0, 14);
    await env.DB.prepare('INSERT INTO payments (id,user_id,order_id,amount,currency,tier_purchased,status,gateway,band,duration,base_amount,gst_amount,total_amount,idempotency_key) VALUES (?,?,?,?,?,?,\'created\',\'razorpay\',?,?,?,?,?,?)').bind(paymentId, user.id, gateway.id, quote.amount_paise, 'INR', plan.id, plan.id, duration, quote.base_inr, quote.gst_inr, quote.total_inr, idempotencyKey || null).run();
    return json({ status: 'success', order_id: gateway.id, amount: quote.amount_paise, currency: 'INR', key_id: env.RAZORPAY_KEY_ID, band: plan.id, band_name: plan.name, duration, duration_label: quote.duration_label, base_inr: quote.base_inr, gst_inr: quote.gst_inr, total_inr: quote.total_inr, user_name: user.name, user_email: user.email });
  }
  if (url.pathname === '/api/payments/verify' && request.method === 'POST') {
    const user = await requireUser(request, env); if (!user) return json({ detail: 'Authentication required.' }, 401);
    if (!env.RAZORPAY_KEY_SECRET) return json({ detail: 'Payment gateway is not configured.' }, 503);
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const orderId = String(body.order_id || ''), paymentId = String(body.payment_id || ''), signature = String(body.signature || '');
    if (!orderId || !paymentId || !signature) return json({ detail: 'Payment verification fields are required.' }, 422);
    const expected = await hmacHex(env.RAZORPAY_KEY_SECRET, orderId + '|' + paymentId); if (expected.length !== signature.length || !expected || [...expected].some((c, i) => c !== signature[i])) return json({ detail: 'Invalid payment signature.' }, 400);
    const payment = await env.DB.prepare('SELECT * FROM payments WHERE order_id = ? AND user_id = ?').bind(orderId, user.id).first(); if (!payment) return json({ detail: 'Order not found for this account.' }, 404);
    if (payment.status !== 'paid') await env.DB.batch([env.DB.prepare('UPDATE payments SET status=\'paid\',gateway_payment_id=?,gateway_signature=?,verified_at=CURRENT_TIMESTAMP WHERE order_id=? AND user_id=?').bind(paymentId, signature, orderId, user.id), env.DB.prepare('UPDATE users SET tier=?,subscription_band=?,subscription_duration=?,subscription_expires_at=? WHERE id=?').bind(payment.tier_purchased, payment.band, payment.duration, new Date(Date.now() + (payment.duration === '6m' ? 180 : 365) * 86400000).toISOString(), user.id)]);
    const expires = new Date(Date.now() + (payment.duration === '6m' ? 180 : 365) * 86400000).toISOString();
    return json({ status: 'success', auth_mode: 'bearer', message: 'Payment verified.', band: payment.band, tier: payment.tier_purchased, subscription_duration: payment.duration, subscription_expires_at: expires });
  }
  if (url.pathname === '/api/entitlement/check' && request.method === 'GET') {
    const user = await requireUser(request, env); if (!user) return json({ allowed: false, detail: 'Authentication required.' }, 401);
    const contentId = url.searchParams.get('content_id'); const row = await env.DB.prepare('SELECT tier_required FROM content_registry WHERE id = ? AND status = \'published\'').bind(contentId).first();
    if (!row) return json({ allowed: false, reason: 'not_found' }, 404);
    const order = { free: 0, primary_paid: 1, pro_paid: 2, master_paid: 3 }; const actual = order[user.tier] ?? 0, required = order[row.tier_required];
    return json({ allowed: Number.isInteger(required) && actual >= required, tier_required: row.tier_required, tier: user.tier || 'free' });
  }
  return json({ detail: 'Endpoint not yet enabled on the Cloudflare API Worker.' }, 501);
}

export default { async fetch(request, env) { try { return cors(request, await handle(request, env)); } catch (_) { return cors(request, json({ detail: 'Internal API error.' }, 500)); } } };




