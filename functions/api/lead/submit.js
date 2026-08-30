/**
 * Pramana Lead Gate — Cloudflare Pages Function
 * Route: POST /api/lead/submit
 *
 * Step 1: Validates email (not free domain), checks D1 for duplicates,
 *         generates a 6-digit OTP, stores it in KV with 10-min TTL,
 *         sends OTP email via Resend.com, returns status.
 *
 * Bindings required (set in Cloudflare Pages dashboard):
 *   - PRAMANA_LEADS (D1 database)
 *   - PRAMANA_OTP   (KV namespace)
 *   - RESEND_API_KEY (secret env var)
 *   - ALLOWED_ORIGIN (env var: https://annapurnaagenticsolutions.com)
 */

// Free/personal email domains to block (B2B leads only)
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com','googlemail.com','yahoo.com','yahoo.in','yahoo.co.in',
  'hotmail.com','outlook.com','live.com','msn.com','icloud.com',
  'me.com','mac.com','proton.me','protonmail.com','tutanota.com',
  'aol.com','rediffmail.com','ymail.com','rocketmail.com',
]);

// OTP TTL: 10 minutes
const OTP_TTL_SECONDS = 600;

// 24h re-send window (soft dedup — allow re-send after 24h)
const RESEND_COOLDOWN_HOURS = 24;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

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

  // ── Parse body ────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_body', message: 'Request body must be JSON.' }, 400, cors);
  }

  const {
    name, email, organization, role, company_size, sector,
    budget_range, score, grade, traffic_light, passed, failed,
    warnings, total, consent, consent_ver, source_url,
    utm_source, utm_medium, utm_campaign,
    website,  // honeypot field — must be empty
  } = body;

  // ── Honeypot spam check ───────────────────────────────────────
  if (website && website.trim() !== '') {
    // Silently accept but don't store — it's a bot
    return json({ status: 'otp_sent' }, 200, cors);
  }

  // ── Basic validation ──────────────────────────────────────────
  if (!name || !email || !consent) {
    return json({ error: 'missing_fields', message: 'Name, email and consent are required.' }, 400, cors);
  }

  const emailNorm = email.toLowerCase().trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(emailNorm)) {
    return json({ error: 'invalid_email', message: 'Please enter a valid email address.' }, 400, cors);
  }

  // ── Free email domain check ───────────────────────────────────
  const domain = emailNorm.split('@')[1];
  if (FREE_EMAIL_DOMAINS.has(domain)) {
    return json({
      error: 'personal_email',
      message: 'Please use your work or organisation email address. Personal email domains are not accepted.',
    }, 400, cors);
  }

  // ── Duplicate / re-send check (D1) ───────────────────────────
  const existing = await env.PRAMANA_LEADS.prepare(
    'SELECT email, resend_at, created_at FROM leads WHERE email = ?'
  ).bind(emailNorm).first();

  if (existing) {
    const lastSent = existing.resend_at || existing.created_at;
    const hoursSinceLast = (Date.now() - new Date(lastSent + 'Z').getTime()) / 3_600_000;

    if (hoursSinceLast < RESEND_COOLDOWN_HOURS) {
      return json({
        status: 'already_registered',
        message: `We already sent your results to this email. Please check your inbox (including spam). You can request a re-send after ${Math.ceil(RESEND_COOLDOWN_HOURS - hoursSinceLast)} hours.`,
      }, 200, cors);
    }

    // Past cooldown — allow re-send, update resend_at
    await env.PRAMANA_LEADS.prepare(
      'UPDATE leads SET resend_at = datetime("now") WHERE email = ?'
    ).bind(emailNorm).run();
  }

  // ── Generate OTP and store in KV ─────────────────────────────
  const otp = generateOtp();
  const kvKey = `otp:${emailNorm}`;
  const kvValue = JSON.stringify({
    otp,
    name, email: emailNorm, organization, role, company_size, sector,
    budget_range, score, grade, traffic_light, passed, failed,
    warnings, total, consent, consent_ver: consent_ver || 'v1', source_url,
    utm_source, utm_medium, utm_campaign,
    is_resend: !!existing,
  });
  await env.PRAMANA_OTP.put(kvKey, kvValue, { expirationTtl: OTP_TTL_SECONDS });

  // ── Send OTP email via Resend ─────────────────────────────────
  try {
    const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#1e293b">
  <div style="background:#1e40af;border-radius:12px;padding:24px;margin-bottom:24px">
    <h1 style="color:#fff;margin:0;font-size:20px">Pramana — DPDP Compliance Check</h1>
    <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px">Annapurna Agentic Solutions</p>
  </div>
  <p>Hi <strong>${name.split(' ')[0]}</strong>,</p>
  <p>Here is your one-time verification code to unlock your full DPDP compliance report:</p>
  <div style="background:#f1f5f9;border:2px solid #2563eb;border-radius:10px;padding:24px;text-align:center;margin:24px 0">
    <div style="font-size:36px;font-weight:800;letter-spacing:0.15em;color:#1e40af">${otp}</div>
    <p style="color:#64748b;font-size:13px;margin:8px 0 0">Valid for 10 minutes</p>
  </div>
  <p style="font-size:14px;color:#475569">Enter this code on the page where you completed the assessment. Do not share this code with anyone.</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
  <p style="font-size:12px;color:#94a3b8">
    If you didn't request this, you can safely ignore this email.<br/>
    Annapurna Agentic Solutions · <a href="https://annapurnaagenticsolutions.com/pramana/">annapurnaagenticsolutions.com/pramana</a>
  </p>
</body>
</html>`;

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Pramana by Annapurna <noreply@annapurnaagenticsolutions.com>',
        to: [emailNorm],
        subject: `${otp} is your Pramana verification code`,
        html: emailBody,
      }),
    });

    if (!resendResp.ok) {
      const resendErr = await resendResp.text();
      console.error('Resend error:', resendErr);
      return json({ error: 'email_failed', message: 'We could not send the verification email. Please try again.' }, 500, cors);
    }
  } catch (err) {
    console.error('Resend fetch error:', err);
    return json({ error: 'email_failed', message: 'Email delivery failed. Please try again.' }, 500, cors);
  }

  return json({ status: 'otp_sent', message: `A 6-digit code was sent to ${emailNorm}. Please check your inbox.` }, 200, cors);
}
