import { test } from "node:test";
import assert from "node:assert/strict";
import { authenticateTenant, sha256Hex } from "../src/auth.mjs";

const keyId = "k".repeat(22);
const secret = "s".repeat(43);
const token = `stp_${keyId}_${secret}`;

function dbWithRow(row, queryTracker = { count: 0 }) {
  return {
    prepare(sql) {
      assert.match(sql, /api_keys/);
      return {
        bind(receivedKeyId, nowMs) {
          assert.equal(receivedKeyId, keyId);
          assert.ok(Number.isSafeInteger(nowMs));
          return { first: async () => { queryTracker.count += 1; return row; } };
        },
      };
    },
  };
}

test("authenticates a scoped tenant key by key ID and secret hash", async () => {
  const row = {
    token_sha256: await sha256Hex(secret), tenant_id: "pilot_tenant_1",
    requests_per_minute: 10, requests_per_day: 100, max_concurrent: 2,
  };
  const tenant = await authenticateTenant(new Request("https://example.test", { headers: { authorization: `Bearer ${token}` } }), { DB: dbWithRow(row) });
  assert.deepEqual(tenant, { tenantId: "pilot_tenant_1", requestsPerMinute: 10, requestsPerDay: 100, maxConcurrent: 2 });
});

test("rejects malformed, mismatched, and unconfigured tenant keys", async () => {
  const tracker = { count: 0 };
  const request = (value) => new Request("https://example.test", { headers: { authorization: value } });
  assert.equal(await authenticateTenant(request("Bearer bad"), { DB: dbWithRow(null, tracker) }), null);
  assert.equal(tracker.count, 0);
  assert.equal(await authenticateTenant(request(`Bearer stp_${keyId}_${"x".repeat(43)}`), { DB: dbWithRow({ token_sha256: "a".repeat(64), tenant_id: "pilot_tenant_1", requests_per_minute: 10, requests_per_day: 100, max_concurrent: 2 }, tracker) }), null);
  await assert.rejects(() => authenticateTenant(request(`Bearer ${token}`), {}), /not configured/);
  const matchingHash = await sha256Hex(secret);
  await assert.rejects(() => authenticateTenant(request(`Bearer ${token}`), { DB: dbWithRow({
    token_sha256: matchingHash, tenant_id: "pilot_tenant_1",
    requests_per_minute: null, requests_per_day: null, max_concurrent: null,
  }) }), /quota policy/);
});
