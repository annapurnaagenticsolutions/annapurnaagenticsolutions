import assert from 'node:assert/strict';
import { onRequestPost as submit } from '../functions/api/lead/submit.js';
import { onRequestPost as verify } from '../functions/api/lead/verify.js';

const kvData = new Map();
const leads = new Map();
const reportRequests = [];
const marketingLeads = new Map();
const mail = [];
let failNextSummary = false;
const env = {
  RESEND_API_KEY: 'test-only',
  PRAMANA_OTP: {
    async get(key) { return kvData.get(key) || null; },
    async put(key, value) { kvData.set(key, JSON.parse(value)); },
    async delete(key) { kvData.delete(key); }
  },
  PRAMANA_LEADS: {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.includes('FROM report_requests')) return [...reportRequests].reverse().find(row => row.email === args[0] && row.resend_at) || null;
              const row = leads.get(args[0]);
              return row ? { created_at: row.created_at, resend_at: row.resend_at, consent_ver: row.consent_ver } : null;
            },
            async run() {
              if (sql.startsWith('INSERT INTO report_requests')) {
                const row = { id: reportRequests.length + 1, email: args[0], name: args[1], resend_at: null };
                reportRequests.push(row);
                return { success: true, meta: { last_row_id: row.id } };
              }
              if (sql.startsWith('UPDATE report_requests')) {
                reportRequests.find(row => row.id === args[0]).resend_at = new Date().toISOString();
                return { success: true };
              }
              if (sql.startsWith('DELETE FROM report_requests')) {
                const at = reportRequests.findIndex(row => row.id === args[0] && !row.resend_at);
                if (at >= 0) reportRequests.splice(at, 1);
                return { success: true };
              }
              if (sql.startsWith('INSERT INTO marketing_leads')) {
                marketingLeads.set(args[0], { email: args[0], name: args[1] });
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
  mail.push(JSON.parse(options.body));
  if (failNextSummary && mail.at(-1).subject.includes('discussion notes')) { failNextSummary = false; return new Response('', { status: 503 }); }
  return new Response(JSON.stringify({ id: 'local-test' }), { status: 200 });
};
const answers = Object.fromEntries(['map','roles','purpose','notice','providers','security','retention','requests',
  'evidence','children','automated','sdf','transfers','scope'].map(key => [key, 'unsure']));
function request(path, body, origin = 'https://annapurnaagenticsolutions.com') {
  return new Request('https://annapurnaagenticsolutions.com' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body)
  });
}
const contact = { name: 'Sample Owner', email: 'owner@example.test', role: 'Owner',
  organization: 'Example Shop', company_size: '1-10', sector: 'commerce',
  contact_me: false, email_request: true, answers, website: '' };
let r = await submit({ request: request('/api/lead/submit', contact), env });
assert.equal(r.status, 200);
assert.equal(mail.length, 1);
assert.equal(leads.size, 0);
assert.match(mail[0].text, /verification code/);
const code = mail[0].text.match(/\b\d{6}\b/)[0];
r = await submit({ request: request('/api/lead/submit', contact), env });
assert.equal(r.status, 200);
assert.equal(mail.length, 1, 'one-minute pause blocks repeat codes');
r = await verify({ request: request('/api/lead/verify', { email: contact.email, code: '999999' }), env });
assert.equal(r.status, 400);
r = await verify({ request: request('/api/lead/verify', { email: contact.email, code }), env });
assert.equal(r.status, 200);
assert.equal((await r.json()).email_sent, true);
assert.equal(reportRequests.length, 1);
assert.equal(marketingLeads.size, 0, 'no marketing row without opt-in');
assert.equal(leads.size, 0, 'legacy leads not written');
assert.equal(mail.length, 2);
assert.match(mail[1].text, /Not sure yet/);
assert.doesNotMatch(mail[1].text, /compliance score: [0-9]/i);
assert.equal(kvData.size, 0);
r = await submit({ request: request('/api/lead/submit', contact), env });
assert.equal(r.status, 200);
assert.equal(mail.length, 2, '24-hour pause blocks repeat email');
r = await submit({ request: request('/api/lead/submit', { ...contact, email: 'other@example.test' }, 'https://evil.example') , env });
assert.equal(r.status, 403);
r = await submit({ request: request('/api/lead/submit', { ...contact, answers: {} }), env });
assert.equal(r.status, 400);
r = await submit({ request: request('/api/lead/submit', contact), env: {} });
assert.equal(r.status, 503);
const second = { ...contact, email: 'person@gmail.com' };
r = await submit({ request: request('/api/lead/submit', second), env });
assert.equal(r.status, 200, 'personal email is allowed for small businesses');
const secondCode = mail.at(-1).text.match(/\b\d{6}\b/)[0];
failNextSummary = true;
r = await verify({ request: request('/api/lead/verify', { email: second.email, code: secondCode }), env });
assert.equal(r.status, 503);
assert.equal(reportRequests.filter(row => row.email === second.email).length, 0, 'failed delivery does not retain a report request');
r = await verify({ request: request('/api/lead/verify', { email: second.email, code: secondCode }), env });
assert.equal(r.status, 200, 'same valid code can retry delivery');
const opted = { ...contact, email: 'opted@example.test', contact_me: true };
r = await submit({ request: request('/api/lead/submit', opted), env });
const optedCode = mail.at(-1).text.match(/\b\d{6}\b/)[0];
r = await verify({ request: request('/api/lead/verify', { email: opted.email, code: optedCode }), env });
assert.equal(r.status, 200);
assert.equal(marketingLeads.has(opted.email), true, 'marketing row only with opt-in');
const third = { ...contact, email: 'third@example.test' };
r = await submit({ request: request('/api/lead/submit', third), env });
assert.equal(r.status, 200);
const thirdCode = mail.at(-1).text.match(/\b\d{6}\b/)[0];
const wrong = String((Number(thirdCode) + 1) % 1000000).padStart(6, '0');
for (let i = 0; i < 5; i++) {
  r = await verify({ request: request('/api/lead/verify', { email: third.email, code: wrong }), env });
  assert.equal(r.status, 400);
}
r = await verify({ request: request('/api/lead/verify', { email: third.email, code: thirdCode }), env });
assert.equal(r.status, 429, 'correct code is blocked after five wrong attempts');
console.log('Pramana email function tests passed');
