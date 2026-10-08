import { sha256Hex } from "./auth.mjs";

const CHALLENGE_TTL_MS = 15 * 60 * 1000;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const TENANT_ISSUANCE_LIMIT = 3;
const TENANT_ISSUANCE_WINDOW_MS = 15 * 60 * 1000;
const HOST_ISSUANCE_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const VERIFY_ATTEMPT_COOLDOWN_MS = 2 * 1000;
const MAX_DNS_RESPONSE_BYTES = 16 * 1024;
const DNS_RESOLVER_URL = "https://cloudflare-dns.com/dns-query";
const CHALLENGE_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;

export class DomainControlError extends Error {
  constructor(code, status) {
    super(code);
    this.name = "DomainControlError";
    this.code = code;
    this.status = status;
  }
}

function randomBase64Url(byteLength) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function isIpLiteral(hostname) {
  return hostname.startsWith("[") || IPV4_PATTERN.test(hostname);
}

function validDnsHostname(hostname) {
  if (hostname.length < 4 || hostname.length > 253 || hostname.endsWith(".")) return false;
  if (!hostname.includes(".") || isIpLiteral(hostname)) return false;
  if (["localhost", "local", "internal", "lan", "home"].some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))) return false;
  return hostname.split(".").every((label) =>
    label.length >= 1 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label));
}

export function normalizeExactHttpsOrigin(input) {
  if (typeof input !== "string" || input.length > 512 || input.trim() !== input) {
    throw new DomainControlError("invalid_origin", 400);
  }
  const originMatch = /^https:\/\/([^/?#\\]*)(\/?)$/i.exec(input);
  const authority = originMatch?.[1];
  if (!authority || authority.includes("@")) throw new DomainControlError("invalid_origin", 400);

  let url;
  try {
    url = new URL(input);
  } catch {
    throw new DomainControlError("invalid_origin", 400);
  }
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" ||
      url.search || url.hash || !validDnsHostname(hostname)) {
    throw new DomainControlError("invalid_origin", 400);
  }

  const txtName = `_invariantc-verification.${hostname}`;
  if (txtName.length > 253) throw new DomainControlError("invalid_origin", 400);
  return { hostnameAscii: hostname, origin: `https://${hostname}`, txtName };
}

export function extractDnsTxtRecords(payload, expectedName) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Number.isInteger(payload.Status)) {
    throw new Error("Invalid DNS resolver response");
  }
  if (payload.Status === 3) return [];
  if (payload.Status !== 0 || payload.TC === true) throw new Error("DNS resolver did not return a complete answer");
  if (!Array.isArray(payload.Answer)) return [];

  const canonicalName = expectedName.toLowerCase().replace(/\.$/, "");
  const values = [];
  for (const answer of payload.Answer) {
    if (answer?.type !== 16 || typeof answer.name !== "string" || typeof answer.data !== "string") continue;
    if (answer.name.toLowerCase().replace(/\.$/, "") !== canonicalName) continue;
    const data = answer.data;
    if (data.length < 2 || data[0] !== '"' || data.at(-1) !== '"') continue;
    const value = data.slice(1, -1);
    if (value.includes('"') || value.includes("\\")) continue;
    values.push(value);
  }
  return values;
}

async function readBoundedText(response, maxBytes) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error("DNS resolver response is too large");
  if (!response.body) throw new Error("DNS resolver response body is missing");
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new Error("DNS resolver response is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function queryCloudflareDnsTxt(name, fetchImpl = fetch) {
  const query = new URL(DNS_RESOLVER_URL);
  query.searchParams.set("name", name);
  query.searchParams.set("type", "TXT");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetchImpl(query, {
      headers: { accept: "application/dns-json" },
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("application/dns-json")) {
      throw new Error("DNS resolver request failed");
    }
    const payload = JSON.parse(await readBoundedText(response, MAX_DNS_RESPONSE_BYTES));
    return extractDnsTxtRecords(payload, name);
  } finally {
    clearTimeout(timeout);
  }
}

function challengeBody(challengeId, token, hostnameAscii, nowMs) {
  return {
    challenge_id: challengeId,
    hostname: hostnameAscii,
    txt_name: `_invariantc-verification.${hostnameAscii}`,
    txt_value: `invariantc-v1=${challengeId}.${token}`,
    expires_at_ms: nowMs + CHALLENGE_TTL_MS,
  };
}

function requireRegistrableHostname(hostnameAscii, publicSuffixCheck) {
  if (typeof publicSuffixCheck !== "function") {
    throw new DomainControlError("public_suffix_data_unavailable", 503);
  }
  const isPublicSuffix = publicSuffixCheck(hostnameAscii);
  if (typeof isPublicSuffix !== "boolean") {
    throw new DomainControlError("public_suffix_data_unavailable", 503);
  }
  if (isPublicSuffix) throw new DomainControlError("invalid_origin", 400);
}

export async function issueDomainChallenge(db, tenantId, originInput, { nowMs = Date.now(), publicSuffixCheck } = {}) {
  const origin = normalizeExactHttpsOrigin(originInput);
  requireRegistrableHostname(origin.hostnameAscii, publicSuffixCheck);
  const challengeId = randomBase64Url(16);
  const token = randomBase64Url(32);
  const tokenHash = await sha256Hex(token);
  const result = await db.prepare(`
    INSERT INTO domain_challenges (
      challenge_id, tenant_id, hostname_ascii, token_sha256, issued_at_ms, expires_at_ms
    )
    SELECT ?, ?, ?, ?, ?, ?
    WHERE (
      SELECT COUNT(*) FROM domain_challenges
      WHERE tenant_id = ? AND issued_at_ms > ?
    ) < ${TENANT_ISSUANCE_LIMIT}
    AND NOT EXISTS (
      SELECT 1 FROM domain_challenges
      WHERE tenant_id = ? AND hostname_ascii = ? AND issued_at_ms > ?
    )
  `).bind(
    challengeId, tenantId, origin.hostnameAscii, tokenHash, nowMs, nowMs + CHALLENGE_TTL_MS,
    tenantId, nowMs - TENANT_ISSUANCE_WINDOW_MS,
    tenantId, origin.hostnameAscii, nowMs - HOST_ISSUANCE_COOLDOWN_MS,
  ).run();

  if (result.meta?.changes !== 1) throw new DomainControlError("challenge_rate_limited", 429);
  return challengeBody(challengeId, token, origin.hostnameAscii, nowMs);
}

export async function verifyDomainChallenge(db, tenantId, challengeId, resolveTxt, { nowMs = Date.now(), publicSuffixCheck } = {}) {
  if (!CHALLENGE_ID_PATTERN.test(challengeId ?? "") || typeof resolveTxt !== "function") {
    throw new DomainControlError("challenge_unavailable", 404);
  }
  const attempt = await db.prepare(`
    UPDATE domain_challenges
       SET verification_attempts = verification_attempts + 1, last_attempt_at_ms = ?
     WHERE tenant_id = ? AND challenge_id = ? AND consumed_at_ms IS NULL
       AND expires_at_ms > ? AND verification_attempts < ${MAX_VERIFICATION_ATTEMPTS}
       AND (last_attempt_at_ms IS NULL OR last_attempt_at_ms <= ?)
  `).bind(nowMs, tenantId, challengeId, nowMs, nowMs - VERIFY_ATTEMPT_COOLDOWN_MS).run();

  if (attempt.meta?.changes !== 1) {
    const existing = await db.prepare(`
      SELECT consumed_at_ms, expires_at_ms, verification_attempts, last_attempt_at_ms
        FROM domain_challenges WHERE tenant_id = ? AND challenge_id = ?
    `).bind(tenantId, challengeId).first();
    if (!existing || existing.consumed_at_ms !== null || existing.expires_at_ms <= nowMs) {
      throw new DomainControlError("challenge_unavailable", 404);
    }
    throw new DomainControlError("verification_rate_limited", 429);
  }

  const challenge = await db.prepare(`
    SELECT hostname_ascii, token_sha256
      FROM domain_challenges
     WHERE tenant_id = ? AND challenge_id = ? AND consumed_at_ms IS NULL AND expires_at_ms > ?
  `).bind(tenantId, challengeId, nowMs).first();
  if (!challenge) throw new DomainControlError("challenge_unavailable", 404);

  const hostname = normalizeExactHttpsOrigin(`https://${challenge.hostname_ascii}`).hostnameAscii;
  requireRegistrableHostname(hostname, publicSuffixCheck);
  let records;
  try {
    records = await resolveTxt(`_invariantc-verification.${hostname}`);
  } catch {
    throw new DomainControlError("dns_resolver_unavailable", 503);
  }
  if (!Array.isArray(records)) throw new DomainControlError("dns_resolver_unavailable", 503);
  const expectedRecord = new RegExp(`^invariantc-v1=${challengeId}\\.([A-Za-z0-9_-]{43})$`);
  let verified = false;
  for (const record of records) {
    if (typeof record !== "string") continue;
    const match = expectedRecord.exec(record);
    if (!match) continue;
    const submittedHash = await sha256Hex(match[1]);
    let difference = 0;
    for (let index = 0; index < submittedHash.length; index += 1) {
      difference |= submittedHash.charCodeAt(index) ^ challenge.token_sha256.charCodeAt(index);
    }
    if (difference === 0) { verified = true; break; }
  }
  if (!verified) throw new DomainControlError("dns_challenge_not_found", 422);

  const originId = randomBase64Url(16);
  const expiresAtMs = nowMs + VERIFICATION_TTL_MS;
  const batch = await db.batch([
    db.prepare(`
      UPDATE domain_challenges SET consumed_at_ms = ?
       WHERE tenant_id = ? AND challenge_id = ? AND consumed_at_ms IS NULL
         AND expires_at_ms > ? AND token_sha256 = ?
    `).bind(nowMs, tenantId, challengeId, nowMs, challenge.token_sha256),
    db.prepare(`
      INSERT INTO verified_origins (
        origin_id, tenant_id, hostname_ascii, origin, challenge_id, verified_at_ms, expires_at_ms
      )
      SELECT ?, tenant_id, hostname_ascii, 'https://' || hostname_ascii, challenge_id, ?, ?
        FROM domain_challenges
       WHERE tenant_id = ? AND challenge_id = ? AND consumed_at_ms = ? AND expires_at_ms >= ?
      ON CONFLICT (tenant_id, hostname_ascii) DO UPDATE SET
        challenge_id = excluded.challenge_id,
        verified_at_ms = excluded.verified_at_ms,
        expires_at_ms = excluded.expires_at_ms,
        revoked_at_ms = NULL
    `).bind(originId, nowMs, expiresAtMs, tenantId, challengeId, nowMs, nowMs),
  ]);
  if (batch?.[0]?.meta?.changes !== 1 || batch?.[1]?.meta?.changes !== 1) {
    throw new DomainControlError("challenge_unavailable", 404);
  }
  const storedOrigin = await db.prepare(`
    SELECT origin_id FROM verified_origins WHERE tenant_id = ? AND hostname_ascii = ?
  `).bind(tenantId, hostname).first();
  if (!storedOrigin) throw new DomainControlError("challenge_unavailable", 404);
  const origin = `https://${hostname}`;
  return { origin_id: storedOrigin.origin_id, hostname, origin, verified_at_ms: nowMs, expires_at_ms: expiresAtMs };
}

export async function revokeVerifiedOrigin(db, tenantId, originId, nowMs = Date.now()) {
  if (!CHALLENGE_ID_PATTERN.test(originId ?? "")) throw new DomainControlError("origin_unavailable", 404);
  const result = await db.prepare(`
    UPDATE verified_origins SET revoked_at_ms = ?
     WHERE tenant_id = ? AND origin_id = ? AND revoked_at_ms IS NULL
  `).bind(nowMs, tenantId, originId).run();
  if (result.meta?.changes === 1) return { origin_id: originId, revoked: true };

  const existing = await db.prepare(`
    SELECT origin_id FROM verified_origins WHERE tenant_id = ? AND origin_id = ?
  `).bind(tenantId, originId).first();
  if (!existing) throw new DomainControlError("origin_unavailable", 404);
  return { origin_id: originId, revoked: true };
}
