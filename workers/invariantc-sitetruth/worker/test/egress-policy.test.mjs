import assert from "node:assert/strict";
import { test } from "node:test";
import {
  handleOutboundRequest,
} from "../egress-prototype/src/policy.mjs";
import {
  TLS_PROBE_HOSTNAME,
  TLS_PROBE_PATH,
} from "../egress-prototype/src/pinned-tls.mjs";

test("egress policy denies all requests by default without forwarding", async () => {
  const response = await handleOutboundRequest(new Request("https://example.com/path"));
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("x-sitetruth-egress-decision"), "deny");
  assert.equal(response.headers.get("x-sitetruth-egress-reason"), "default-deny");
});

test("egress policy returns only the fixed synthetic redirect and never forwards", async () => {
  const redirect = await handleOutboundRequest(new Request("https://redirect-egress.invalid/start"));
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), "https://final-egress.invalid/blocked");

  const finalResponse = await handleOutboundRequest(new Request("https://final-egress.invalid/blocked"));
  assert.equal(finalResponse.status, 403);
  assert.equal(finalResponse.headers.get("x-sitetruth-egress-decision"), "deny");
});

test("egress policy rejects non-GET methods", async () => {
  const methodResponse = await handleOutboundRequest(new Request("http://example.invalid/", { method: "POST" }));
  assert.equal(methodResponse.status, 403);
  assert.equal(methodResponse.headers.get("x-sitetruth-egress-reason"), "method-not-allowed");
});

test("egress policy permits only the exact fixed TLS-only probe and validates its evidence", async () => {
  const evidence = {
    hostname: TLS_PROBE_HOSTNAME,
    selectedAddress: "93.184.216.34",
    remoteAddress: "93.184.216.34",
    servername: TLS_PROBE_HOSTNAME,
    authorized: true,
    addressFamily: 4,
    resolvedAddressCount: 1,
  };
  const calls = [];
  const response = await handleOutboundRequest(
    new Request(`https://${TLS_PROBE_HOSTNAME}${TLS_PROBE_PATH}`),
    { probeTls: async (hostname) => { calls.push(hostname); return evidence; } },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-sitetruth-egress-decision"), "pinned-tls-pass");
  assert.deepEqual(await response.json(), { status: "pass", evidence });
  assert.deepEqual(calls, [TLS_PROBE_HOSTNAME]);
});

test("egress policy rejects nearby paths, query strings, other authorities, and non-GET TLS probes", async (t) => {
  const probeTls = async () => { throw new Error("probe must not run for an unapproved request"); };
  const requests = [
    new Request(`https://${TLS_PROBE_HOSTNAME}${TLS_PROBE_PATH}/extra`),
    new Request(`https://${TLS_PROBE_HOSTNAME}${TLS_PROBE_PATH}?x=1`),
    new Request(`https://${TLS_PROBE_HOSTNAME}:444${TLS_PROBE_PATH}`),
    new Request(`https://other.example${TLS_PROBE_PATH}`),
    new Request(`http://${TLS_PROBE_HOSTNAME}${TLS_PROBE_PATH}`),
    new Request(`https://${TLS_PROBE_HOSTNAME}${TLS_PROBE_PATH}`, { method: "POST" }),
  ];

  for (const [index, request] of requests.entries()) {
    await t.test(`request ${index + 1}`, async () => {
      const response = await handleOutboundRequest(request, { probeTls });
      assert.equal(response.status, 403);
      assert.equal(response.headers.get("x-sitetruth-egress-decision"), "deny");
    });
  }
});

test("egress policy returns a generic 502 when TLS evidence is invalid or the probe fails", async (t) => {
  const url = `https://${TLS_PROBE_HOSTNAME}${TLS_PROBE_PATH}`;
  for (const [name, probeTls] of [
    ["invalid evidence", async () => ({ hostname: TLS_PROBE_HOSTNAME })],
    ["private address evidence", async () => ({
      hostname: TLS_PROBE_HOSTNAME,
      servername: TLS_PROBE_HOSTNAME,
      authorized: true,
      selectedAddress: "169.254.169.254",
      remoteAddress: "169.254.169.254",
      addressFamily: 4,
      resolvedAddressCount: 1,
    })],
    ["thrown probe", async () => { throw new Error("sensitive internal detail"); }],
  ]) {
    await t.test(name, async () => {
      const response = await handleOutboundRequest(new Request(url), { probeTls });
      assert.equal(response.status, 502);
      assert.match(response.headers.get("x-sitetruth-egress-reason"), /^pinned-tls-(validation-failed|probe-failed)$/);
      assert.doesNotMatch(await response.text(), /sensitive internal detail/);
    });
  }
});
