const RELEASE_VERSION = '2026.09.13.115';
const RELEASE_TOPIC_COUNT = 713;
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
const PAID_ONLY_SUBJECTS = new Set(['Computer Science & AI', 'Earth & Space']);
function activeTier(user) {
  const tier = ['primary_paid','pro_paid','master_paid'].includes(user?.tier) ? user.tier : 'free';
  if (tier === 'free') return tier;
  if (typeof user.subscription_expires_at !== 'string' || !user.subscription_expires_at.trim()) return 'free';
  const ts = Date.parse(user.subscription_expires_at);
  return Number.isFinite(ts) && ts > Date.now() ? tier : 'free';
}
function maxGrade(user) {
  const n = Number(user?.subscription_max_grade ?? user?.enrolled_class ?? 0);
  return Number.isInteger(n) ? Math.max(0, Math.min(10, n)) : 0;
}
function topicAllowed(user, row) {
  if (!user) return false;
  if (String(user.role).toLowerCase() === 'admin') return true;
  if (String(user.role).toLowerCase() !== 'student') return false;
  const tier = activeTier(user);
  if (PAID_ONLY_SUBJECTS.has(row.subject) && tier === 'free') return false;
  const order = { free: 0, primary_paid: 1, pro_paid: 2, master_paid: 3 };
  if ((order[tier] ?? 0) < (order[row.tier_required] ?? 99)) return false;
  const enrolled = Number(user.enrolled_class || 1);
  return row.grade_min <= enrolled && enrolled <= row.grade_max && row.grade_max <= maxGrade(user);
}

function validRequestId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,64}$/.test(value) ? value : null;
}
function requestId(request) {
  return validRequestId(request.headers.get('X-Request-ID')) || validRequestId(request.headers.get('CF-Ray')) || `req_${crypto.randomUUID()}`;
}
function withRequestContext(response, id) {
  const out = new Response(response.body, response);
  out.headers.set('X-Request-ID', id);
  return out;
}
function logRequest(request, id, response, startedAt) {
  // Operational telemetry is deliberately non-PII: no email, token, body, query, or child id.
  console.log(JSON.stringify({
    event: 'api.request.v1',
    request_id: id,
    method: request.method,
    path: new URL(request.url).pathname,
    status: response.status,
    duration_ms: Math.max(0, Date.now() - startedAt),
    occurred_at: new Date().toISOString(),
  }));
}
function cors(request, response) {
  const origin = request.headers.get('Origin');
  if (origin === 'https://smaraze.com' || origin === 'https://www.smaraze.com') {
    response.headers.set('access-control-allow-origin', origin);
    response.headers.set('access-control-allow-credentials', 'true');
    response.headers.set('vary', 'Origin');
    response.headers.set('access-control-expose-headers', 'X-Request-ID');
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
function cookieValue(request, name) { const raw = request.headers.get('Cookie') || ''; const m = raw.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; }
function cookieHeaders(token) { return token ? { 'set-cookie': 'avyaan_session=' + encodeURIComponent(token) + '; Max-Age=86400; Path=/; Secure; HttpOnly; SameSite=Lax' } : { 'set-cookie': 'avyaan_session=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax' }; }


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
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return hex(new Uint8Array(digest));
}
function workerHumanCode(prefix = 'AV-', length = 8) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let suffix = ''; for (const byte of bytes) suffix += chars[byte % chars.length];
  return prefix + suffix;
}
function workerEscapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]; });
}
function workerSafeReportHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s(on[a-z]+|href|src)\s*=\s*(['"]).*?\2/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .slice(0, 50000);
}
function requestIp(request) { return request.headers.get('CF-Connecting-IP') || 'unknown'; }
async function recordSecurityEvent(env, eventType, subjectHash, ipHash) {
  try { await env.DB.prepare('INSERT INTO security_events (id,event_type,subject_hash,ip_hash) VALUES (?,?,?,?)').bind('evt_' + uuid().replaceAll('-', ''), eventType, subjectHash || null, ipHash || null).run(); } catch (_) { /* telemetry must never change the user-visible response */ }
}
async function allowRecoveryBucket(env, limiter, bucketKey, windowStart, limit) {
  try {
    await env.DB.prepare(`INSERT INTO recovery_rate_limits (limiter,bucket_key,window_start,request_count) VALUES (?,?,?,1)
      ON CONFLICT(limiter,bucket_key,window_start) DO UPDATE SET request_count=request_count+1`).bind(limiter, bucketKey, windowStart).run();
    const row = await env.DB.prepare('SELECT request_count FROM recovery_rate_limits WHERE limiter=? AND bucket_key=? AND window_start=?').bind(limiter, bucketKey, windowStart).first();
    return Number(row?.request_count || 0) <= limit;
  } catch (_) { return false; }
}
async function allowRecoveryRequest(env, emailHash, ipHash) {
  const now = Date.now();
  return (await allowRecoveryBucket(env, 'password_reset_ip', ipHash, Math.floor(now / 60000), 5)) &&
    (await allowRecoveryBucket(env, 'password_reset_account', emailHash, Math.floor(now / 3600000), 3));
}
async function readJwt(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!env.JWT_SECRET) return null;
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : cookieValue(request, 'avyaan_session');
  if (!token) return null;
  const parts = token.split('.'); if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(unb64u(parts[1])));
    if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    const expected = await signJwt(payload, env.JWT_SECRET);
    const a = new TextEncoder().encode(token), b = new TextEncoder().encode(expected);
    if (a.length !== b.length) return null; let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    if (diff) return null;
    const row = await env.DB.prepare('SELECT id,name,email,role,tier,enrolled_class,subscription_band,subscription_duration,subscription_expires_at,subscription_max_grade,admin_login_id,account_status FROM users WHERE id = ? AND account_status = \'active\'').bind(payload.sub).first();
    return row ? { ...row, is_active_subscription: activeTier(row) !== 'free' } : null;
  } catch (_) { return null; }
}
async function requireUser(request, env) { return readJwt(request, env); }

function quoteFor(plan, duration) {
  const base = plan.prices[duration];
  const gst = Math.round(base * 0.18 * 100) / 100;
  const total = Math.round((base + gst) * 100) / 100;
  return { band: plan.id, band_name: plan.name, min_grade: plan.min_grade, max_grade: plan.max_grade, duration, duration_label: duration === '6m' ? '6 Months' : '1 Year', base_inr: base, gst_rate: 0.18, gst_inr: gst, total_inr: total, amount_paise: Math.round(total * 100) };
}

function workerQuizQuestions(row) {
  let lesson;
  try { lesson = JSON.parse(row.protected_json || '{}'); } catch (_) { return []; }
  const candidates = Array.isArray(lesson?.mcqs) && lesson.mcqs.length ? lesson.mcqs : (lesson?.tryIt ? [lesson.tryIt] : []);
  return candidates.map((item) => {
    const options = Array.isArray(item?.options) ? item.options.map(value => String(value)) : [];
    const answerIndex = Number(item?.answer);
    const question = String(item?.question || '').trim();
    if (!question || options.length < 2 || options.length > 20 || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) return null;
    return { question, options, answer_index: answerIndex, explanation: String(item?.explanation || '').trim() };
  }).filter(Boolean);
}
function workerPublicQuestion(question, index) { return { index, question: question.question, options: [...question.options] }; }
function workerQuizSessionExpired(value) { const parsed = Date.parse(String(value || '')); return !Number.isFinite(parsed) || parsed <= Date.now(); }
function workerReviewDate(days) { const value = new Date(); value.setUTCDate(value.getUTCDate() + Number(days || 0)); return value.toISOString().slice(0, 10); }
function workerRecommendationMeta(row) {
  let lesson;
  try { lesson = JSON.parse(row.protected_json || '{}'); } catch (_) { lesson = {}; }
  return { hasQuiz: Boolean(lesson?.quiz_preview_question), hasWorkedExample: Boolean(lesson?.workedExample?.problem) };
}
function workerBuildRecommendations(rows, masteredIds) {
  const masteredRows = rows.filter(row => masteredIds.has(String(row.id)));
  const masteredGrades = masteredRows.map(row => Number(row.grade_max || 0)).filter(Number.isFinite);
  const masteredSubjects = new Set(masteredRows.map(row => String(row.subject || '')).filter(Boolean));
  const currentGrade = masteredGrades.length ? Math.max(...masteredGrades) : 1;
  const recommendations = [];
  for (const row of rows) {
    const id = String(row.id || ''); if (!id || masteredIds.has(id)) continue;
    const grade = Number(row.grade_min || 0), subject = String(row.subject || ''), continued = masteredSubjects.has(subject), meta = workerRecommendationMeta(row);
    let score = grade === currentGrade ? 50 : (grade === currentGrade + 1 ? 30 : (grade <= currentGrade ? 20 : 5));
    if (continued) score += 15;
    if (meta.hasQuiz) score += 5;
    if (meta.hasWorkedExample) score += 5;
    let reason, reasonCode, evidence;
    if (grade === currentGrade && continued) { reason = `Continue ${subject} at your current level (Class ${grade})`; reasonCode = 'CONTINUE_SUBJECT'; evidence = ['mastered_grade','mastered_subject','entitlement_access']; }
    else if (grade === currentGrade) { reason = `Build foundations in ${subject} at Class ${grade}`; reasonCode = 'CURRENT_LEVEL_FOUNDATION'; evidence = ['mastered_grade','entitlement_access']; }
    else if (grade === currentGrade + 1) { reason = `Ready to advance to Class ${grade} ${subject}`; reasonCode = 'NEXT_CLASS_ADVANCE'; evidence = ['mastered_grade','entitlement_access']; }
    else if (grade < currentGrade) { reason = `Fill a gap in ${subject} (Class ${grade})`; reasonCode = 'FILL_FOUNDATION_GAP'; evidence = ['mastered_grade','entitlement_access']; }
    else { reason = `Challenge yourself with Class ${grade} ${subject}`; reasonCode = 'CHALLENGE_NEXT_LEVEL'; evidence = ['mastered_grade','entitlement_access']; }
    recommendations.push({ id, title: row.title, subject: row.subject, grade_min: row.grade_min, grade_max: row.grade_max, icon: row.icon, summary: row.summary, deep_link_url: row.deep_link_url, score, reason, reason_code: reasonCode, evidence_basis: evidence });
  }
  recommendations.sort((a,b) => b.score-a.score || Number(a.grade_min||0)-Number(b.grade_min||0) || String(a.subject||'').localeCompare(String(b.subject||'')) || String(a.title||'').localeCompare(String(b.title||'')) || a.id.localeCompare(b.id));
  return { recommendations: recommendations.slice(0,10), current_grade_estimate: currentGrade, mastered_count: masteredIds.size, total_available: rows.length, policy: 'next-step-policy-v1' };
}
function workerReviewPreview(row) {
  let lesson;
  try { lesson = JSON.parse(row.protected_json || '{}'); } catch (_) { lesson = {}; }
  return { outcome: typeof lesson?.outcome === 'string' ? lesson.outcome : null, visual: lesson?.visual || null, quiz_preview_question: typeof lesson?.quiz_preview_question === 'string' ? lesson.quiz_preview_question : null, quiz_preview_options: Array.isArray(lesson?.quiz_preview_options) ? lesson.quiz_preview_options.map(value => String(value)).slice(0, 20) : [] };
}
function workerReviewDescriptors(topics, maxQuestions = 15) {
  const buckets = [];
  for (const topic of topics) {
    const questions = workerQuizQuestions(topic);
    if (questions.length) buckets.push({ topic, questions, offset: 0 });
  }
  const descriptors = [];
  while (descriptors.length < maxQuestions) {
    let added = false;
    for (const bucket of buckets) {
      if (bucket.offset >= bucket.questions.length) continue;
      const questionIndex = bucket.offset++;
      descriptors.push({ ordinal: descriptors.length, content_id: bucket.topic.id, question_index: questionIndex, topic_title: bucket.topic.title, question: bucket.questions[questionIndex].question, options: bucket.questions[questionIndex].options });
      added = true;
      if (descriptors.length >= maxQuestions) break;
    }
    if (!added) break;
  }
  return descriptors;
}
function workerPublicReviewQuestion(descriptor) { return { index: descriptor.ordinal, question: descriptor.question, options: [...descriptor.options], topic_id: descriptor.content_id, topic_title: descriptor.topic_title }; }
async function handle(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': 'https://smaraze.com', 'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS', 'access-control-allow-headers': 'Authorization,Content-Type,Idempotency-Key', 'access-control-max-age': '86400' } });
  if (url.pathname === '/api/version' && request.method === 'GET') {
    return json({ version: env.RELEASE_VERSION || RELEASE_VERSION, topicCount: env.RELEASE_TOPIC_COUNT || RELEASE_TOPIC_COUNT });
  }
  if (url.pathname === '/api/live' || url.pathname === '/live') {
    return json({ status: 'ok', service: 'smaraze-api', check: 'liveness' });
  }
  if (url.pathname === '/api/ready' || url.pathname === '/ready') {
    try {
      await env.DB.prepare('SELECT 1 AS ok').first();
      return json({ status: 'ready', service: 'smaraze-api', database: 'ok', check: 'readiness' });
    } catch (_) {
      return json({ status: 'not_ready', service: 'smaraze-api', database: 'unavailable', check: 'readiness' }, 503);
    }
  }
  if (url.pathname === '/api/health' || url.pathname === '/health') {
    try { await env.DB.prepare('SELECT 1 AS ok').first(); return json({ status: 'ok', service: 'smaraze-api', database: 'ok' }); }
    catch (_) { return json({ status: 'degraded', service: 'smaraze-api', database: 'unavailable' }, 503); }
  } if (url.pathname === '/api/payments/plans' && request.method === 'GET') {
    return json({ plans: PLANS.flatMap(p => ['6m', '1y'].map(d => quoteFor(p, d))) });
  }
  if (url.pathname === '/api/auth/forgot-password' && request.method === 'POST') {
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const email = String(body.email || '').trim().toLowerCase();
    if (!email || email.length > 320 || !/^\S+@\S+\.\S+$/.test(email)) return json({ detail: 'Enter a valid account email.' }, 422);
    const emailHash = await sha256Hex(email);
    const ipHash = await sha256Hex(requestIp(request));
    const allowed = await allowRecoveryRequest(env, emailHash, ipHash);
    await recordSecurityEvent(env, 'password_reset_requested', emailHash, ipHash);
    const emailDelivery = env.EMAIL ? 'configured' : 'unavailable';
    if (allowed) {
      const row = await env.DB.prepare("SELECT id,email,name FROM users WHERE LOWER(email)=? AND account_status='active' LIMIT 1").bind(email).first();
      if (row) {
        const rawToken = b64u(crypto.getRandomValues(new Uint8Array(32)));
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken));
        const tokenHash = hex(new Uint8Array(digest));
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        await env.DB.batch([
          env.DB.prepare("DELETE FROM auth_tokens WHERE user_id=? AND purpose='password_reset' AND used_at IS NULL").bind(row.id),
          env.DB.prepare("INSERT INTO auth_tokens (id,user_id,token_hash,purpose,expires_at) VALUES (?,?,?,?,?)").bind('tok_' + uuid().replaceAll('-', ''), row.id, tokenHash, 'password_reset', expiresAt),
        ]);
        if (env.EMAIL) {
          try {
            const resetUrl = (env.PUBLIC_APP_ORIGIN || 'https://smaraze.com').replace(/\/$/, '') + '/?reset=' + encodeURIComponent(rawToken);
            await env.EMAIL.send({
              to: { email: row.email },
              from: { email: env.PASSWORD_RESET_FROM || 'help@smaraze.com', name: 'Skill X' },
              subject: 'Reset your Skill X password',
              text: `We received a request to reset your Skill X password. Use this link within 30 minutes: ${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
              html: `<p>We received a request to reset your Skill X password.</p><p><a href="${resetUrl}">Set a new password</a> (this link expires in 30 minutes).</p><p>If you did not request this, you can ignore this email.</p>`,
            });
          } catch (_) { /* keep the response generic; operators can inspect email delivery */ }
        }
      }
    }
    return json({ status: 'accepted', message: 'If an account exists for this email address, password recovery instructions will be sent.' }, 202);
  }
  if (url.pathname === '/api/auth/reset-password' && request.method === 'POST') {
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const token = String(body.token || '').trim();
    const password = body.password;
    if (!token || typeof password !== 'string') return json({ detail: 'Recovery token and password are required.' }, 422);
    if (password.length < 8) return json({ detail: 'Password must be at least 8 characters.' }, 422);
    if (new TextEncoder().encode(password).byteLength > 72) return json({ detail: 'Password must be at most 72 UTF-8 bytes.' }, 422);
    const ipHash = await sha256Hex(requestIp(request));
    const resetAllowed = await allowRecoveryBucket(env, 'password_reset_attempt_ip', ipHash, Math.floor(Date.now() / 60000), 10);
    if (!resetAllowed) return json({ detail: 'Invalid or expired recovery token.' }, 400);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const tokenHash = hex(new Uint8Array(digest));
    const candidate = await env.DB.prepare("SELECT id,user_id FROM auth_tokens WHERE token_hash=? AND purpose='password_reset' AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP LIMIT 1").bind(tokenHash).first();
    if (!candidate) { await recordSecurityEvent(env, 'password_reset_rejected', null, ipHash); return json({ detail: 'Invalid or expired recovery token.' }, 400); }
    const passwordHash = await hashPassword(password);
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=(SELECT user_id FROM auth_tokens WHERE token_hash=? AND purpose='password_reset' AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP)").bind(passwordHash, tokenHash),
      env.DB.prepare("UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP, expires_at=CURRENT_TIMESTAMP WHERE user_id=(SELECT user_id FROM auth_tokens WHERE token_hash=? AND purpose='password_reset' AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP) AND revoked_at IS NULL").bind(tokenHash),
      env.DB.prepare("UPDATE auth_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=? AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP").bind(candidate.id),
    ]);
    const userChanged = Number(results?.[0]?.meta?.changes || 0) === 1;
    const tokenConsumed = Number(results?.[2]?.meta?.changes || 0) === 1;
    if (!userChanged || !tokenConsumed) { await recordSecurityEvent(env, 'password_reset_rejected', null, ipHash); return json({ detail: 'Invalid or expired recovery token.' }, 400); }
    await recordSecurityEvent(env, 'password_reset_completed', await sha256Hex(String(candidate.user_id)), ipHash);
    return json({ status: 'success', message: 'Password reset. Please sign in again.' });
  }
  if (url.pathname === '/api/auth/register' && request.method === 'POST') {
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const name = String(body.name || '').trim(), email = String(body.email || '').trim().toLowerCase(), password = body.password;
    const requestedRole = body.role == null ? 'Parent' : String(body.role);
    if (requestedRole !== 'Parent') return json({ detail: 'Parent registration is required.' }, 403);
    const enrolled = Number(body.enrolled_class || 1), role = 'Parent';
    if (!name || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || !Number.isInteger(enrolled) || enrolled < 1 || enrolled > 10) return json({ detail: 'Name, valid email, and class 1–10 are required.' }, 422);
    let passwordHash; try { passwordHash = await hashPassword(password); } catch (e) { return json({ detail: e.message }, 422); }
    const id = `u_${uuid().replaceAll('-', '')}`;
    try {
      await env.DB.prepare('INSERT INTO users (id,name,email,password_hash,role,tier,enrolled_class,account_status) VALUES (?,?,?,? ,?,\'free\',?,\'active\')').bind(id, name, email, passwordHash, role, enrolled).run();
    } catch (e) { if (String(e).toLowerCase().includes('unique')) return json({ detail: 'Unable to create account.' }, 409); return json({ detail: 'Account creation failed.' }, 500); }
    const user = { id, name, email, role, tier: 'free', enrolled_class: enrolled, account_status: 'active' };
    const token = await signJwt({ sub: id, role, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 86400, jti: uuid() }, env.JWT_SECRET || 'unset');
    return json({ status: 'success', auth_mode: 'cookie', user }, 201, cookieHeaders(token));
  }
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const email = String(body.email || '').trim().toLowerCase(), password = body.password;
    const row = await env.DB.prepare('SELECT * FROM users WHERE (LOWER(email) = ? OR LOWER(COALESCE(admin_login_id, \'\')) = ?) AND account_status = \'active\'').bind(email, email).first();
    if (!row || !(await verifyPassword(password, row.password_hash))) return json({ detail: 'Invalid email or password.' }, 401);
    const user = { id: row.id, name: row.name, email: row.email, role: row.role, tier: row.tier || 'free', enrolled_class: row.enrolled_class || 1, subscription_band: row.subscription_band, subscription_duration: row.subscription_duration, subscription_expires_at: row.subscription_expires_at, subscription_max_grade: row.subscription_max_grade, is_active_subscription: activeTier(row) !== 'free', account_status: row.account_status };
    const token = await signJwt({ sub: row.id, role: row.role, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 86400, jti: uuid() }, env.JWT_SECRET || 'unset');
    return json({ status: 'success', auth_mode: 'cookie', user }, 200, cookieHeaders(token));
  }
  if (url.pathname === '/api/auth/me' && request.method === 'GET') {
    const user = await requireUser(request, env); return user ? json({ user }) : json({ detail: 'Authentication required.' }, 401);
  }
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') return json({ status: 'success' }, 200, cookieHeaders(null));
  if (url.pathname === '/api/auth/logout-all' && request.method === 'POST') {
    const user = await requireUser(request, env);
    if (!user) return json({ detail: 'Authentication required.' }, 401);
    try {
      await env.DB.prepare("UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP, expires_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL").bind(user.id).run();
    } catch (_) { return json({ detail: 'Session revocation is temporarily unavailable.' }, 503); }
    return json({ status: 'success', auth_mode: 'cookie' }, 200, cookieHeaders(null));
  }
  if (url.pathname === '/api/progress/create-class' && request.method === 'POST') {
    const user = await requireUser(request, env);
    const role = String(user?.role || '').toLowerCase();
    if (!user) return json({ detail: 'Authentication required.' }, 401);
    if (!['teacher', 'admin'].includes(role)) return json({ detail: 'Only teacher or administrator accounts can create a class.' }, 403);
    let body = {}; try { body = await request.json(); } catch (_) { /* empty body is valid */ }
    const grade = body.grade == null ? Number(user.enrolled_class || 1) : Number(body.grade);
    if (!Number.isInteger(grade) || grade < 1 || grade > 10) return json({ detail: 'Class grade must be an integer from 1 to 10.' }, 422);
    try {
      const existing = await env.DB.prepare("SELECT code,grade FROM classrooms WHERE owner_id=? AND grade=? AND status='active' LIMIT 1").bind(user.id, grade).first();
      if (existing) return json({ status: 'success', class_code: existing.code, grade: Number(existing.grade), reused: true });
      let code = null;
      for (let i = 0; i < 6; i++) {
        const candidate = workerHumanCode('AV-', 8);
        const taken = await env.DB.prepare('SELECT code FROM classrooms WHERE code=?').bind(candidate).first();
        if (!taken) { code = candidate; break; }
      }
      if (!code) return json({ detail: 'Could not allocate a unique class code. Please retry.' }, 503);
      await env.DB.prepare("INSERT INTO classrooms (code,owner_id,grade,status) VALUES (?,?,?,'active')").bind(code, user.id, grade).run();
      return json({ status: 'success', class_code: code, grade, reused: false }, 201);
    } catch (_) { return json({ detail: 'Classroom storage is not initialized. Apply the release schema and retry.' }, 503); }
  }
  if (url.pathname === '/api/progress/join-class' && request.method === 'POST') {
    const user = await requireUser(request, env);
    if (!user) return json({ detail: 'Authentication required.' }, 401);
    if (String(user.role || '').toLowerCase() !== 'student') return json({ detail: 'Only learner accounts can join a class.' }, 403);
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const classCode = String(body.class_code || '').trim().toUpperCase();
    if (!/^AV-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(classCode)) return json({ detail: 'Class code is invalid.' }, 422);
    try {
      const classroom = await env.DB.prepare("SELECT code,grade FROM classrooms WHERE code=? AND status='active'").bind(classCode).first();
      if (!classroom) return json({ detail: 'This class link is not active. Ask the teacher to confirm the code.' }, 404);
      if (Number(classroom.grade) !== Number(user.enrolled_class || 1)) return json({ detail: 'This class is assigned to a different grade.' }, 403);
      await env.DB.prepare('INSERT OR IGNORE INTO class_rosters (class_code,student_id) VALUES (?,?)').bind(classCode, user.id).run();
      return json({ status: 'success', class_code: classCode, grade: Number(classroom.grade) });
    } catch (_) { return json({ detail: 'Class roster storage is not initialized. Apply the release schema and retry.' }, 503); }
  }
  if (url.pathname.match(/^\/api\/progress\/roster\/[^/]+$/) && request.method === 'GET') {
    const user = await requireUser(request, env);
    if (!user) return json({ detail: 'Authentication required.' }, 401);
    const role = String(user.role || '').toLowerCase();
    if (!['teacher', 'admin'].includes(role)) return json({ detail: 'Teacher or administrator access required.' }, 403);
    const classCode = decodeURIComponent(url.pathname.split('/')[4] || '').trim().toUpperCase();
    if (!/^AV-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(classCode)) return json({ detail: 'Class code is invalid.' }, 422);
    try {
      const classroom = await env.DB.prepare("SELECT code,owner_id,grade FROM classrooms WHERE code=? AND status='active'").bind(classCode).first();
      if (!classroom) return json({ detail: 'Class not found.' }, 404);
      if (role === 'teacher' && classroom.owner_id !== user.id) return json({ detail: 'This class roster is not assigned to your account.' }, 403);
      const rows = await env.DB.prepare("SELECT u.id AS user_id,u.name,u.enrolled_class AS grade,COUNT(DISTINCT CASE WHEN p.mastered=1 THEN p.content_id END) AS mastered,(SELECT COUNT(*) FROM content_registry c0 WHERE c0.status='published' AND c0.grade_min<=u.enrolled_class AND c0.grade_max>=u.enrolled_class) AS total_topics,(SELECT COUNT(*) FROM quiz_attempts qa0 WHERE qa0.user_id=u.id) AS quiz_attempts,(SELECT COALESCE(SUM(CASE WHEN qa1.is_correct=1 THEN 1 ELSE 0 END),0) FROM quiz_attempts qa1 WHERE qa1.user_id=u.id) AS quiz_correct,(SELECT last_active_date FROM streaks s WHERE s.user_id=u.id) AS last_active_date FROM class_rosters cr JOIN users u ON u.id=cr.student_id LEFT JOIN progress p ON p.user_id=u.id WHERE cr.class_code=? AND LOWER(u.role)='student' GROUP BY u.id,u.name,u.enrolled_class ORDER BY LOWER(u.name),u.id LIMIT 500").bind(classCode).all();
      const students = (rows.results || []).map(row => { const mastered = Number(row.mastered || 0), total = Number(row.total_topics || 0), attempts = Number(row.quiz_attempts || 0), correct = Number(row.quiz_correct || 0); return { user_id: row.user_id, name: row.name, grade: Number(row.grade || classroom.grade), mastered, total_topics: total, mastery_pct: total ? Math.round(mastered / total * 100) : 0, quiz_attempts: attempts, quiz_accuracy_pct: attempts ? Math.round(correct / attempts * 100) : null, last_active_date: row.last_active_date || null }; });
      return json({ class_code: classCode, grade: Number(classroom.grade), students });
    } catch (_) { return json({ detail: 'Class roster storage is not initialized. Apply the release schema and retry.' }, 503); }
  }
  if (url.pathname === '/api/parent/generate-code' && request.method === 'POST') {
    const user = await requireUser(request, env);
    const role = String(user?.role || '').toLowerCase();
    if (!user) return json({ detail: 'Authentication required.' }, 401);
    if (!['student', 'admin'].includes(role)) return json({ detail: 'Only learner accounts can generate a parent linking code.' }, 403);
    const code = workerHumanCode('AV-', 4), expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    try {
      await env.DB.batch([
        env.DB.prepare('UPDATE parent_linking_codes SET used_at=CURRENT_TIMESTAMP WHERE child_id=? AND used_at IS NULL').bind(user.id),
        env.DB.prepare('INSERT INTO parent_linking_codes (id,child_id,code_hash,expires_at) VALUES (?,?,?,?)').bind('plc_' + uuid().replaceAll('-', ''), user.id, await sha256Hex(code), expiresAt),
      ]);
      return json({ status: 'success', code, expires_at: expiresAt, expires_in_minutes: 15 });
    } catch (_) { return json({ detail: 'Parent-link storage is not initialized. Apply the release schema and retry.' }, 503); }
  }
  if (url.pathname === '/api/parent/link' && request.method === 'POST') {
    const parent = await requireUser(request, env);
    if (!parent) return json({ detail: 'Authentication required.' }, 401);
    if (String(parent.role || '').toLowerCase() !== 'parent') return json({ detail: 'Parent authorization required.' }, 403);
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const code = String(body.code || '').trim().toUpperCase();
    if (!/^AV-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/.test(code)) return json({ detail: 'Invalid or already used linking code.' }, 400);
    const now = new Date().toISOString();
    try {
      const row = await env.DB.prepare('SELECT id,child_id FROM parent_linking_codes WHERE code_hash=? AND used_at IS NULL AND expires_at>? LIMIT 1').bind(await sha256Hex(code), now).first();
      if (!row) return json({ detail: 'Invalid or already used linking code.' }, 400);
      if (row.child_id === parent.id) return json({ detail: 'Cannot link your own account as a child.' }, 400);
      const child = await env.DB.prepare("SELECT id,name,enrolled_class,avatar FROM users WHERE id=? AND LOWER(role)='student' AND account_status='active'").bind(row.child_id).first();
      if (!child) return json({ detail: 'Child account not found.' }, 404);
      const results = await env.DB.batch([
        env.DB.prepare('UPDATE parent_linking_codes SET used_at=CURRENT_TIMESTAMP WHERE id=? AND used_at IS NULL').bind(row.id),
        env.DB.prepare("INSERT INTO parent_child_relationships (id,parent_id,child_id,status,linked_at) VALUES (?,?,?,'active',CURRENT_TIMESTAMP) ON CONFLICT(parent_id,child_id) DO UPDATE SET status='active',linked_at=CURRENT_TIMESTAMP").bind('pcr_' + uuid().replaceAll('-', ''), parent.id, child.id),
        env.DB.prepare("INSERT INTO guardian_relationships (id,guardian_id,child_id,status,verification_method,created_at) VALUES (?,?,?,'active','link_code',CURRENT_TIMESTAMP) ON CONFLICT(guardian_id,child_id) DO UPDATE SET status='active',revoked_at=NULL,verification_method='link_code'").bind('gr_' + uuid().replaceAll('-', ''), parent.id, child.id),
      ]);
      if (!results[0]?.meta?.changes) return json({ detail: 'Linking code was already used.' }, 409);
      return json({ status: 'success', child: { id: child.id, name: child.name, enrolled_class: Number(child.enrolled_class || 1), avatar: child.avatar || '🎓' } });
    } catch (_) { return json({ detail: 'Parent-link storage is not initialized. Apply the release schema and retry.' }, 503); }
  }
  if (url.pathname === '/api/topics/recommendations/next' && request.method === 'GET') {
    const user = await requireUser(request, env); if (!user) return json({ detail: 'Authentication required.' }, 401);
    const [catalogue, mastered] = await Promise.all([
      env.DB.prepare("SELECT id,title,subject,grade_min,grade_max,icon,summary,tier_required,deep_link_url,protected_json FROM content_registry WHERE status='published' ORDER BY subject ASC,grade_min ASC,title ASC").all(),
      env.DB.prepare('SELECT content_id FROM progress WHERE user_id=? AND mastered=1').bind(user.id).all(),
    ]);
    const rows = (catalogue.results || []).filter(row => topicAllowed(user, row));
    const masteredIds = new Set((mastered.results || []).map(row => String(row.content_id || '')));
    return json(workerBuildRecommendations(rows, masteredIds));
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
    if (payment.status !== 'paid') await env.DB.batch([env.DB.prepare('UPDATE payments SET status=\'paid\',gateway_payment_id=?,gateway_signature=?,verified_at=CURRENT_TIMESTAMP WHERE order_id=? AND user_id=?').bind(paymentId, signature, orderId, user.id), env.DB.prepare('UPDATE users SET tier=?,subscription_band=?,subscription_duration=?,subscription_expires_at=?,subscription_max_grade=? WHERE id=?').bind(payment.tier_purchased, payment.band, payment.duration, new Date(Date.now() + (payment.duration === '6m' ? 180 : 365) * 86400000).toISOString(), user.enrolled_class || 1, user.id)]);
    const expires = new Date(Date.now() + (payment.duration === '6m' ? 180 : 365) * 86400000).toISOString();
    return json({ status: 'success', auth_mode: 'bearer', message: 'Payment verified.', band: payment.band, tier: payment.tier_purchased, subscription_duration: payment.duration, subscription_expires_at: expires });
  }
  if (url.pathname === '/api/parent/children' && request.method === 'POST') {
    const parent = await requireUser(request, env); if (!parent || parent.role !== 'Parent') return json({ detail: 'Parent authorization required.' }, 403);
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const display = String(body.display_name || '').trim(), level = Number(body.class_level), avatar = String(body.avatar || '🎓').slice(0, 16);
    if (!display || display.length > 80 || !Number.isInteger(level) || level < 1 || level > 10) return json({ detail: 'Display name and class 1–10 are required.' }, 422);
    const childId = 'child_' + uuid().replaceAll('-', '');
    try { await env.DB.batch([
      env.DB.prepare('INSERT INTO users (id,name,email,password_hash,role,tier,enrolled_class,account_status) VALUES (?,?,?,? ,\'Student\',\'free\',?,\'active\')').bind(childId, display, childId + '@internal.smaraze.local', 'managed_child$' + uuid(), level),
env.DB.prepare('INSERT INTO child_profiles (id,guardian_id,display_name,class_level,avatar,status) VALUES (?,?,?,?,?,\'active\')').bind(childId, parent.id, display, level, avatar),
      env.DB.prepare('INSERT INTO guardian_relationships (id,guardian_id,child_id,status,verification_method,verified_at) VALUES (?,?,?,\'active\',\'account\',CURRENT_TIMESTAMP)').bind(uuid(), parent.id, childId)
    ]); } catch (_) { return json({ detail: 'Unable to create learner profile.' }, 500); }
    return json({ status: 'success', child: { id: childId, guardian_id: parent.id, display_name: display, class_level: level, avatar, status: 'active' } }, 201);
  }
  if (url.pathname === '/api/parent/children' && request.method === 'GET') {
    const parent = await requireUser(request, env); if (!parent || parent.role !== 'Parent') return json({ children: [] }, 403);
    const rows = await env.DB.prepare('SELECT c.id,c.guardian_id,c.display_name,c.class_level,c.avatar,c.status,c.created_at,r.status AS relationship_status,r.verification_method FROM child_profiles c JOIN guardian_relationships r ON r.child_id=c.id AND r.guardian_id=? WHERE c.deleted_at IS NULL ORDER BY c.created_at').bind(parent.id).all();
    return json({ children: rows.results || [] });
  }
  if (url.pathname.match(/^\/api\/parent\/relationships\/[^/]+\/revoke$/) && request.method === 'POST') {
    const parent = await requireUser(request, env); if (!parent || parent.role !== 'Parent') return json({ detail: 'Parent authorization required.' }, 403);
    const childId = url.pathname.split('/')[4]; const rel = await env.DB.prepare('SELECT id FROM guardian_relationships WHERE guardian_id=? AND child_id=? AND status=\'active\'').bind(parent.id, childId).first(); if (!rel) return json({ detail: 'Relationship not found.' }, 404);
    await env.DB.batch([env.DB.prepare('UPDATE guardian_relationships SET status=\'revoked\',revoked_at=CURRENT_TIMESTAMP WHERE id=?').bind(rel.id), env.DB.prepare('UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=?').bind(childId)]);
    return json({ status: 'success', relationship_status: 'revoked' });
  }
  if (url.pathname.match(/^\/api\/parent\/child\/[^/]+\/summary$/) && request.method === 'GET') {
    const parent = await requireUser(request, env);
    if (!parent || parent.role !== 'Parent') return json({ detail: 'Parent authorization required.' }, 403);
    const childId = url.pathname.split('/')[4];
    const child = await env.DB.prepare('SELECT c.* FROM child_profiles c JOIN guardian_relationships r ON r.child_id=c.id AND r.guardian_id=? AND r.status=\'active\' WHERE c.id=? AND c.deleted_at IS NULL').bind(parent.id, childId).first();
    if (!child) return json({ detail: 'Learner access is not authorized.' }, 403);
    const [mastered, attempts, topics] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) AS count FROM progress WHERE user_id=? AND mastered=1').bind(childId).first(),
      env.DB.prepare('SELECT COUNT(*) AS count, COALESCE(SUM(is_correct),0) AS correct FROM quiz_attempts WHERE user_id=?').bind(childId).first(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM content_registry WHERE status=\'published\' AND grade_min<=? AND grade_max>=?').bind(child.class_level, child.class_level).first()
    ]);
    const masteredLessons = Number(mastered?.count || 0);
    const quizAttempts = Number(attempts?.count || 0);
    const quizCorrect = Number(attempts?.correct || 0);
    const totalClassTopics = Number(topics?.count || 0);
    return json({
      status: 'success',
      child: { id: child.id, display_name: child.display_name, class_level: child.class_level, avatar: child.avatar },
      metrics: {
        mastered_lessons: masteredLessons,
        total_class_topics: totalClassTopics,
        class_completion_pct: totalClassTopics ? Math.round(masteredLessons / totalClassTopics * 100) : null,
        quiz_attempts: quizAttempts,
        quiz_correct: quizCorrect,
        quiz_accuracy_pct: quizAttempts ? Math.round(quizCorrect / quizAttempts * 100) : null
      }
    });
  }
  if (url.pathname === '/api/consent/status' && request.method === 'GET') {
    const user=await requireUser(request,env); if(!user) return json({detail:'Authentication required.'},401);
    const childId=url.searchParams.get('child_id') || user.id; let allowed=childId===user.id;
    if(!allowed){ const rel=await env.DB.prepare('SELECT 1 FROM guardian_relationships WHERE guardian_id=? AND child_id=? AND status=\'active\'').bind(user.id,childId).first(); allowed=!!rel; }
    if(!allowed) return json({detail:'Consent access is not authorized.'},403);
    const rows=await env.DB.prepare('SELECT purpose,action,notice_version,recorded_at,evidence_reference FROM consent_events WHERE child_id=? ORDER BY recorded_at DESC').bind(childId).all();
    const current={}; for(const row of (rows.results||[])){ if(current[row.purpose]===undefined) current[row.purpose]=row.action; }
    return json({child_id:childId,notice_version:'2026-09-16',consent:current,history:rows.results||[]});
  }
  if (url.pathname === '/api/consent/update' && (request.method === 'PATCH' || request.method === 'POST')) {
    const guardian=await requireUser(request,env); if(!guardian || guardian.role!=='Parent') return json({detail:'Verified parent authorization required.'},403);
    let body; try{body=await request.json();}catch(_){return json({detail:'Invalid JSON.'},400);} const childId=String(body.child_id||''); const rel=await env.DB.prepare('SELECT 1 FROM guardian_relationships WHERE guardian_id=? AND child_id=? AND status=\'active\' AND verified_at IS NOT NULL').bind(guardian.id,childId).first(); if(!rel) return json({detail:'Verified guardian relationship required.'},403);
    const purposes=body.purposes && typeof body.purposes==='object'?body.purposes:{}; const rows=[]; for(const purpose of ['analytics','voice','sharing']){ if(typeof purposes[purpose]!=='boolean') continue; rows.push(env.DB.prepare('INSERT INTO consent_events (id,child_id,guardian_id,purpose,action,notice_version,evidence_reference) VALUES (?,?,?,?,?,? ,?)').bind(uuid(),childId,guardian.id,purpose,purposes[purpose]?'granted':'withdrawn','2026-09-16','parent-account')); }
    if(rows.length) await env.DB.batch(rows); return json({status:'success',child_id:childId,consent:purposes});
  }
  if (url.pathname === '/api/learning-events' && request.method === 'POST') {
    const user = await requireUser(request, env); if (!user) return json({ detail: 'Authentication required.' }, 401);
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    if (body.consent !== true) return json({ detail: 'Analytics consent is required.' }, 403);
    const consentRows = await env.DB.prepare("SELECT ce.action FROM consent_events ce WHERE ce.purpose='analytics' AND (ce.child_id=? OR ce.child_id IN (SELECT child_id FROM guardian_relationships WHERE guardian_id=? AND status='active' AND verified_at IS NOT NULL)) ORDER BY ce.recorded_at DESC LIMIT 1").bind(user.id, user.id).all();
    const latestConsent = (consentRows.results || [])[0];
    if (!latestConsent || latestConsent.action !== 'granted') return json({ detail: 'Analytics consent is required.' }, 403);
    const events = Array.isArray(body.events) ? body.events : [];
    if (!events.length || events.length > 20) return json({ detail: 'Between 1 and 20 events are required.' }, 422);
    const eventNames = new Set(['lesson_start','lesson_step','lesson_abandon','lesson_complete','hint_used','quiz_start','quiz_answer','quiz_complete','review_start','review_complete','review_abandon','time_to_next_action','content_error','auth_expired','offline_state','cache_mismatch']);
    const eventFields = new Set(['event_id','event','occurred_at','session_id','source','account_scope','child_scope','topic_id','step','duration_ms','attempt_index','independent','hint_used','outcome','error_code']);
    const statements = [];
    for (const item of events) {
      if (!item || typeof item !== 'object' || Object.keys(item).some(key => !eventFields.has(key))) return json({ detail: 'Unsupported learning event fields.' }, 422);
      const eventId = String(item.event_id || ''), eventName = String(item.event || ''), sessionId = String(item.session_id || ''), source = String(item.source || '');
      const occurredMs = Date.parse(String(item.occurred_at || ''));
      if (!/^[A-Za-z0-9._:-]{1,120}$/.test(eventId) || !eventNames.has(eventName) || !/^[A-Za-z0-9._:-]{1,80}$/.test(sessionId) || !['browser','offline'].includes(source) || !Number.isFinite(occurredMs)) return json({ detail: 'Invalid learning event.' }, 422);
      const optionalText = (value, pattern, max) => value == null ? null : (typeof value === 'string' && value.length <= max && pattern.test(value) ? value : undefined);
      const accountScope = optionalText(item.account_scope, /^[A-Za-z0-9._:-]+$/, 120);
      const childScope = optionalText(item.child_scope, /^[A-Za-z0-9._:-]+$/, 120);
      const topicId = optionalText(item.topic_id, /^[A-Za-z0-9._:-]+$/, 120);
      const outcome = optionalText(item.outcome, /^[A-Za-z0-9._:-]+$/, 64);
      const errorCode = optionalText(item.error_code, /^[A-Za-z0-9._:-]+$/, 64);
      if (accountScope === undefined || childScope === undefined || topicId === undefined || outcome === undefined || errorCode === undefined) return json({ detail: 'Invalid learning event text.' }, 422);
      const bounded = (value, min, max) => value == null ? null : (Number.isInteger(value) && value >= min && value <= max ? value : undefined);
      const step = bounded(item.step, 1, 20), durationMs = bounded(item.duration_ms, 0, 86400000), attemptIndex = bounded(item.attempt_index, 0, 1000);
      if (step === undefined || durationMs === undefined || attemptIndex === undefined || (item.independent != null && typeof item.independent !== 'boolean') || (item.hint_used != null && typeof item.hint_used !== 'boolean')) return json({ detail: 'Invalid learning event values.' }, 422);
      statements.push(env.DB.prepare('INSERT OR IGNORE INTO learning_events (event_id,user_id,event_name,occurred_at,session_id,source,topic_id,step,duration_ms,attempt_index,independent,hint_used,outcome,error_code) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(eventId, user.id, eventName, new Date(occurredMs).toISOString(), sessionId, source, topicId, step, durationMs, attemptIndex, item.independent == null ? null : (item.independent ? 1 : 0), item.hint_used == null ? null : (item.hint_used ? 1 : 0), outcome, errorCode));
    }
    await env.DB.batch(statements);
    return json({ status: 'accepted', accepted: events.length });
  }
  if (url.pathname.match(/^\/api\/progress\/[^/]+$/) && request.method === 'GET') {
    const user=await requireUser(request,env); if(!user) return json({detail:'Authentication required.'},401); const subject=url.pathname.split('/')[3]; let allowed=subject===user.id; if(!allowed){const rel=await env.DB.prepare('SELECT 1 FROM guardian_relationships WHERE guardian_id=? AND child_id=? AND status=\'active\'').bind(user.id,subject).first(); allowed=!!rel;} if(!allowed) return json({detail:'Progress access is not authorized.'},403);
    const rows=await env.DB.prepare('SELECT content_id,mastered,updated_at FROM progress WHERE user_id=? ORDER BY updated_at DESC').bind(subject).all(); return json({user_id:subject,progress:rows.results||[]});
  }
  if (url.pathname === '/api/review/due' && request.method === 'GET') {
    const user = await requireUser(request, env); if (!user) return json({ detail: 'Authentication required.' }, 401);
    const today = workerReviewDate(0);
    const result = await env.DB.prepare("SELECT rs.content_id,rs.box,rs.review_count,rs.next_review_date,cr.title,cr.subject,cr.icon,cr.grade_min,cr.grade_max,cr.tier_required,cr.deep_link_url,cr.protected_json FROM review_schedule rs JOIN content_registry cr ON rs.content_id=cr.id WHERE rs.user_id=? AND rs.next_review_date<=? AND cr.status='published' ORDER BY rs.box DESC,rs.next_review_date ASC LIMIT 100").bind(user.id, today).all();
    const reviews = (result.results || []).filter(row => topicAllowed(user, row)).map(row => ({ content_id: row.content_id, box: Number(row.box || 1), review_count: Number(row.review_count || 0), next_review_date: row.next_review_date, title: row.title, subject: row.subject, icon: row.icon, grade_min: row.grade_min, grade_max: row.grade_max, tier_required: row.tier_required, deep_link_url: row.deep_link_url, ...workerReviewPreview(row) }));
    return json({ due_count: reviews.length, reviews });
  }
  if (url.pathname === '/api/review/mark' && request.method === 'POST') {
    const user = await requireUser(request, env); if (!user) return json({ detail: 'Authentication required.' }, 401);
    const contentId = String(url.searchParams.get('content_id') || '').trim(), quizSessionId = String(url.searchParams.get('quiz_session_id') || '').trim();
    if (!/^[A-Za-z0-9._:-]{1,160}$/.test(contentId)) return json({ detail: 'A valid content_id is required.' }, 422);
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(quizSessionId)) return json({ detail: 'A completed quiz session is required to advance review.' }, 409);
    const topic = await env.DB.prepare("SELECT id,subject,grade_min,grade_max,tier_required FROM content_registry WHERE id=? AND status='published'").bind(contentId).first();
    if (!topic) return json({ detail: 'Topic not found.' }, 404);
    if (!topicAllowed(user, topic)) return json({ detail: 'This lesson is not included in the active plan.' }, 403);
    const session = await env.DB.prepare('SELECT status,attempts_count,max_attempts,expires_at FROM quiz_sessions WHERE id=? AND user_id=? AND content_id=? LIMIT 1').bind(quizSessionId, user.id, contentId).first();
    if (!session || session.status !== 'completed') return json({ detail: 'Review quiz has not been completed.' }, 409);
    const score = await env.DB.prepare('SELECT COALESCE(SUM(is_correct),0) AS correct,COUNT(*) AS total FROM quiz_attempts WHERE quiz_session_id=? AND user_id=? AND content_id=?').bind(quizSessionId, user.id, contentId).first();
    if (!Number(score?.total || 0) || Number(score.correct || 0) / Number(score.total || 1) < 0.8) return json({ detail: 'Review score is below the mastery threshold.' }, 422);
    const prior = await env.DB.prepare('SELECT next_review_date FROM review_advancement_events WHERE user_id=? AND content_id=? AND quiz_session_id=? LIMIT 1').bind(user.id, contentId, quizSessionId).first();
    if (prior) return json({ status: 'success', next_review_date: prior.next_review_date, idempotent: true });
    const current = await env.DB.prepare('SELECT box,review_count FROM review_schedule WHERE user_id=? AND content_id=? LIMIT 1').bind(user.id, contentId).first();
    const currentBox = Math.min(5, Math.max(1, Number(current?.box || 1))), nextBox = Math.min(5, currentBox + (current ? 1 : 0)), intervals = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 }, nextDate = workerReviewDate(intervals[nextBox]);
    await env.DB.prepare('INSERT INTO review_schedule (user_id,content_id,box,next_review_date,review_count,last_reviewed_at) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,content_id) DO UPDATE SET box=excluded.box,next_review_date=excluded.next_review_date,review_count=review_schedule.review_count+1,last_reviewed_at=excluded.last_reviewed_at').bind(user.id, contentId, nextBox, nextDate, current ? Number(current.review_count || 0) + 1 : 1, new Date().toISOString()).run();
    await env.DB.prepare('INSERT OR IGNORE INTO review_advancement_events (user_id,content_id,quiz_session_id,next_review_date) VALUES (?,?,?,?)').bind(user.id, contentId, quizSessionId, nextDate).run();
    const receipt = await env.DB.prepare('SELECT next_review_date FROM review_advancement_events WHERE user_id=? AND content_id=? AND quiz_session_id=? LIMIT 1').bind(user.id, contentId, quizSessionId).first();
    return json({ status: 'success', next_review_date: receipt?.next_review_date || nextDate });
  }
  if (url.pathname === '/api/review/sync-lab-progress' && request.method === 'POST') {
    const user = await requireUser(request, env); if (!user) return json({ detail: 'Authentication required.' }, 401);
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const labId = String(body.lab_id || '').trim(), completed = Array.isArray(body.completed_lesson_ids) ? [...new Set(body.completed_lesson_ids.map(value => String(value).trim()).filter(value => /^[A-Za-z0-9._:-]{1,160}$/.test(value)))].slice(0, 300) : [], lastVisited = body.last_visited_lesson == null ? null : String(body.last_visited_lesson).trim();
    if (!/^[A-Za-z0-9._:-]{1,120}$/.test(labId) || (lastVisited != null && !/^[A-Za-z0-9._:-]{1,160}$/.test(lastVisited))) return json({ detail: 'Invalid lab progress.' }, 422);
    let mapped = 0;
    if (completed.length) { const marks = await env.DB.prepare("SELECT COUNT(*) AS count FROM content_registry WHERE status='published' AND id IN (" + completed.map(() => '?').join(',') + ")").bind(...completed).first(); mapped = Number(marks?.count || 0); }
    await env.DB.prepare('INSERT INTO lab_progress_sync (user_id,lab_id,completed_lesson_ids,last_visited_lesson,updated_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id,lab_id) DO UPDATE SET completed_lesson_ids=excluded.completed_lesson_ids,last_visited_lesson=excluded.last_visited_lesson,updated_at=CURRENT_TIMESTAMP').bind(user.id, labId, JSON.stringify(completed), lastVisited).run();
    return json({ status: 'success', newly_mastered_count: 0, newly_mastered_ids: [], unverified_activity_count: mapped, mastery_requires_server_quiz: true });
  }
  if (url.pathname === '/api/quiz/review-sessions' && request.method === 'POST') {
    const user = await requireUser(request, env); if (!user) return json({ detail: 'Authentication required.' }, 401);
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const mode = String(body.mode || '').trim();
    if (!['chapter','board','mixed','exam','recall'].includes(mode)) return json({ detail: 'Invalid review mode.' }, 422);
    let classLevel = Number(body.class_level || 0), subject = String(body.subject || '').trim(), chapter = String(body.chapter || '').trim();
    if (body.review_key) {
      const parts = String(body.review_key).split('/', 3);
      if (parts.length === 3 && /^C(?:[1-9]|10)$/.test(parts[0])) { if (!body.class_level) classLevel = Number(parts[0].slice(1)); subject = subject || parts[1].trim(); chapter = chapter || parts[2].trim(); }
    }
    if (!classLevel) classLevel = Number(user.enrolled_class || 0);
    if (mode === 'board' && ![9,10].includes(classLevel)) return json({ detail: 'Board Prep is available for Classes 9 and 10.' }, 422);
    if (['chapter','board'].includes(mode) && (!Number.isInteger(classLevel) || classLevel < 1 || classLevel > 10 || !subject || !chapter)) return json({ detail: 'class_level, subject and chapter are required.' }, 422);
    let sql = 'SELECT id,title,subject,grade_min,grade_max,tier_required,protected_json FROM content_registry WHERE status=?';
    const params = ['published'];
    if (['chapter','board','mixed'].includes(mode)) { sql += ' AND grade_min<=? AND grade_max>=?'; params.push(classLevel, classLevel); }
    if (['chapter','board'].includes(mode)) { sql += ' AND subject=? AND chapter=?'; params.push(subject, chapter); }
    if (['exam','recall'].includes(mode)) {
      const ids = Array.isArray(body.topic_ids) ? [...new Set(body.topic_ids.map(value => String(value).trim()).filter(value => /^[A-Za-z0-9._:-]{1,160}$/.test(value)))].slice(0, 30) : [];
      if (!ids.length) return json({ detail: 'topic_ids are required for this review.' }, 422);
      sql += ' AND id IN (' + ids.map(() => '?').join(',') + ')'; params.push(...ids);
    }
    sql += ' ORDER BY subject ASC,id ASC';
    const result = await env.DB.prepare(sql).bind(...params).all();
    let topics = (result.results || []).filter(row => topicAllowed(user, row));
    if (mode === 'mixed') {
      const counts = new Map(); topics = topics.filter(row => { const count = counts.get(row.subject) || 0; if (count >= 2) return false; counts.set(row.subject, count + 1); return true; });
    }
    const descriptors = workerReviewDescriptors(topics, 15);
    if (descriptors.length < 4) return json({ detail: 'Not enough entitled questions are available for this review.' }, 422);
    const sessionId = 'qsr_' + uuid().replaceAll('-', ''), expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const stored = descriptors.map(item => ({ ordinal: item.ordinal, content_id: item.content_id, question_index: item.question_index }));
    await env.DB.prepare("INSERT INTO quiz_sessions (id,user_id,content_id,question_indices,status,attempts_count,max_attempts,expires_at) VALUES (?,?,?,?,'active',0,?,?)").bind(sessionId, user.id, descriptors[0].content_id, JSON.stringify(stored), stored.length, expiresAt).run();
    return json({ status: 'success', session_id: sessionId, mode, expires_at: expiresAt, total_questions: descriptors.length, timed: ['board','exam'].includes(mode), questions: descriptors.map(workerPublicReviewQuestion) });
  }
  if (url.pathname === '/api/quiz/review-evaluate' && request.method === 'POST') {
    const user = await requireUser(request, env); if (!user) return json({ detail: 'Authentication required.' }, 401);
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const sessionId = String(body.review_session_id || '').trim(), ordinal = Number(body.question_index), selectedIndex = Number(body.selected_option_index);
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(sessionId) || !Number.isInteger(ordinal) || ordinal < 0 || ordinal > 100 || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 20) return json({ detail: 'Invalid review answer.' }, 422);
    const session = await env.DB.prepare('SELECT id,question_indices,status,attempts_count,max_attempts,expires_at FROM quiz_sessions WHERE id=? AND user_id=? LIMIT 1').bind(sessionId, user.id).first();
    if (!session) return json({ detail: 'Review session is invalid or belongs to another learner.' }, 409);
    if (workerQuizSessionExpired(session.expires_at)) { await env.DB.prepare("UPDATE quiz_sessions SET status='expired' WHERE id=?").bind(sessionId).run(); return json({ detail: 'Review session has expired. Start a new review.' }, 410); }
    if (session.status !== 'active') return json({ detail: 'Review session is no longer active.' }, 409);
    let stored; try { stored = JSON.parse(session.question_indices); } catch (_) { stored = null; }
    const descriptor = Array.isArray(stored) ? stored.find(item => Number(item?.ordinal) === ordinal) : null;
    if (!descriptor || !/^[A-Za-z0-9._:-]{1,160}$/.test(String(descriptor.content_id || ''))) return json({ detail: 'Question is not part of this review session.' }, 409);
    const row = await env.DB.prepare("SELECT id,title,subject,grade_min,grade_max,tier_required,protected_json FROM content_registry WHERE id=? AND status='published'").bind(descriptor.content_id).first();
    if (!row || !topicAllowed(user, row)) return json({ detail: 'This lesson is not included in the active plan.' }, 403);
    const question = workerQuizQuestions(row)[Number(descriptor.question_index)];
    if (!question || selectedIndex >= question.options.length) return json({ detail: 'Selected option is invalid.' }, 422);
    const existing = await env.DB.prepare('SELECT id,is_correct FROM quiz_attempts WHERE user_id=? AND content_id=? AND quiz_session_id=? AND question_index=? LIMIT 1').bind(user.id, row.id, sessionId, ordinal).first();
    if (existing) return json({ correct: Boolean(existing.is_correct), explanation: question.explanation, attempt_id: existing.id, question_index: ordinal, correct_option_index: question.answer_index, duplicate: true });
    const countRow = await env.DB.prepare('SELECT COUNT(*) AS count FROM quiz_attempts WHERE user_id=? AND quiz_session_id=?').bind(user.id, sessionId).first();
    const count = Number(countRow?.count || 0), maxAttempts = Number(session.max_attempts || stored.length || 15);
    if (count >= maxAttempts) return json({ detail: 'Review session attempt limit reached. Start a new review.' }, 409);
    const isCorrect = selectedIndex === question.answer_index, attemptId = 'qa_' + uuid().replaceAll('-', '').slice(0, 16);
    try { await env.DB.prepare('INSERT INTO quiz_attempts (id,user_id,content_id,quiz_session_id,question_index,selected_option_index,is_correct) VALUES (?,?,?,?,?,?,?)').bind(attemptId, user.id, row.id, sessionId, ordinal, selectedIndex, isCorrect ? 1 : 0).run(); }
    catch (_) {
      const retry = await env.DB.prepare('SELECT id,is_correct FROM quiz_attempts WHERE user_id=? AND content_id=? AND quiz_session_id=? AND question_index=? LIMIT 1').bind(user.id, row.id, sessionId, ordinal).first();
      if (retry) return json({ correct: Boolean(retry.is_correct), explanation: question.explanation, attempt_id: retry.id, question_index: ordinal, correct_option_index: question.answer_index, duplicate: true });
      return json({ detail: 'Review answer could not be recorded. Please retry.' }, 409);
    }
    const nextCount = count + 1, completed = nextCount >= maxAttempts;
    await env.DB.prepare("UPDATE quiz_sessions SET attempts_count=?,status=?,completed_at=? WHERE id=?").bind(nextCount, completed ? 'completed' : 'active', completed ? new Date().toISOString() : null, sessionId).run();
    const response = { correct: isCorrect, explanation: question.explanation, attempt_id: attemptId, question_index: ordinal, correct_option_index: question.answer_index };
    if (!isCorrect) response.misconception_coach = 'Review the explanation and try the idea again.';
    return json(response);
  }
  if (url.pathname === '/api/quiz/sessions' && request.method === 'POST') {
    const user = await requireUser(request, env); if (!user) return json({ detail: 'Authentication required.' }, 401);
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const contentId = String(body.content_id || '').trim();
    if (!/^[A-Za-z0-9._:-]{1,160}$/.test(contentId)) return json({ detail: 'A valid content_id is required.' }, 422);
    const row = await env.DB.prepare("SELECT id,title,subject,grade_min,grade_max,tier_required,protected_json FROM content_registry WHERE id=? AND status='published'").bind(contentId).first();
    if (!row) return json({ detail: 'Topic not found.' }, 404);
    if (!topicAllowed(user, row)) return json({ detail: 'This lesson is not included in the active plan.' }, 403);
    const questions = workerQuizQuestions(row); if (!questions.length) return json({ detail: 'This topic has no server-evaluable questions.' }, 422);
    const indices = questions.slice(0, 4).map((_, index) => index);
    const sessionId = 'qs_' + uuid().replaceAll('-', '');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await env.DB.prepare("INSERT INTO quiz_sessions (id,user_id,content_id,question_indices,status,attempts_count,max_attempts,expires_at) VALUES (?,?,?,?,'active',0,?,?)").bind(sessionId, user.id, contentId, JSON.stringify(indices), indices.length, expiresAt).run();
    return json({ status: 'success', session_id: sessionId, content_id: contentId, expires_at: expiresAt, total_questions: indices.length, questions: indices.map(index => workerPublicQuestion(questions[index], index)) });
  }
  if (url.pathname === '/api/quiz/evaluate' && request.method === 'POST') {
    const user = await requireUser(request, env); if (!user) return json({ detail: 'Authentication required.' }, 401);
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const contentId = String(body.content_id || '').trim(), sessionId = String(body.quiz_session_id || '').trim();
    const questionIndex = Number(body.question_index), selectedIndex = Number(body.selected_option_index);
    if (!sessionId || !/^[A-Za-z0-9_-]{8,80}$/.test(sessionId) || !/^[A-Za-z0-9._:-]{1,160}$/.test(contentId) || !Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex > 100 || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 20) return json({ detail: 'Invalid quiz answer.' }, 422);
    const session = await env.DB.prepare('SELECT id,content_id,question_indices,status,attempts_count,max_attempts,expires_at FROM quiz_sessions WHERE id=? AND user_id=? AND content_id=? LIMIT 1').bind(sessionId, user.id, contentId).first();
    if (!session) return json({ detail: 'Quiz session is invalid or belongs to another learner.' }, 409);
    if (workerQuizSessionExpired(session.expires_at)) { await env.DB.prepare("UPDATE quiz_sessions SET status='expired' WHERE id=?").bind(sessionId).run(); return json({ detail: 'Quiz session has expired. Start a new quiz.' }, 410); }
    let indices; try { indices = JSON.parse(session.question_indices); } catch (_) { indices = null; }
    if (!Array.isArray(indices) || !indices.includes(questionIndex)) return json({ detail: 'Question is not part of this quiz session.' }, 409);
    if (session.status !== 'active') return json({ detail: 'Quiz session is no longer active.' }, 409);
    const row = await env.DB.prepare("SELECT id,subject,grade_min,grade_max,tier_required,protected_json FROM content_registry WHERE id=? AND status='published'").bind(contentId).first();
    if (!row) return json({ detail: 'Topic not found.' }, 404);
    if (!topicAllowed(user, row)) return json({ detail: 'This lesson is not included in the active plan.' }, 403);
    const questions = workerQuizQuestions(row), question = questions[questionIndex];
    if (!question) return json({ detail: 'Question is not available for server-side evaluation.' }, 422);
    if (selectedIndex >= question.options.length) return json({ detail: 'Selected option is invalid.' }, 422);
    const existing = await env.DB.prepare('SELECT id,is_correct FROM quiz_attempts WHERE user_id=? AND content_id=? AND quiz_session_id=? AND question_index=? LIMIT 1').bind(user.id, contentId, sessionId, questionIndex).first();
    if (existing) return json({ correct: Boolean(existing.is_correct), explanation: question.explanation, attempt_id: existing.id, question_index: questionIndex, correct_option_index: question.answer_index, duplicate: true });
    const countRow = await env.DB.prepare('SELECT COUNT(*) AS count FROM quiz_attempts WHERE user_id=? AND quiz_session_id=?').bind(user.id, sessionId).first();
    const count = Number(countRow?.count || 0), maxAttempts = Number(session.max_attempts || indices.length || 4);
    if (count >= maxAttempts) return json({ detail: 'Quiz session attempt limit reached. Start a new quiz.' }, 409);
    const isCorrect = selectedIndex === question.answer_index, attemptId = 'qa_' + uuid().replaceAll('-', '').slice(0, 16);
    try { await env.DB.prepare('INSERT INTO quiz_attempts (id,user_id,content_id,quiz_session_id,question_index,selected_option_index,is_correct) VALUES (?,?,?,?,?,?,?)').bind(attemptId, user.id, contentId, sessionId, questionIndex, selectedIndex, isCorrect ? 1 : 0).run(); }
    catch (_) {
      const retry = await env.DB.prepare('SELECT id,is_correct FROM quiz_attempts WHERE user_id=? AND content_id=? AND quiz_session_id=? AND question_index=? LIMIT 1').bind(user.id, contentId, sessionId, questionIndex).first();
      if (retry) return json({ correct: Boolean(retry.is_correct), explanation: question.explanation, attempt_id: retry.id, question_index: questionIndex, correct_option_index: question.answer_index, duplicate: true });
      return json({ detail: 'Quiz answer could not be recorded. Please retry.' }, 409);
    }
    const nextCount = count + 1, completed = nextCount >= maxAttempts;
    await env.DB.prepare("UPDATE quiz_sessions SET attempts_count=?,status=?,completed_at=? WHERE id=?").bind(nextCount, completed ? 'completed' : 'active', completed ? new Date().toISOString() : null, sessionId).run();
    const response = { correct: isCorrect, explanation: question.explanation, attempt_id: attemptId, question_index: questionIndex, correct_option_index: question.answer_index };
    if (!isCorrect) response.misconception_coach = 'Review the explanation and try the idea again.';
    return json(response);
  }
  if (url.pathname === '/api/progress/master' && request.method === 'POST') {
    const user=await requireUser(request,env); if(!user) return json({detail:'Authentication required.'},401); let body; try{body=await request.json();}catch(_){return json({detail:'Invalid JSON.'},400);} const contentId=String(body.content_id||''), sessionId=String(body.quiz_session_id||''); if(!contentId||!sessionId) return json({detail:'A qualifying quiz session is required before mastery.'},409); const session=await env.DB.prepare('SELECT id FROM quiz_sessions WHERE id=? AND user_id=? AND content_id=? AND attempts_count>0').bind(sessionId,user.id,contentId).first(); if(!session) return json({detail:'Mastery requires a recorded quiz attempt.'},409); await env.DB.prepare('INSERT INTO progress (user_id,content_id,mastered) VALUES (?,?,1) ON CONFLICT(user_id,content_id) DO UPDATE SET mastered=1,updated_at=CURRENT_TIMESTAMP').bind(user.id,contentId).run(); return json({status:'success',content_id:contentId,mastered:true});
  }
  if (url.pathname === '/api/progress/unmaster' && request.method === 'POST') {
    const user=await requireUser(request,env); if(!user) return json({detail:'Authentication required.'},401); let body; try{body=await request.json();}catch(_){return json({detail:'Invalid JSON.'},400);} await env.DB.prepare('UPDATE progress SET mastered=0,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND content_id=?').bind(user.id,String(body.content_id||'')).run(); return json({status:'success',mastered:false});
  }
  if (url.pathname === '/api/progress/blob' && request.method === 'PUT') {
    const user=await requireUser(request,env); if(!user) return json({detail:'Authentication required.'},401); let body; try{body=await request.json();}catch(_){return json({detail:'Invalid JSON.'},400);} const blob=typeof body.blob==='string'?body.blob:JSON.stringify(body.blob||{}); if(blob.length>200000) return json({detail:'Progress snapshot is too large.'},413); await env.DB.prepare('INSERT INTO progress_blobs (user_id,blob,saved_at,class_code) VALUES (?,?,CURRENT_TIMESTAMP,?) ON CONFLICT(user_id) DO UPDATE SET blob=excluded.blob,saved_at=excluded.saved_at,class_code=excluded.class_code,updated_at=CURRENT_TIMESTAMP').bind(user.id,blob,body.class_code?String(body.class_code).slice(0,32):null).run(); return json({status:'success',saved_at:new Date().toISOString()});
  }
  if (url.pathname.match(/^\/api\/progress\/blob\/[^/]+$/) && request.method === 'GET') {
    const user=await requireUser(request,env); if(!user) return json({detail:'Authentication required.'},401); const subject=url.pathname.split('/')[4]; let allowed=subject===user.id; if(!allowed){const rel=await env.DB.prepare('SELECT 1 FROM guardian_relationships WHERE guardian_id=? AND child_id=? AND status=\'active\'').bind(user.id,subject).first(); allowed=!!rel;} if(!allowed) return json({detail:'Progress access is not authorized.'},403); const row=await env.DB.prepare('SELECT blob,saved_at,class_code FROM progress_blobs WHERE user_id=?').bind(subject).first(); return row?json(row):json({blob:null});
  }
  if (url.pathname.match(/^\/api\/topics\/[^/]+$/) && request.method === 'GET') {
    const topicId=url.pathname.split('/')[3]; const row=await env.DB.prepare('SELECT id,title,subject,grade_min,grade_max,chapter,strand,icon,summary,tier_required,deep_link_url FROM content_registry WHERE id=? AND status=\'published\'').bind(topicId).first(); return row?json({topic:row}):json({detail:'Topic not found.'},404);
  }
  if (url.pathname.match(/^\/api\/topics\/[^/]+\/content$/) && request.method === 'GET') {
    const user=await requireUser(request,env); if(!user) return json({detail:'Authentication required.'},401);
    const topicId=url.pathname.split('/')[3];
    const row=await env.DB.prepare('SELECT * FROM content_registry WHERE id=? AND status=\'published\'').bind(topicId).first();
    if(!row) return json({detail:'Topic not found.'},404);
    if(!topicAllowed(user,row)) return json({detail:'This lesson is not included in the active plan.',tier_required:row.tier_required},403);
    if(!row.protected_json) return json({detail:'Lesson body is not yet available in the protected store.'},404);
    return json({content:JSON.parse(row.protected_json)});
  }
if (url.pathname === '/api/progress/report-email' && request.method === 'POST') {
    const user = await requireUser(request, env);
    if (!user) return json({ detail: 'Authentication required.' }, 401);
    const role = String(user.role || '').toLowerCase();
    if (!['parent', 'student', 'admin'].includes(role)) return json({ detail: 'Report delivery is not authorized.' }, 403);
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const reportId = String(body.report_id || '').trim(), email = String(body.email || '').trim().toLowerCase(), subject = String(body.subject || '').trim();
    if (!/^(?:report|rpt)_[A-Za-z0-9-]{8,120}$/.test(reportId) || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || !subject || subject.length > 200) return json({ detail: 'A valid report, recipient, and subject are required.' }, 422);
    try {
      const report = await env.DB.prepare('SELECT id,child_id,html FROM reports WHERE id=?').bind(reportId).first();
      if (!report) return json({ detail: 'Report not found.' }, 404);
      if (role === 'parent') {
        const linked = await env.DB.prepare("SELECT 1 FROM guardian_relationships WHERE guardian_id=? AND child_id=? AND status='active' UNION SELECT 1 FROM parent_child_relationships WHERE parent_id=? AND child_id=? AND status='active' LIMIT 1").bind(user.id, report.child_id, user.id, report.child_id).first();
        if (!linked) return json({ detail: 'Active guardian relationship required.' }, 403);
      } else if (role !== 'admin' && report.child_id !== user.id) return json({ detail: 'Cannot deliver another learner report.' }, 403);
      if (role !== 'admin' && email !== String(user.email || '').trim().toLowerCase()) return json({ detail: 'Recipient email must match the authenticated account.' }, 400);
      const requestedKey = request.headers.get('Idempotency-Key');
      const idempotencyKey = requestedKey && /^[A-Za-z0-9._:-]{1,120}$/.test(requestedKey) ? requestedKey : await sha256Hex(reportId + '|' + user.id + '|' + email + '|' + subject);
      const queueId = 'mail_' + uuid().replaceAll('-', '');
      await env.DB.prepare("INSERT OR IGNORE INTO report_emails (id,report_id,user_id,email,subject,body_html,status,idempotency_key) VALUES (?,?,?,?,?,?, 'pending',?)").bind(queueId, reportId, user.id, email, subject, workerSafeReportHtml(report.html), idempotencyKey).run();
      const queued = await env.DB.prepare('SELECT id,report_id,status,attempts,created_at FROM report_emails WHERE idempotency_key=?').bind(idempotencyKey).first();
      return json({ status: 'queued', delivery_status: queued?.status || 'pending', queue_id: queued?.id || queueId, report_id: reportId, attempts: Number(queued?.attempts || 0) });
    } catch (_) { return json({ detail: 'Report email queue is not initialized. Apply the release schema and retry.' }, 503); }
  }
  if (url.pathname === '/api/progress/report-email/pending' && request.method === 'GET') {
    if (!env.REPORT_WORKER_SECRET || request.headers.get('Authorization') !== 'Bearer ' + env.REPORT_WORKER_SECRET) return json({ detail: 'Report worker authorization required.' }, 401);
    try {
      const rows = await env.DB.prepare("SELECT id,report_id,user_id,email,subject,body_html,attempts FROM report_emails WHERE status='pending' AND attempts < 5 AND (claimed_at IS NULL OR claimed_at < datetime('now','-10 minutes')) AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP) ORDER BY created_at LIMIT 50").all();
      const items = rows.results || [];
      if (items.length) await env.DB.batch(items.map(row => env.DB.prepare('UPDATE report_emails SET claimed_at=CURRENT_TIMESTAMP,attempts=attempts+1 WHERE id=? AND status=\'pending\'').bind(row.id)));
      return json({ status: 'ok', max_attempts: 5, emails: items.map(row => ({ ...row, attempts: Number(row.attempts || 0) + 1 })) });
    } catch (_) { return json({ detail: 'Report email queue is not initialized.' }, 503); }
  }
  if (url.pathname.match(/^\/api\/progress\/report-email\/[^/]+\/status$/) && request.method === 'POST') {
    if (!env.REPORT_WORKER_SECRET || request.headers.get('Authorization') !== 'Bearer ' + env.REPORT_WORKER_SECRET) return json({ detail: 'Report worker authorization required.' }, 401);
    const queueId = decodeURIComponent(url.pathname.split('/')[4] || '');
    let body; try { body = await request.json(); } catch (_) { return json({ detail: 'Invalid JSON.' }, 400); }
    const deliveryStatus = String(body.status || ''), error = body.error == null ? null : String(body.error).slice(0, 500);
    if (!['sent', 'failed'].includes(deliveryStatus) || !/^mail_[A-Za-z0-9-]{8,100}$/.test(queueId)) return json({ detail: 'Invalid delivery status.' }, 422);
    try {
      const row = await env.DB.prepare('SELECT attempts,status FROM report_emails WHERE id=?').bind(queueId).first();
      if (!row) return json({ detail: 'Email queue row not found.' }, 404);
      const attempts = Number(row.attempts || 0);
      const terminal = deliveryStatus === 'failed' && attempts >= 5;
      const nextStatus = deliveryStatus === 'sent' ? 'sent' : (terminal ? 'failed' : 'pending');
      const retrySeconds = Math.min(3600, 30 * (2 ** Math.max(0, attempts - 1)));
      const nextAttemptAt = nextStatus === 'pending' ? new Date(Date.now() + retrySeconds * 1000).toISOString().slice(0, 19).replace('T', ' ') : null;
      const nextError = nextStatus === 'sent' ? null : error;
      const result = await env.DB.prepare("UPDATE report_emails SET status=?,error=?,claimed_at=NULL,sent_at=CASE WHEN ?='sent' THEN CURRENT_TIMESTAMP ELSE NULL END,next_attempt_at=? WHERE id=?").bind(nextStatus, nextError, nextStatus, nextAttemptAt, queueId).run();
      if (!result.meta?.changes) return json({ detail: 'Email queue row not found.' }, 404);
      return json({ status: nextStatus, queue_id: queueId, attempts, retry_in_seconds: nextStatus === 'pending' ? retrySeconds : null, terminal });
    } catch (_) { return json({ detail: 'Report email queue is not initialized.' }, 503); }
  }
  if (url.pathname === '/api/progress/reports' && request.method === 'POST') {
    const parent=await requireUser(request,env); if(!parent || parent.role!=='Parent') return json({detail:'Parent authorization required.'},403); let body; try{body=await request.json();}catch(_){return json({detail:'Invalid JSON.'},400);} const childId=String(body.child_id||''); const child=await env.DB.prepare('SELECT c.* FROM child_profiles c JOIN guardian_relationships r ON r.child_id=c.id AND r.guardian_id=? AND r.status=\'active\' WHERE c.id=? AND c.deleted_at IS NULL').bind(parent.id,childId).first(); if(!child) return json({detail:'Learner access is not authorized.'},403); const mastered=await env.DB.prepare('SELECT COUNT(*) AS count FROM progress WHERE user_id=? AND mastered=1').bind(childId).first(); const attempts=await env.DB.prepare('SELECT COUNT(*) AS count,COALESCE(SUM(is_correct),0) AS correct FROM quiz_attempts WHERE user_id=?').bind(childId).first(); const reportId='report_'+uuid().replaceAll('-',''); const note=String(body.parent_note||'').slice(0,1000); const html='<h1>Skill X learning report</h1><p><strong>Learner:</strong> '+workerEscapeHtml(child.display_name)+'</p><p><strong>Mastered lessons:</strong> '+Number(mastered?.count||0)+'</p><p><strong>Quiz attempts:</strong> '+Number(attempts?.count||0)+'</p><p><strong>Correct answers:</strong> '+Number(attempts?.correct||0)+'</p>'+(note?'<hr><h2>Parent note</h2><p>'+workerEscapeHtml(note)+'</p>':''); await env.DB.prepare('INSERT INTO reports (id,child_id,created_by,period_start,period_end,html) VALUES (?,?,?,?,?,?)').bind(reportId,childId,parent.id,body.period_start||null,body.period_end||null,html).run(); return json({status:'success',report_id:reportId,verified_metrics:{mastered_lessons:Number(mastered?.count||0),quiz_attempts:Number(attempts?.count||0),quiz_correct:Number(attempts?.correct||0)},parent_note:note||null,html});
  }
  if (url.pathname === '/api/admin/metrics' && request.method === 'GET') {
    const admin = await requireUser(request, env);
    if (!admin || String(admin.role).toLowerCase() !== 'admin') return json({ detail: 'Administrator authorization required.' }, 403);
    const [roles, tiers, classes, paid, payments, attempts, active, topics, events, failedJobs, reportQueue] = await Promise.all([
      env.DB.prepare('SELECT role,COUNT(*) AS count FROM users GROUP BY role').all(),
      env.DB.prepare('SELECT tier,COUNT(*) AS count FROM users GROUP BY tier').all(),
      env.DB.prepare("SELECT enrolled_class,COUNT(*) AS count FROM users WHERE LOWER(role)<>'admin' GROUP BY enrolled_class ORDER BY enrolled_class").all(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE LOWER(role)<>'admin' AND tier<>'free' AND subscription_expires_at IS NOT NULL AND subscription_expires_at>CURRENT_TIMESTAMP").first(),
      env.DB.prepare('SELECT status,COUNT(*) AS count,COALESCE(SUM(total_amount),0) AS revenue FROM payments GROUP BY status').all(),
      env.DB.prepare('SELECT COUNT(*) AS attempts,COALESCE(SUM(is_correct),0) AS correct FROM quiz_attempts').first(),
      env.DB.prepare("SELECT COUNT(DISTINCT user_id) AS count FROM quiz_attempts WHERE attempted_at>=datetime('now','-1 day')").first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM content_registry WHERE status='published'").first(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM payment_events').first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM deletion_jobs WHERE status='failed'").first(),
      env.DB.prepare("SELECT status,COUNT(*) AS count FROM report_emails GROUP BY status").all().catch(() => ({ results: [] }))
    ]);
    const roleMap = {}, tierMap = {}, classMap = {}, paymentMap = {};
    for (const row of roles.results || []) roleMap[row.role] = Number(row.count || 0);
    for (const row of tiers.results || []) tierMap[row.tier || 'free'] = Number(row.count || 0);
    for (const row of classes.results || []) classMap[String(row.enrolled_class)] = Number(row.count || 0);
    const reportEmailMap = {};
    for (const row of reportQueue.results || []) reportEmailMap[row.status || 'unknown'] = Number(row.count || 0);
    let revenue = 0;
    for (const row of payments.results || []) { paymentMap[row.status] = Number(row.count || 0); revenue += Number(row.revenue || 0); }
    const total = Object.values(roleMap).reduce((sum, value) => sum + value, 0);
    const attemptsCount = Number(attempts?.attempts || 0), correctCount = Number(attempts?.correct || 0);
    return json({ status: 'success', users: { total, by_role: roleMap, by_tier: tierMap, by_class: classMap, active_today: Number(active?.count || 0) }, paid_users: Number(paid?.count || 0), published_topics: Number(topics?.count || 0), subscriptions: { active_paid: Number(paid?.count || 0) }, learning: { quiz_attempts: attemptsCount, quiz_accuracy: attemptsCount ? Math.round(correctCount / attemptsCount * 100) : 0 }, payments: { status_counts: paymentMap, total_revenue_inr: revenue }, governance_and_safety: { payment_events: Number(events?.count || 0), failed_deletion_jobs: Number(failedJobs?.count || 0) }, operational_health: { database: 'ok', published_topics: Number(topics?.count || 0), webhook_events: Number(events?.count || 0), report_email_queue: { pending: reportEmailMap.pending || 0, sent: reportEmailMap.sent || 0, failed: reportEmailMap.failed || 0, delivery_configured: Boolean(env.EMAIL) } }, operator: { id: admin.id, email: admin.email } });
  }
  if (url.pathname === '/api/entitlement/check' && request.method === 'GET') {
    const user = await requireUser(request, env); if (!user) return json({ allowed: false, detail: 'Authentication required.' }, 401);
    const contentId = url.searchParams.get('content_id');
    const row = await env.DB.prepare('SELECT subject,tier_required,grade_min,grade_max FROM content_registry WHERE id = ? AND status = \'published\'').bind(contentId).first();
    if (!row) return json({ allowed: false, reason: 'not_found' }, 404);
    const allowed = topicAllowed(user, { ...row, id: contentId });
    return json({ allowed, tier_required: row.tier_required, tier: activeTier(user), enrolled_class: user.enrolled_class || null, subscription_max_grade: maxGrade(user) });
  }
  return json({ detail: 'This feature is not enabled on the current API release.', error_code: 'feature_unavailable' }, 501);
}

export default {
  async fetch(request, env) {
    const id = requestId(request);
    const startedAt = Date.now();
    let response;
    try {
      response = cors(request, await handle(request, env));
    } catch (_) {
      response = cors(request, json({ detail: 'Internal API error.' }, 500));
    }
    const contextual = withRequestContext(response, id);
    logRequest(request, id, contextual, startedAt);
    return contextual;
  },
};











