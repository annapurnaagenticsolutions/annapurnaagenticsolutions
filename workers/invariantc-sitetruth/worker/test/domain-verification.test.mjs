import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DomainControlError,
  extractDnsTxtRecords,
  issueDomainChallenge,
  normalizeExactHttpsOrigin,
  queryCloudflareDnsTxt,
  revokeVerifiedOrigin,
  verifyDomainChallenge,
} from "../src/domain-verification.mjs";
import { sha256Hex } from "../src/auth.mjs";
import { MemoryDomainDb } from "./fixtures/domain-db.mjs";

const notPublicSuffix = () => false;

test("canonicalizes exact HTTPS origins and rejects unsafe or ambiguous targets", () => {
  assert.deepEqual(normalizeExactHttpsOrigin("https://BÜCHER.example:443/"), {
    hostnameAscii: "xn--bcher-kva.example",
    origin: "https://xn--bcher-kva.example",
    txtName: "_invariantc-verification.xn--bcher-kva.example",
  });
  for (const input of [
    "http://example.com", "https://user@example.com", "https://example.com:444",
    "https://example.com/path", "https://example.com/?q=1", "https://example.com/#fragment",
    "https://example.com/%2e%2e", "https://example.com?", "https://example.com#", "https://example.com\\path",
    "https://127.0.0.1", "https://2130706433", "https://[::1]", "https://intranet.local",
    "https://example.com.", "https://*.example.com", "https://example..com", " https://example.com",
  ]) {
    assert.throws(() => normalizeExactHttpsOrigin(input), (error) => error instanceof DomainControlError && error.code === "invalid_origin", input);
  }
});

test("extracts only complete exact-name DNS TXT answers", () => {
  const payload = {
    Status: 0,
    TC: false,
    Answer: [
      { name: "_invariantc-verification.example.com.", type: 16, data: '"invariantc-v1=abc"' },
      { name: "other.example.com.", type: 16, data: '"wrong-host"' },
      { name: "_invariantc-verification.example.com.", type: 1, data: "192.0.2.1" },
      { name: "_invariantc-verification.example.com.", type: 16, data: '"split" "record"' },
    ],
  };
  assert.deepEqual(extractDnsTxtRecords(payload, "_invariantc-verification.example.com"), ["invariantc-v1=abc"]);
  assert.deepEqual(extractDnsTxtRecords({ Status: 3, Answer: [] }, "_invariantc-verification.example.com"), []);
  assert.throws(() => extractDnsTxtRecords({ Status: 2, Answer: [] }, "_invariantc-verification.example.com"));
});

test("queries the fixed Cloudflare DNS-over-HTTPS endpoint with bounded JSON handling", async () => {
  let requested;
  const values = await queryCloudflareDnsTxt("_invariantc-verification.example.com", async (url, options) => {
    requested = { url: new URL(url), options };
    return new Response(JSON.stringify({ Status: 0, Answer: [
      { name: "_invariantc-verification.example.com.", type: 16, data: '"invariantc-v1=test"' },
    ] }), { headers: { "content-type": "application/dns-json" } });
  });
  assert.deepEqual(values, ["invariantc-v1=test"]);
  assert.equal(requested.url.origin, "https://cloudflare-dns.com");
  assert.equal(requested.url.searchParams.get("name"), "_invariantc-verification.example.com");
  assert.equal(requested.url.searchParams.get("type"), "TXT");
  assert.equal(requested.options.headers.accept, "application/dns-json");
  assert.equal(requested.options.redirect, "error");
  await assert.rejects(() => queryCloudflareDnsTxt("example.com", async () => new Response("too large", {
    status: 200,
    headers: { "content-type": "application/dns-json", "content-length": "20000" },
  })), /too large/);
});

test("issues tenant-scoped challenges with hashed secrets and an atomic issuance cap", async () => {
  const db = new MemoryDomainDb();
  const now = 1_800_000_000_000;
  await assert.rejects(() => issueDomainChallenge(db, "tenant_a", "https://unconfigured.example.com", { nowMs: now }),
    (error) => error instanceof DomainControlError && error.code === "public_suffix_data_unavailable");
  await assert.rejects(() => issueDomainChallenge(db, "tenant_a", "https://co.uk", { nowMs: now, publicSuffixCheck: (host) => host === "co.uk" }),
    (error) => error instanceof DomainControlError && error.code === "invalid_origin");
  const challenge = await issueDomainChallenge(db, "tenant_a", "https://one.example.com", { nowMs: now, publicSuffixCheck: notPublicSuffix });
  assert.match(challenge.challenge_id, /^[A-Za-z0-9_-]{22}$/);
  assert.match(challenge.txt_value, new RegExp(`^invariantc-v1=${challenge.challenge_id}\\.[A-Za-z0-9_-]{43}$`));
  assert.equal(challenge.txt_name, "_invariantc-verification.one.example.com");
  assert.equal(challenge.expires_at_ms, now + 15 * 60 * 1000);
  assert.equal(db.challenges[0].token_sha256, await sha256Hex(challenge.txt_value.split(".").at(-1)));
  assert.equal(JSON.stringify(db.challenges).includes(challenge.txt_value), false);

  await issueDomainChallenge(db, "tenant_a", "https://two.example.com", { nowMs: now + 1000, publicSuffixCheck: notPublicSuffix });
  await issueDomainChallenge(db, "tenant_a", "https://three.example.com", { nowMs: now + 2000, publicSuffixCheck: notPublicSuffix });
  await assert.rejects(() => issueDomainChallenge(db, "tenant_a", "https://four.example.com", { nowMs: now + 3000, publicSuffixCheck: notPublicSuffix }),
    (error) => error instanceof DomainControlError && error.code === "challenge_rate_limited");
  await issueDomainChallenge(db, "tenant_b", "https://one.example.com", { nowMs: now + 3000, publicSuffixCheck: notPublicSuffix });
});

test("verifies an exact TXT proof once, expires the origin, isolates tenants, and supports revocation", async () => {
  const db = new MemoryDomainDb();
  const tenant = "tenant_a";
  const issuedAt = 1_800_000_000_000;
  const challenge = await issueDomainChallenge(db, tenant, "https://verify.example.com", { nowMs: issuedAt, publicSuffixCheck: notPublicSuffix });
  let queriedName;
  const verifiedAt = issuedAt + 1000;
  const origin = await verifyDomainChallenge(db, tenant, challenge.challenge_id, async (name) => {
    queriedName = name;
    return [challenge.txt_value];
  }, { nowMs: verifiedAt, publicSuffixCheck: notPublicSuffix });
  assert.equal(queriedName, challenge.txt_name);
  assert.equal(origin.hostname, "verify.example.com");
  assert.equal(origin.origin, "https://verify.example.com");
  assert.equal(origin.verified_at_ms, verifiedAt);
  assert.equal(origin.expires_at_ms, verifiedAt + 24 * 60 * 60 * 1000);
  assert.equal(db.challenges[0].consumed_at_ms, verifiedAt);
  assert.equal(db.origins.length, 1);
  assert.equal(db.origins[0].revoked_at_ms, null);

  await assert.rejects(() => verifyDomainChallenge(db, tenant, challenge.challenge_id, async () => [challenge.txt_value], { nowMs: verifiedAt + 10, publicSuffixCheck: notPublicSuffix }),
    (error) => error instanceof DomainControlError && error.code === "challenge_unavailable");
  await assert.rejects(() => revokeVerifiedOrigin(db, "tenant_b", origin.origin_id, verifiedAt + 20),
    (error) => error instanceof DomainControlError && error.code === "origin_unavailable");
  assert.deepEqual(await revokeVerifiedOrigin(db, tenant, origin.origin_id, verifiedAt + 30), { origin_id: origin.origin_id, revoked: true });
  assert.equal(db.origins[0].revoked_at_ms, verifiedAt + 30);
  assert.deepEqual(await revokeVerifiedOrigin(db, tenant, origin.origin_id, verifiedAt + 40), { origin_id: origin.origin_id, revoked: true });
});

test("failed TXT checks consume bounded attempts and resolver failures fail closed", async () => {
  const db = new MemoryDomainDb();
  const issuedAt = 1_800_000_000_000;
  const challenge = await issueDomainChallenge(db, "tenant_a", "https://pending.example.com", { nowMs: issuedAt, publicSuffixCheck: notPublicSuffix });
  await assert.rejects(() => verifyDomainChallenge(db, "tenant_a", challenge.challenge_id, async () => [], { nowMs: issuedAt + 1000, publicSuffixCheck: notPublicSuffix }),
    (error) => error instanceof DomainControlError && error.code === "dns_challenge_not_found");
  await assert.rejects(() => verifyDomainChallenge(db, "tenant_a", challenge.challenge_id, async () => { throw new Error("network"); }, { nowMs: issuedAt + 1500, publicSuffixCheck: notPublicSuffix }),
    (error) => error instanceof DomainControlError && error.code === "verification_rate_limited");
  await assert.rejects(() => verifyDomainChallenge(db, "tenant_a", challenge.challenge_id, async () => { throw new Error("network"); }, { nowMs: issuedAt + 4000, publicSuffixCheck: notPublicSuffix }),
    (error) => error instanceof DomainControlError && error.code === "dns_resolver_unavailable");
  assert.equal(db.challenges[0].consumed_at_ms, null);
  assert.equal(db.challenges[0].verification_attempts, 2);
});
