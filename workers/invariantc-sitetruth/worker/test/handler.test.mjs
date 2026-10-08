import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler, MAX_BODY_READ_MS } from "../src/handler.mjs";
import { isPublicSuffixHostname } from "../src/public-suffix.mjs";
import { LEASE_TTL_MS } from "../src/tenant-quota-core.mjs";
import { MemoryDomainDb } from "./fixtures/domain-db.mjs";

const token = `stp_${"k".repeat(22)}_${"s".repeat(43)}`;
const tenant = { tenantId: "pilot_tenant_1", requestsPerMinute: 10, requestsPerDay: 100, maxConcurrent: 2 };
const serviceEnv = { DB: {}, TENANT_QUOTA: {} };
let evaluatorCalls = 0;
let reservations = 0;
let releases = 0;
let quotaDecision = null;
let releaseFails = false;

const dependencies = {
  authenticate: async (request) => request.headers.get("authorization") === `Bearer ${token}` ? tenant : null,
  reserve: async (_env, _tenant, leaseId) => {
    reservations += 1;
    assert.match(leaseId, /^[0-9a-f-]{36}$/i);
    return quotaDecision ?? { allowed: true, minuteRemaining: 9, dayRemaining: 99, minuteResetAtMs: 1_800_000_060_000 };
  },
  release: async () => {
    releases += 1;
    if (releaseFails) throw new Error("synthetic release failure");
  },
};
const checker = (contractJson, observations) => {
  evaluatorCalls += 1;
  const contract = JSON.parse(contractJson);
  const obs = JSON.parse(observations);
  const result = { ok: true, report: {
    report_version: 1, outcome: obs.ui?.count === 4 ? "pass" : "fail",
    secret: "must be removed", results: [], summary: { passed: 0, failed: 0, unknown: 0 },
    contract_id: "fixture", contract_sha256: "a".repeat(64), observation_sha256: "b".repeat(64),
  } };
  if (contract.throw) throw new Error("synthetic evaluator failure");
  return JSON.stringify(result);
};
const handler = createHandler(checker, dependencies);
const checkUrl = "https://sitetest.example/v1/check";

function request(url = checkUrl, options = {}) { return new Request(url, options); }
function authed(body = { contract: { version: 1 }, observations: { ui: { count: 4 } } }) {
  return request(checkUrl, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("health discloses configuration status without secrets", async () => {
  const ready = await handler(request("https://sitetest.example/health"), serviceEnv);
  assert.equal(ready.status, 200);
  const health = await ready.json();
  assert.equal(health.domain_verification, "disabled");
  assert.equal(health.customer_payload_storage, "disabled");
  assert.equal(health.hosted_scan_intake, "disabled");
  const missingSuffixData = await handler(request("https://sitetest.example/health"), {
    ...serviceEnv, DOMAIN_VERIFICATION_ENABLED: "true",
  });
  const incompleteHealth = await missingSuffixData.json();
  assert.equal(incompleteHealth.domain_verification, "disabled");
  assert.equal(incompleteHealth.hosted_scan_intake, "disabled");
  assert.equal((await handler(request("https://sitetest.example/health"), {})).status, 503);
  assert.equal(ready.headers.get("cache-control"), "no-store");
});

test("domain verification and scan intake remain absent while their feature gates are off", async () => {
  const body = JSON.stringify({ origin: "https://example.com" });
  const disabled = await handler(request("https://sitetest.example/v1/domains/challenges", {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body,
  }), serviceEnv);
  assert.equal(disabled.status, 404);

  const scan = await handler(request("https://sitetest.example/v1/scans", {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body,
  }), { ...serviceEnv, DOMAIN_VERIFICATION_ENABLED: "true" });
  assert.equal(scan.status, 404);
});

test("enabled domain endpoints still validate exact-origin input", async () => {
  const url = "https://sitetest.example/v1/domains/challenges";
  const response = await handler(request(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ origin: "https://example.com" }),
  }), { ...serviceEnv, DOMAIN_VERIFICATION_ENABLED: "true" });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "public_suffix_data_unavailable");

  const guardedHandler = createHandler(checker, { ...dependencies, publicSuffixCheck: () => false });
  const invalidOrigin = await guardedHandler(request(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ origin: "http://example.com" }),
  }), { ...serviceEnv, DOMAIN_VERIFICATION_ENABLED: "true" });
  assert.equal(invalidOrigin.status, 400);
  assert.equal((await invalidOrigin.json()).code, "invalid_origin");
});

test("enabled domain routes issue, verify, and revoke one tenant-bound origin", async () => {
  const db = new MemoryDomainDb();
  let expectedTxt = null;
  const domainHandler = createHandler(checker, {
    authenticate: async (request) => request.headers.get("authorization") === `Bearer ${token}` ? tenant : null,
    reserve: async () => ({ allowed: true, minuteRemaining: 8, dayRemaining: 98, minuteResetAtMs: 1_800_000_060_000 }),
    release: async () => {},
    publicSuffixCheck: isPublicSuffixHostname,
    resolveTxt: async (name) => {
      assert.equal(name, "_invariantc-verification.verify.example.com");
      return [expectedTxt];
    },
  });
  const env = { DB: db, TENANT_QUOTA: {}, DOMAIN_VERIFICATION_ENABLED: "true" };
  const publicSuffix = await domainHandler(request("https://sitetest.example/v1/domains/challenges", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ origin: "https://co.uk" }),
  }), env);
  assert.equal(publicSuffix.status, 400);
  assert.equal((await publicSuffix.json()).code, "invalid_origin");

  const issued = await domainHandler(request("https://sitetest.example/v1/domains/challenges", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ origin: "https://verify.example.com" }),
  }), env);
  assert.equal(issued.status, 201);
  const { challenge } = await issued.json();
  expectedTxt = challenge.txt_value;
  assert.equal(db.challenges[0].token_sha256.length, 64);
  assert.equal(Object.hasOwn(db.challenges[0], "token"), false);

  const verified = await domainHandler(request(`https://sitetest.example/v1/domains/challenges/${challenge.challenge_id}/verify`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  }), env);
  assert.equal(verified.status, 200);
  const { origin } = await verified.json();
  assert.equal(origin.origin, "https://verify.example.com");
  assert.equal(db.challenges[0].consumed_at_ms, origin.verified_at_ms);

  const revoked = await domainHandler(request(`https://sitetest.example/v1/domains/origins/${origin.origin_id}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  }), env);
  assert.equal(revoked.status, 200);
  assert.equal((await revoked.json()).origin.revoked, true);
  assert.notEqual(db.origins[0].revoked_at_ms, null);
});

test("fails closed without tenant services and rejects unauthorized requests before evaluation", async () => {
  assert.equal((await handler(authed(), {})).status, 503);
  const before = evaluatorCalls;
  const denied = await handler(request(checkUrl, {
    method: "POST", headers: { "content-type": "application/json" }, body: "{}",
  }), serviceEnv);
  assert.equal(denied.status, 401);
  assert.equal(evaluatorCalls, before);
});

test("evaluates real adapter output and strips fields outside the public report", async () => {
  const before = evaluatorCalls;
  const response = await handler(authed(), serviceEnv);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.report.outcome, "pass");
  assert.equal(Object.hasOwn(body.report, "secret"), false);
  assert.equal(response.headers.get("x-ratelimit-remaining"), "9");
  assert.equal(response.headers.has("access-control-allow-origin"), false);
  assert.equal(evaluatorCalls, before + 1);
});

test("FAIL is a valid evaluation outcome and is not an HTTP error", async () => {
  const response = await handler(authed({ contract: {}, observations: { ui: { count: 5 } } }), serviceEnv);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).report.outcome, "fail");
});

test("validates method, MIME, body size, and request shape", async () => {
  assert.equal((await handler(request(checkUrl), serviceEnv)).status, 405);
  const beforeEarlyRejections = reservations;
  assert.equal((await handler(request(checkUrl, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "text/plain" }, body: "{}" }), serviceEnv)).status, 415);
  assert.equal((await handler(request(checkUrl, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "content-length": "262145" }, body: "{}" }), serviceEnv)).status, 413);
  assert.equal(reservations, beforeEarlyRejections + 2);
  assert.equal((await handler(authed({ contract: {}, observations: { large: "x".repeat(300_000) } }), serviceEnv)).status, 400);
  assert.equal((await handler(authed({ contract: {}, observations: null }), serviceEnv)).status, 422);
  assert.equal((await handler(authed({ contract: {}, observations: {}, tenant_id: "attacker-controlled" }), serviceEnv)).status, 422);
});

test("body read deadlines cancel slow streams and release a lease before its expiry", async () => {
  assert.ok(MAX_BODY_READ_MS < LEASE_TTL_MS);
  const beforeCalls = evaluatorCalls;
  const beforeReleases = releases;
  let cancelled = false;
  const slowBody = new ReadableStream({ cancel() { cancelled = true; } });
  const shortHandler = createHandler(checker, { ...dependencies, bodyReadTimeoutMs: 10 });
  const response = await shortHandler(request(checkUrl, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: slowBody,
    duplex: "half",
  }), serviceEnv);
  assert.equal(response.status, 408);
  assert.equal((await response.json()).error, "Request body timed out");
  assert.equal(cancelled, true);
  assert.equal(evaluatorCalls, beforeCalls);
  assert.equal(releases, beforeReleases + 1);

  let domainCancelled = false;
  const slowDomainBody = new ReadableStream({ cancel() { domainCancelled = true; } });
  const domainHandler = createHandler(checker, {
    ...dependencies,
    bodyReadTimeoutMs: 10,
    publicSuffixCheck: isPublicSuffixHostname,
  });
  const domainResponse = await domainHandler(request("https://sitetest.example/v1/domains/challenges", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: slowDomainBody,
    duplex: "half",
  }), { ...serviceEnv, DOMAIN_VERIFICATION_ENABLED: "true" });
  assert.equal(domainResponse.status, 408);
  assert.equal((await domainResponse.json()).code, "request_timeout");
  assert.equal(domainCancelled, true);
  assert.equal(releases, beforeReleases + 2);
});

test("rate and concurrency rejections do not invoke the evaluator", async () => {
  quotaDecision = { allowed: false, reason: "daily_limit", retryAfterSeconds: 60 };
  const before = evaluatorCalls;
  const response = await handler(authed(), serviceEnv);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(evaluatorCalls, before);
  quotaDecision = null;
});

test("releases the concurrency lease after evaluator errors and fails closed on release errors", async () => {
  const before = releases;
  const errored = await handler(authed({ contract: { throw: true }, observations: {} }), serviceEnv);
  assert.equal(errored.status, 502);
  assert.equal(releases, before + 1);

  releaseFails = true;
  assert.equal((await handler(authed(), serviceEnv)).status, 503);
  releaseFails = false;
});

test("serves the product surface through the optional static asset binding", async () => {
  const assets = { fetch: async () => new Response("pilot surface", { status: 200 }) };
  const response = await handler(request("https://sitetest.example/"), { ...serviceEnv, ASSETS: assets });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
  assert.match(response.headers.get("content-security-policy"), /connect-src 'none'/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(await response.text(), "pilot surface");
});
