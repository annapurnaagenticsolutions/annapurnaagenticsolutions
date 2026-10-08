import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STAGING_BASE_URL,
  runStagingReadonlySmoke,
} from "../scripts/staging_readonly_smoke.mjs";

function stagingFetch({ health = {}, previewHeaders = {}, unauthenticatedStatus = 401 } = {}) {
  const calls = [];
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(input);
    calls.push({ url, init });
    if (url.pathname === "/health") {
      return Response.json({
        service: "invariantc-sitetruth-api",
        status: "ready",
        domain_verification: "disabled",
        customer_payload_storage: "disabled",
        browser_scanning: "disabled",
        hosted_scan_intake: "disabled",
        ...health,
      });
    }
    if (url.pathname === "/") {
      return new Response("preview", { status: 200, headers: {
        "content-type": "text/html; charset=utf-8",
        "content-security-policy": "default-src 'none'; frame-ancestors 'none'; connect-src 'none'",
        "x-frame-options": "DENY",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
        ...previewHeaders,
      } });
    }
    if (url.pathname === "/v1/check") {
      return Response.json({ error: "Unauthorized" }, { status: unauthenticatedStatus });
    }
    throw new Error("Unexpected staging request");
  };
  return { fetchImpl, calls };
}

test("staging smoke checks only the disabled-feature health, preview headers, and unauthenticated API path", async () => {
  const { fetchImpl, calls } = stagingFetch();
  const result = await runStagingReadonlySmoke({ fetchImpl });
  assert.equal(result.baseUrl, DEFAULT_STAGING_BASE_URL);
  assert.equal(result.checks.length, 3);
  assert.deepEqual(calls.map(({ url }) => url.pathname), ["/health", "/", "/v1/check"]);
  for (const { url, init } of calls) {
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, new URL(DEFAULT_STAGING_BASE_URL).hostname);
    assert.equal(init.redirect, "error");
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(new Headers(init.headers).has("authorization"), false);
  }
  assert.equal(calls[2].init.method, "POST");
  assert.equal(calls[2].init.body, "{}");
});

test("staging smoke refuses every non-staging or credential-bearing base URL before network access", async () => {
  const { fetchImpl, calls } = stagingFetch();
  for (const baseUrl of [
    "http://invariantc-sitetruth-api-staging.account.workers.dev",
    "https://invariantc-sitetruth-api.account.workers.dev",
    "https://user:secret@invariantc-sitetruth-api-staging.account.workers.dev",
    "https://invariantc-sitetruth-api-staging.account.workers.dev/path",
    "https://invariantc-sitetruth-api-staging.account.workers.dev/?token=x",
    "https://example.com",
  ]) {
    await assert.rejects(runStagingReadonlySmoke({ baseUrl, fetchImpl }), /staging Worker origin/);
  }
  assert.equal(calls.length, 0);
});

test("staging smoke fails if a hosted scan or domain feature is enabled", async () => {
  const { fetchImpl } = stagingFetch({ health: { hosted_scan_intake: "enabled" } });
  await assert.rejects(runStagingReadonlySmoke({ fetchImpl }), /gate mismatch: hosted_scan_intake/);
});

test("staging smoke requires preview hardening and unauthenticated API rejection", async () => {
  const badHeaders = stagingFetch({ previewHeaders: { "x-frame-options": "SAMEORIGIN" } });
  await assert.rejects(runStagingReadonlySmoke({ fetchImpl: badHeaders.fetchImpl }), /security headers/);

  const badAuth = stagingFetch({ unauthenticatedStatus: 200 });
  await assert.rejects(runStagingReadonlySmoke({ fetchImpl: badAuth.fetchImpl }), /returned HTTP 200; expected 401/);
});

test("staging smoke bounds response bodies", async () => {
  const fetchImpl = async () => new Response("x".repeat(16 * 1024 + 1), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  await assert.rejects(runStagingReadonlySmoke({ fetchImpl }), /response exceeded the size limit/);
});
