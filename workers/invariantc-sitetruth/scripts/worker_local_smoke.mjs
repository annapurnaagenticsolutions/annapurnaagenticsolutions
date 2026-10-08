#!/usr/bin/env node
/** Exercise only a locally running Worker with an operator-seeded synthetic tenant. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { request as httpRequest } from "node:http";

const baseUrl = process.env.WORKER_LOCAL_URL ?? "http://127.0.0.1:8787";
const base = new URL(baseUrl);
if (base.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) || base.username || base.password || base.search || base.hash) {
  throw new Error("WORKER_LOCAL_URL must be a credential-free HTTP loopback origin");
}
const token = process.env.WORKER_LOCAL_TEST_TOKEN;
if (!/^stp_[A-Za-z0-9_-]{22}_[A-Za-z0-9_-]{43}$/.test(token ?? "")) {
  throw new Error("Set WORKER_LOCAL_TEST_TOKEN to the synthetic local-only API key");
}
const secondTenantToken = process.env.WORKER_LOCAL_SECOND_TENANT_TOKEN;
const revokedToken = process.env.WORKER_LOCAL_REVOKED_TOKEN;
const expiredToken = process.env.WORKER_LOCAL_EXPIRED_TOKEN;
for (const [name, value] of Object.entries({ secondTenantToken, revokedToken, expiredToken })) {
  if (value !== undefined && !/^stp_[A-Za-z0-9_-]{22}_[A-Za-z0-9_-]{43}$/.test(value)) {
    throw new Error(`${name} is not a valid synthetic local-only API key`);
  }
}

const health = await fetch(new URL("/health", baseUrl));
assert.equal(health.status, 200, "local Worker health should report configured bindings");
const healthBody = await health.json();
assert.equal(healthBody.customer_payload_storage, "disabled");
assert.equal(healthBody.browser_scanning, "disabled");

const fixtureUrl = new URL("/", baseUrl);
const preview = await fetch(fixtureUrl);
assert.equal(preview.status, 200, "local Worker should serve the static preview");
assert.match(preview.headers.get("content-security-policy") ?? "", /connect-src 'none'/);
assert.equal(preview.headers.get("x-frame-options"), "DENY");

const contract = JSON.parse(await readFile(resolve("examples/apples.contract.json"), "utf8"));
const observations = JSON.parse(await readFile(resolve("examples/apples.observations.json"), "utf8"));
const payload = JSON.stringify({ contract, observations });
const checkUrl = new URL("/v1/check", baseUrl);
const denied = await fetch(checkUrl, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: payload,
});
assert.equal(denied.status, 401, "unauthenticated evaluation must be rejected");

const authorized = (apiToken = token, body = payload) => fetch(checkUrl, {
  method: "POST",
  headers: { authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
  body,
  ...(body instanceof ReadableStream ? { duplex: "half" } : {}),
});
function delayedAuthorized(apiToken, delayMs) {
  return new Promise((resolveResponse, rejectRequest) => {
    const request = httpRequest(checkUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiToken}`,
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(payload)),
      },
    });
    request.on("error", rejectRequest);
    request.on("response", (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolveResponse({
        status: response.statusCode,
        headers: response.headers,
        json: JSON.parse(Buffer.concat(chunks).toString("utf8")),
      }));
    });
    request.flushHeaders();
    setTimeout(() => request.end(payload), delayMs);
  });
}
const first = await authorized();
assert.equal(first.status, 200, "authenticated evaluation should complete");
const report = await first.json();
assert.equal(report.ok, true);
assert.equal(report.report.outcome, "fail", "synthetic apples fixture should produce FAIL");
assert.match(report.report.contract_sha256, /^[0-9a-f]{64}$/);
assert.match(report.report.observation_sha256, /^[0-9a-f]{64}$/);
assert.equal(first.headers.get("x-ratelimit-remaining"), "0");

const limited = await authorized();
assert.equal(limited.status, 429, "second request should be limited by the synthetic per-minute quota");
assert.ok(Number(limited.headers.get("retry-after")) > 0);

if (secondTenantToken) {
  const independent = await authorized(secondTenantToken);
  assert.equal(independent.status, 200, "a second tenant should have an independent quota window");

  const inFlight = delayedAuthorized(secondTenantToken, 700);
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 120));
  const concurrent = await authorized(secondTenantToken);
  assert.equal(concurrent.status, 429, "a second tenant request should be blocked while the first lease is active");
  assert.equal((await concurrent.json()).reason, "concurrency_limit");
  assert.equal((await inFlight).status, 200, "the request holding the lease should complete");
}

for (const invalidToken of [revokedToken, expiredToken].filter(Boolean)) {
  assert.equal((await authorized(invalidToken)).status, 401, "revoked and expired keys should be rejected");
}

console.log("Local Worker smoke PASSED: D1 key auth, revoked/expired-key rejection, tenant isolation, WASM FAIL report, SQLite DO request/concurrency quotas, static CSP, and unauthenticated rejection.");
console.log("Scope: synthetic local D1/Workerd state only; no Cloudflare account or remote endpoint was used.");
