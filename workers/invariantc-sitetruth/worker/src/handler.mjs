import { authenticateTenant } from "./auth.mjs";
import { releaseTenantQuota, reserveTenantQuota } from "./quota-client.mjs";
import {
  DomainControlError,
  issueDomainChallenge,
  queryCloudflareDnsTxt,
  revokeVerifiedOrigin,
  verifyDomainChallenge,
} from "./domain-verification.mjs";
import { handleScanRequest, scanIntakeReady } from "./scan-intake.mjs";

const MAX_BYTES = 256 * 1024;
const MAX_DOMAIN_BODY_BYTES = 4 * 1024;
export const MAX_BODY_READ_MS = 90_000;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'none'",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "x-frame-options": "DENY",
  "cross-origin-resource-policy": "same-origin",
};

function respond(body, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...additionalHeaders },
  });
}

class RequestBodyTimeoutError extends Error {
  constructor() {
    super("Request body read deadline exceeded");
    this.name = "RequestBodyTimeoutError";
  }
}

async function boundedBody(request, maxBytes = MAX_BYTES, timeoutMs = MAX_BODY_READ_MS) {
  if (!request.body) throw new Error("Request body missing");
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  let readInFlight = false;
  let timedOut = false;
  let timeoutId;
  const timeoutMarker = Symbol("request-body-timeout");
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      resolve(timeoutMarker);
      try { void reader.cancel("request body read deadline exceeded").catch(() => {}); } catch { /* request stream already closed */ }
    }, timeoutMs);
  });
  try {
    for (;;) {
      readInFlight = true;
      let next;
      try {
        next = await Promise.race([reader.read(), timeout]);
      } catch (error) {
        readInFlight = false;
        throw error;
      }
      if (timedOut || next === timeoutMarker) throw new RequestBodyTimeoutError();
      readInFlight = false;
      const { done, value } = next;
      if (done) break;
      total += value.length;
      if (total > maxBytes) throw new Error("Request body exceeds maximum size");
      chunks.push(value);
    }
  } finally {
    clearTimeout(timeoutId);
    if (total > maxBytes) await reader.cancel().catch(() => {});
    // A timed-out underlying read can remain pending even after cancellation.
    // Do not release a reader lock while its read promise is still outstanding.
    if (!readInFlight) reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function limitedString(value, max = 512) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 512;
}

function sanitizeEvaluatorResult(value) {
  if (!value || typeof value.ok !== "boolean") throw new Error("Unexpected evaluator envelope");
  if (!value.ok) {
    const issues = Array.isArray(value.issues) ? value.issues.slice(0, 100).map((issue) => ({
      code: limitedString(issue?.code, 64),
      at: limitedString(issue?.at, 256),
      message: limitedString(issue?.message, 512),
    })) : [];
    return { ok: false, issues };
  }

  const report = value.report;
  if (!report || !["pass", "fail", "unknown"].includes(report.outcome) || !Array.isArray(report.results) || report.results.length > 512) {
    throw new Error("Unexpected evaluator report structure");
  }
  if (!HASH_PATTERN.test(report.contract_sha256 ?? "") || !HASH_PATTERN.test(report.observation_sha256 ?? "")) {
    throw new Error("Unexpected evaluator digest");
  }
  const summary = report.summary;
  if (!summary || ![summary.passed, summary.failed, summary.unknown].every(safeCount)) {
    throw new Error("Unexpected evaluator summary");
  }

  return {
    ok: true,
    report: {
      report_version: Number.isSafeInteger(report.report_version) ? report.report_version : 1,
      contract_id: limitedString(report.contract_id, 128),
      contract_sha256: report.contract_sha256,
      observation_sha256: report.observation_sha256,
      outcome: report.outcome,
      summary: { passed: summary.passed, failed: summary.failed, unknown: summary.unknown },
      results: report.results.map((result) => ({
        id: limitedString(result?.id, 128),
        outcome: ["pass", "fail", "unknown"].includes(result?.outcome) ? result.outcome : "unknown",
        severity: limitedString(result?.severity, 32),
        code: limitedString(result?.code, 64),
        explanation: limitedString(result?.explanation, 512),
        source_dependencies: Array.isArray(result?.source_dependencies)
          ? result.source_dependencies.slice(0, 64).map((dependency) => limitedString(dependency, 128))
          : [],
      })),
      evidence_notice: limitedString(report.evidence_notice, 512),
    },
  };
}

function rateHeaders(reservation, tenant) {
  return {
    "x-ratelimit-limit": String(tenant.requestsPerMinute),
    "x-ratelimit-remaining": String(reservation.minuteRemaining),
    "x-ratelimit-day-limit": String(tenant.requestsPerDay),
    "x-ratelimit-day-remaining": String(reservation.dayRemaining),
    "x-ratelimit-reset": String(Math.ceil(reservation.minuteResetAtMs / 1000)),
  };
}

function domainRequestError(request, maxBytes = MAX_DOMAIN_BODY_BYTES) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new DomainControlError("request_too_large", 413);
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    throw new DomainControlError("content_type_required", 415);
  }
}

async function domainJsonBody(request, bodyReadTimeoutMs) {
  domainRequestError(request);
  let body;
  try {
    body = JSON.parse(await boundedBody(request, MAX_DOMAIN_BODY_BYTES, bodyReadTimeoutMs));
  } catch (error) {
    if (error instanceof DomainControlError) throw error;
    if (error instanceof RequestBodyTimeoutError) throw new DomainControlError("request_timeout", 408);
    throw new DomainControlError("invalid_json", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new DomainControlError("invalid_request", 422);
  }
  return body;
}

async function optionalEmptyJsonBody(request, bodyReadTimeoutMs) {
  if (!request.body || request.headers.get("content-length") === "0") return;
  const body = await domainJsonBody(request, bodyReadTimeoutMs);
  if (Object.keys(body).length !== 0) throw new DomainControlError("invalid_request", 422);
}

async function handleDomainRequest(request, env, pathname, dependencies, bodyReadTimeoutMs) {
  if (env.DOMAIN_VERIFICATION_ENABLED !== "true") return respond({ error: "Not found" }, 404);

  const createChallenge = pathname === "/v1/domains/challenges" && request.method === "POST";
  const verifyMatch = /^\/v1\/domains\/challenges\/([A-Za-z0-9_-]{22})\/verify$/.exec(pathname);
  const verifyChallenge = Boolean(verifyMatch) && request.method === "POST";
  const revokeMatch = /^\/v1\/domains\/origins\/([A-Za-z0-9_-]{22})$/.exec(pathname);
  const revokeOrigin = Boolean(revokeMatch) && request.method === "DELETE";
  if (!createChallenge && !verifyChallenge && !revokeOrigin) {
    const knownPath = pathname === "/v1/domains/challenges" || Boolean(verifyMatch) || Boolean(revokeMatch);
    return respond({ error: knownPath ? "Method not allowed" : "Not found" }, knownPath ? 405 : 404);
  }
  if ((createChallenge || verifyChallenge) && typeof dependencies.publicSuffixCheck !== "function") {
    return respond({ error: "Domain verification requires maintained public-suffix data", code: "public_suffix_data_unavailable" }, 503);
  }
  if (!env.DB || !env.TENANT_QUOTA) return respond({ error: "Tenant service is not configured" }, 503);

  let tenant;
  try {
    tenant = await (dependencies.authenticate ?? authenticateTenant)(request, env);
  } catch {
    return respond({ error: "Tenant authentication is unavailable" }, 503);
  }
  if (!tenant) return respond({ error: "Unauthorized" }, 401);

  const leaseId = crypto.randomUUID();
  let reservation;
  try {
    reservation = await (dependencies.reserve ?? reserveTenantQuota)(env, tenant, leaseId);
  } catch {
    return respond({ error: "Tenant quota service is unavailable" }, 503);
  }
  if (!reservation?.allowed) {
    const retryAfter = Math.max(1, Math.ceil(reservation?.retryAfterSeconds ?? 2));
    return respond({ error: "Tenant request limit reached" }, 429, {
      "retry-after": String(retryAfter),
    });
  }

  let response;
  try {
    if (createChallenge) {
      const body = await domainJsonBody(request, bodyReadTimeoutMs);
      if (Object.keys(body).length !== 1 || typeof body.origin !== "string") {
        throw new DomainControlError("invalid_request", 422);
      }
      const challenge = await issueDomainChallenge(env.DB, tenant.tenantId, body.origin, {
        publicSuffixCheck: dependencies.publicSuffixCheck,
      });
      response = respond({ ok: true, challenge }, 201, rateHeaders(reservation, tenant));
    } else if (verifyChallenge) {
      await optionalEmptyJsonBody(request, bodyReadTimeoutMs);
      const resolveTxt = dependencies.resolveTxt ?? ((name) => queryCloudflareDnsTxt(name));
      const origin = await verifyDomainChallenge(env.DB, tenant.tenantId, verifyMatch[1], resolveTxt, {
        publicSuffixCheck: dependencies.publicSuffixCheck,
      });
      response = respond({ ok: true, origin }, 200, rateHeaders(reservation, tenant));
    } else {
      if (request.body) throw new DomainControlError("invalid_request", 422);
      const result = await revokeVerifiedOrigin(env.DB, tenant.tenantId, revokeMatch[1]);
      response = respond({ ok: true, origin: result }, 200, rateHeaders(reservation, tenant));
    }
  } catch (error) {
    if (error instanceof DomainControlError) {
      const message = error.code === "request_timeout"
        ? "Request body timed out"
        : error.code === "invalid_origin"
          ? "Origin must be an exact public HTTPS hostname origin"
        : error.code === "dns_challenge_not_found"
          ? "The exact DNS TXT challenge was not found"
          : error.code === "challenge_rate_limited" || error.code === "verification_rate_limited"
            ? "Domain verification rate limit reached"
            : error.status === 404
              ? "Challenge or verified origin is unavailable"
              : error.status === 503
                ? "Domain verification service is unavailable"
                : "Invalid domain verification request";
      response = respond({ error: message, code: error.code }, error.status, rateHeaders(reservation, tenant));
    } else {
      response = respond({ error: "Domain verification service is unavailable" }, 503, rateHeaders(reservation, tenant));
    }
  }

  try {
    await (dependencies.release ?? releaseTenantQuota)(env, tenant, leaseId);
  } catch {
    return respond({ error: "Tenant quota service is unavailable" }, 503);
  }
  return response;
}

export function createHandler(checker, dependencies = {}) {
  if (typeof checker !== "function") throw new Error("checker required");
  const authenticate = dependencies.authenticate ?? authenticateTenant;
  const reserve = dependencies.reserve ?? reserveTenantQuota;
  const release = dependencies.release ?? releaseTenantQuota;
  const bodyReadTimeoutMs = Number.isSafeInteger(dependencies.bodyReadTimeoutMs) && dependencies.bodyReadTimeoutMs > 0
    ? Math.min(dependencies.bodyReadTimeoutMs, MAX_BODY_READ_MS)
    : MAX_BODY_READ_MS;

  return async function fetch(request, env = {}) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      if (request.method !== "GET") return respond({ error: "Method not allowed" }, 405);
      const configured = Boolean(env.DB && env.TENANT_QUOTA);
      const scanReady = scanIntakeReady(env);
      return respond({
        service: "invariantc-sitetruth-api",
        status: configured ? "ready" : "configuration_required",
        domain_verification: env.DOMAIN_VERIFICATION_ENABLED === "true" && typeof dependencies.publicSuffixCheck === "function"
          ? "enabled"
          : "disabled",
        customer_payload_storage: scanReady ? "encrypted_short_ttl" : "disabled",
        browser_scanning: "disabled",
        hosted_scan_intake: scanReady ? "enabled" : "disabled",
      }, configured ? 200 : 503);
    }
    if (url.pathname === "/v1/domains" || url.pathname.startsWith("/v1/domains/")) {
      return handleDomainRequest(request, env, url.pathname, dependencies, bodyReadTimeoutMs);
    }
    if (url.pathname === "/v1/scans" || url.pathname.startsWith("/v1/scans/")) {
      return handleScanRequest(request, env, url.pathname, {
        authenticate,
        reserve,
        release,
        checker,
        bodyReadTimeoutMs,
        now: () => dependencies.now?.() ?? Date.now(),
        respond,
        rateHeaders,
      });
    }
    if (url.pathname === "/v1/check" && request.method === "POST") {
      if (!env.DB || !env.TENANT_QUOTA) return respond({ error: "Tenant service is not configured" }, 503);

      let tenant;
      try {
        tenant = await authenticate(request, env);
      } catch {
        return respond({ error: "Tenant authentication is unavailable" }, 503);
      }
      if (!tenant) return respond({ error: "Unauthorized" }, 401);

      const contentLength = Number(request.headers.get("content-length"));
      const validContentType = /^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "");
      const declaredBodyTooLarge = Number.isFinite(contentLength) && contentLength > MAX_BYTES;

      const leaseId = crypto.randomUUID();
      let reservation;
      try {
        reservation = await reserve(env, tenant, leaseId);
      } catch {
        return respond({ error: "Tenant quota service is unavailable" }, 503);
      }
      if (!reservation?.allowed) {
        const retryAfter = Math.max(1, Math.ceil(reservation?.retryAfterSeconds ?? 2));
        return respond({ error: "Tenant request limit reached", reason: reservation?.reason ?? "quota_limited" }, 429, {
          "retry-after": String(retryAfter),
        });
      }

      let response;
      try {
        let input;
        if (!validContentType) {
          response = respond({ error: "Content-Type must be application/json" }, 415, rateHeaders(reservation, tenant));
        } else if (declaredBodyTooLarge) {
          response = respond({ error: "Request too large" }, 413, rateHeaders(reservation, tenant));
        }
        if (!response) {
          try {
            input = JSON.parse(await boundedBody(request, MAX_BYTES, bodyReadTimeoutMs));
          } catch (error) {
            response = error instanceof RequestBodyTimeoutError
              ? respond({ error: "Request body timed out" }, 408, rateHeaders(reservation, tenant))
              : respond({ error: "Invalid or oversized JSON request" }, 400, rateHeaders(reservation, tenant));
          }
        }
        if (!response && (!input || typeof input !== "object" || Array.isArray(input) ||
            Object.keys(input).some((key) => key !== "contract" && key !== "observations") ||
            !input.contract || typeof input.contract !== "object" || Array.isArray(input.contract) ||
            !input.observations || typeof input.observations !== "object" || Array.isArray(input.observations))) {
          response = respond({ error: "Request requires contract and observations objects" }, 422, rateHeaders(reservation, tenant));
        }
        if (!response) {
          const result = JSON.parse(checker(JSON.stringify(input.contract), JSON.stringify(input.observations)));
          const sanitized = sanitizeEvaluatorResult(result);
          response = respond(sanitized, sanitized.ok ? 200 : 422, rateHeaders(reservation, tenant));
        }
      } catch {
        response = respond({ error: "Evaluator unavailable" }, 502, rateHeaders(reservation, tenant));
      }

      try {
        await release(env, tenant, leaseId);
      } catch {
        // The 120-second lease expiry in the coordinator is the recovery path if release fails.
        return respond({ error: "Tenant quota service is unavailable" }, 503);
      }
      return response;
    }

    if (url.pathname === "/v1/check") return respond({ error: "Method not allowed" }, 405);
    if (env.ASSETS && (request.method === "GET" || request.method === "HEAD")) {
      const asset = await env.ASSETS.fetch(request);
      const headers = new Headers(asset.headers);
      headers.set("content-security-policy", "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'");
      headers.set("x-content-type-options", "nosniff");
      headers.set("referrer-policy", "no-referrer");
      headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
      headers.set("x-frame-options", "DENY");
      headers.set("cross-origin-resource-policy", "same-origin");
      return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
    }
    return respond({ error: "Not found" }, 404);
  };
}
