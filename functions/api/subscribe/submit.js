import {
  clean, consentVersion, isEmail, json, keyFor, now, originAllowed, otpTtl,
  privacyNoticeVersion, readBody, repeatPause, requestPause, sha256,
  validInterest, validSource, otpEmail, options
} from './_shared.js';

export async function onRequestOptions(context) {
  return options(context);
}

export async function onRequestPost({ request, env }) {
  if (!originAllowed(request)) return json({ error: 'origin_not_allowed', message: 'Open the subscription form on an Annapurna website.' }, 403, request);
  if (!env.PRAMANA_LEADS || !env.PRAMANA_OTP || !env.RESEND_API_KEY) {
    return json({ error: 'subscription_unavailable', message: 'Email subscriptions are being prepared. Please try again later.' }, 503, request);
  }
  const body = await readBody(request);
  if (!body || typeof body !== 'object' || Array.isArray(body) || body.website) {
    return json({ status: 'request_received' }, 200, request);
  }
  const email = clean(body.email, 254).toLowerCase();
  const source = clean(body.source, 20);
  const interest = clean(body.interest, 20);
  if (!isEmail(email) || !validSource(source) || !validInterest(interest) || body.consent !== true) {
    return json({ error: 'invalid_fields', message: 'Enter a valid email and accept the optional updates consent.' }, 400, request);
  }

  const current = now();
  const key = await keyFor(email);
  try {
    const existing = await env.PRAMANA_LEADS.prepare(
      'SELECT verified_at, unsubscribed_at FROM subscriptions WHERE email = ?'
    ).bind(email).first();
    const verifiedAt = existing?.verified_at ? Date.parse(existing.verified_at.replace(' ', 'T') + 'Z') : 0;
    if (verifiedAt && !existing.unsubscribed_at && current - verifiedAt < repeatPause) {
      return json({ status: 'request_received' }, 200, request);
    }
    const pending = await env.PRAMANA_OTP.get(key, { type: 'json' });
    if (pending && pending.expires_at > current && current - pending.sent_at < requestPause) {
      return json({ status: 'request_received' }, 200, request);
    }

    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const code = String(random[0] % 1_000_000).padStart(6, '0');
    const nonce = crypto.randomUUID();
    const pendingValue = {
      code_hash: await sha256(nonce + ':' + code), nonce, email, source, interest,
      sent_at: current, expires_at: current + otpTtl * 1000, attempts: 0
    };
    await env.PRAMANA_OTP.put(key, JSON.stringify(pendingValue), { expirationTtl: otpTtl });
    const mail = {
      ...otpEmail(code),
      to: [email]
    };
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'subscription-code-' + nonce
      },
      body: JSON.stringify(mail)
    });
    if (!sent.ok) {
      await env.PRAMANA_OTP.delete(key);
      return json({ error: 'subscription_unavailable', message: 'We could not send the verification email. Please try again later.' }, 503, request);
    }
    return json({ status: 'request_received' }, 200, request);
  } catch {
    try { await env.PRAMANA_OTP.delete(key); } catch {}
    return json({ error: 'subscription_unavailable', message: 'Email subscriptions are temporarily unavailable.' }, 503, request);
  }
}
