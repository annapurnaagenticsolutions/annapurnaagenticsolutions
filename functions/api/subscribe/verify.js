import {
  consentVersion, isEmail, json, keyFor, now, originAllowed, privacyNoticeVersion,
  readBody, sha256, options
} from './_shared.js';

export async function onRequestOptions(context) {
  return options(context);
}

export async function onRequestPost({ request, env }) {
  if (!originAllowed(request)) return json({ error: 'origin_not_allowed', message: 'Open the subscription form on an Annapurna website.' }, 403, request);
  if (!env.PRAMANA_LEADS || !env.PRAMANA_OTP) {
    return json({ error: 'subscription_unavailable', message: 'Email subscriptions are being prepared. Please try again later.' }, 503, request);
  }
  const body = await readBody(request);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!isEmail(email) || !/^\d{6}$/.test(code)) {
    return json({ error: 'invalid_fields', message: 'Enter your email and the six-digit code.' }, 400, request);
  }
  const key = await keyFor(email);
  try {
    const pending = await env.PRAMANA_OTP.get(key, { type: 'json' });
    if (!pending || pending.email !== email || pending.expires_at <= now()) {
      return json({ error: 'code_expired', message: 'The code has expired. Request a new one.' }, 400, request);
    }
    if (pending.attempts >= 5) {
      return json({ error: 'too_many_attempts', message: 'Too many attempts. Request a new code later.' }, 429, request);
    }
    if (await sha256(pending.nonce + ':' + code) !== pending.code_hash) {
      pending.attempts += 1;
      await env.PRAMANA_OTP.put(key, JSON.stringify(pending), { expirationTtl: Math.max(60, Math.ceil((pending.expires_at - now()) / 1000)) });
      return json({ error: 'wrong_code', message: pending.attempts >= 5 ? 'Too many attempts. Request a new code later.' : 'That code did not match.' }, 400, request);
    }

    const saved = await env.PRAMANA_LEADS.prepare(
      `INSERT INTO subscriptions (email,source,interest,marketing_opt_in,consent_ver,privacy_notice_ver,verified_at,unsubscribed_at)
       VALUES (?,?,?,1,?,?,datetime('now'),NULL)
       ON CONFLICT(email) DO UPDATE SET source=excluded.source, interest=excluded.interest,
       marketing_opt_in=1, consent_ver=excluded.consent_ver, privacy_notice_ver=excluded.privacy_notice_ver,
       verified_at=datetime('now'), unsubscribed_at=NULL, updated_at=datetime('now')`
    ).bind(email, pending.source, pending.interest || null, consentVersion, privacyNoticeVersion).run();
    if (!saved?.success) throw new Error('subscription write failed');
    await env.PRAMANA_OTP.delete(key);
    return json({ status: 'verified', message: 'You are subscribed. We will email occasional product updates and feedback invitations.' }, 200, request);
  } catch {
    return json({ error: 'subscription_unavailable', message: 'We could not finish the subscription. Please try again.' }, 503, request);
  }
}
