/**
 * Pramana Lead Gate — Cloudflare Pages Function
 * Route: POST /api/lead/verify
 *
 * Step 2: Verifies the OTP from KV, stores confirmed lead in D1,
 *         deletes KV entry (one-time use), returns success.
 *
 * Bindings required:
 *   - PRAMANA_LEADS (D1 database)
 *   - PRAMANA_OTP   (KV namespace)
 *   - ALLOWED_ORIGIN (env var)
 */

const MAX_OTP_ATTEMPTS = 5;  // stored in KV alongside otp

function getCorsHeaders(origin, allowedOrigin) {
  const allow = origin === allowedOrigin || allowedOrigin === '*' ? origin : allowedOrigin;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function onRequestOptions({ request, env }) {
  const origin = request.headers.get('Origin') || '';
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin, env.ALLOWED_ORIGIN || '*'),
  });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin') || '';
  const cors = getCorsHeaders(origin, env.ALLOWED_ORIGIN || '*');

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_body', message: 'Request body must be JSON.' }, 400, cors);
  }

  const { email, otp } = body;

  if (!email || !otp) {
    return json({ error: 'missing_fields', message: 'Email and OTP are required.' }, 400, cors);
  }

  const emailNorm = email.toLowerCase().trim();
  const kvKey = `otp:${emailNorm}`;

  // ── Read KV entry ─────────────────────────────────────────────
  const stored = await env.PRAMANA_OTP.get(kvKey, { type: 'json' });

  if (!stored) {
    return json({
      error: 'otp_expired',
      message: 'Your verification code has expired or was already used. Please go back and request a new one.',
    }, 400, cors);
  }

  // ── Verify OTP ────────────────────────────────────────────────
  if (String(stored.otp) !== String(otp).trim()) {
    // Track failed attempts (stored alongside otp data)
    const attempts = (stored._attempts || 0) + 1;
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await env.PRAMANA_OTP.delete(kvKey);
      return json({
        error: 'otp_too_many_attempts',
        message: 'Too many incorrect attempts. Please go back and request a new verification code.',
      }, 400, cors);
    }
    // Update attempt count in KV (preserve TTL by re-putting with same key)
    // We can't read the remaining TTL easily, so we just store updated attempts
    await env.PRAMANA_OTP.put(kvKey, JSON.stringify({ ...stored, _attempts: attempts }), { expirationTtl: 600 });
    return json({
      error: 'otp_invalid',
      message: `Incorrect code (${MAX_OTP_ATTEMPTS - attempts} attempt${MAX_OTP_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining). Please try again.`,
    }, 400, cors);
  }

  // ── OTP valid — delete from KV (one-time use) ─────────────────
  await env.PRAMANA_OTP.delete(kvKey);

  // ── Store lead in D1 ─────────────────────────────────────────
  const {
    name, organization, role, company_size, sector,
    budget_range, score, grade, traffic_light, passed, failed,
    warnings, total, consent, consent_ver, source_url,
    utm_source, utm_medium, utm_campaign, is_resend,
  } = stored;

  try {
    if (is_resend) {
      // Lead already exists — just acknowledge
    } else {
      await env.PRAMANA_LEADS.prepare(`
        INSERT OR IGNORE INTO leads
          (email, name, organization, role, company_size, sector, budget_range,
           score, grade, traffic_light, passed, failed, warnings, total,
           utm_source, utm_medium, utm_campaign, consent, consent_ver, source_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        emailNorm, name, organization || null, role || null, company_size || null,
        sector || null, budget_range || null,
        score ?? null, grade || null, traffic_light || null,
        passed ?? null, failed ?? null, warnings ?? null, total ?? null,
        utm_source || null, utm_medium || null, utm_campaign || null,
        consent ? 1 : 0, consent_ver || 'v1', source_url || null
      ).run();
    }
  } catch (err) {
    console.error('D1 insert error:', err);
    // Don't fail the user — the lead may already exist (race condition), just continue
  }

  return json({
    status: 'verified',
    message: 'Email verified. Your full report is now unlocked.',
  }, 200, cors);
}
