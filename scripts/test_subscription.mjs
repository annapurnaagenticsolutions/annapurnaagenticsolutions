import assert from 'node:assert/strict';
import { onRequestPost as submit } from '../functions/api/subscribe/submit.js';
import { onRequestPost as verify } from '../functions/api/subscribe/verify.js';

const kv = new Map();
const subscriptions = new Map();
const mail = [];
const env = {
  RESEND_API_KEY: 'test-only',
  PRAMANA_OTP: {
    async get(key) { return kv.get(key) || null; },
    async put(key, value) { kv.set(key, JSON.parse(value)); },
    async delete(key) { kv.delete(key); }
  },
  PRAMANA_LEADS: {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.includes('FROM subscriptions')) return subscriptions.get(args[0]) || null;
              return null;
            },
            async run() {
              if (sql.includes('INSERT INTO subscriptions')) {
                subscriptions.set(args[0], { email: args[0], source: args[1], interest: args[2], verified_at: new Date().toISOString(), unsubscribed_at: null });
                return { success: true };
              }
              throw new Error('Unexpected SQL: ' + sql);
            }
          };
        }
      };
    }
  }
};

globalThis.fetch = async (url, options) => {
  assert.equal(url, 'https://api.resend.com/emails');
  const payload = JSON.parse(options.body);
  mail.push(payload);
  return new Response(JSON.stringify({ id: 'local-test' }), { status: 200 });
};

const request = (path, body, origin = 'https://annapurnaagenticsolutions.com') => new Request(
  'https://annapurnaagenticsolutions.com' + path,
  { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) }
);

const payload = { email: 'tester@example.test', source: 'play', interest: 'play', consent: true, website: '' };
let response = await submit({ request: request('/api/subscribe/submit', payload), env });
assert.equal(response.status, 200);
assert.match(mail[0].text, /verification code/);
const code = mail[0].text.match(/\b\d{6}\b/)[0];
response = await verify({ request: request('/api/subscribe/verify', { email: payload.email, code }), env });
assert.equal(response.status, 200);
assert.equal(subscriptions.size, 1);
assert.equal(kv.size, 0);

response = await submit({ request: request('/api/subscribe/submit', { ...payload, email: 'bad' }), env });
assert.equal(response.status, 400);
response = await submit({ request: request('/api/subscribe/submit', payload, 'https://evil.example'), env });
assert.equal(response.status, 403);

console.log('Subscription submit/verify tests passed');
