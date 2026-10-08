import { validatePair } from "../../collector/pairing-core.mjs";
import { normalizeExactHttpsOrigin } from "./domain-verification.mjs";
import { canonicalJson, encryptScanPayload, sha256Hex } from "./scan-payload-crypto.mjs";
import { dispatchScanJob, getTenantScanStatus } from "./scan-outbox.mjs";

const DAY_MS = 86_400_000;
const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_ENCRYPTED_PAYLOAD_PLAINTEXT_BYTES = 48 * 1024;
const SCAN_ID = /^[A-Za-z0-9_-]{22}$/;
const TENANT_ID = /^[A-Za-z0-9_-]{1,80}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_.-]{16,128}$/;
const PAYLOAD_KEY = /^[0-9a-f]{64}$/;
const PAYLOAD_KEY_ID = /^[A-Za-z0-9_-]{1,32}$/;

export class ScanControlError extends Error {
  constructor(code, status) {
    super(code);
    this.name = "ScanControlError";
    this.code = code;
    this.status = status;
  }
}

function positiveWindow(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function nonNegativeWindow(value) {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function activePayloadKey(env) {
  const activeKeyId = env?.SCAN_PAYLOAD_ACTIVE_KEY_ID;
  const encodedKeyring = env?.SCAN_PAYLOAD_ENCRYPTION_KEYS;
  if (!PAYLOAD_KEY_ID.test(activeKeyId ?? "") || typeof encodedKeyring !== "string" || encodedKeyring.length > 2048) {
    return null;
  }
  let keyring;
  try { keyring = JSON.parse(encodedKeyring); } catch { return null; }
  if (!keyring || typeof keyring !== "object" || Array.isArray(keyring)) return null;
  const keyIds = Object.keys(keyring);
  if (!keyIds.length || keyIds.length > 4 || keyIds.some((keyId) =>
    !PAYLOAD_KEY_ID.test(keyId) || !PAYLOAD_KEY.test(keyring[keyId]))) return null;
  if (!Object.hasOwn(keyring, activeKeyId)) return null;
  return { payloadKeyId: activeKeyId, keyHex: keyring[activeKeyId] };
}

/** All operational dependencies and operator-approved windows must be present. */
export function scanIntakeReady(env) {
  const encryptionKey = activePayloadKey(env);
  const payloadTtlMs = positiveWindow(env?.SCAN_PAYLOAD_TTL_MS);
  const queuedMaxAgeMs = positiveWindow(env?.SCAN_QUEUED_MAX_AGE_MS);
  const runningGraceMs = nonNegativeWindow(env?.SCAN_RUNNING_GRACE_MS);
  const auditRetentionMs = positiveWindow(env?.SCAN_JOB_AUDIT_RETENTION_MS);
  return env?.SCAN_INTAKE_ENABLED === "true" &&
    env?.SCAN_OUTBOX_DISPATCH_ENABLED === "true" &&
    env?.SCAN_EXECUTION_ENABLED === "true" &&
    env?.SCAN_QUEUE_CONSUMER_READY === "true" &&
    env?.SCAN_RUNNER_READY === "true" &&
    env?.SCAN_MAINTENANCE_READY === "true" &&
    env?.DOMAIN_VERIFICATION_ENABLED === "true" &&
    env?.SCAN_JOB_RECOVERY_ENABLED === "true" &&
    env?.SCAN_JOB_RETENTION_ENABLED === "true" &&
    Boolean(env?.DB && typeof env.DB.prepare === "function" && typeof env.DB.batch === "function") &&
    Boolean(env?.SCAN_QUEUE && typeof env.SCAN_QUEUE.send === "function") &&
    encryptionKey !== null &&
    payloadTtlMs !== null && payloadTtlMs <= DAY_MS &&
    queuedMaxAgeMs !== null && runningGraceMs !== null && auditRetentionMs !== null;
}

class ScanBodyTimeoutError extends Error {}

async function readBoundedJson(request, timeoutMs) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new ScanControlError("request_too_large", 413);
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    throw new ScanControlError("content_type_required", 415);
  }
  if (!request.body) throw new ScanControlError("invalid_json", 400);

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  let readInFlight = false;
  let timedOut = false;
  let timeoutId;
  const marker = Symbol("scan-request-timeout");
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      resolve(marker);
      try { void reader.cancel("request body read deadline exceeded").catch(() => {}); } catch { /* stream already closed */ }
    }, timeoutMs);
  });
  let text;
  try {
    for (;;) {
      readInFlight = true;
      const next = await Promise.race([reader.read(), timeout]);
      if (timedOut || next === marker) throw new ScanBodyTimeoutError();
      readInFlight = false;
      if (next.done) break;
      total += next.value.byteLength;
      if (total > MAX_REQUEST_BYTES) throw new ScanControlError("request_too_large", 413);
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    if (error instanceof ScanControlError || error instanceof ScanBodyTimeoutError) throw error;
    throw new ScanControlError("invalid_json", 400);
  } finally {
    clearTimeout(timeoutId);
    if (total > MAX_REQUEST_BYTES) await reader.cancel().catch(() => {});
    if (!readInFlight) reader.releaseLock();
  }

  let value;
  try { value = JSON.parse(text); } catch { throw new ScanControlError("invalid_json", 400); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ScanControlError("invalid_request", 422);
  }
  return value;
}

function publicError(error) {
  if (error instanceof ScanControlError) {
    const message = error.code === "request_timeout" ? "Request body timed out" :
      error.code === "content_type_required" ? "Content-Type must be application/json" :
      error.code === "request_too_large" ? "Request body is too large" :
      error.code === "scan_quota_exceeded" ? "Scan quota is unavailable or reached" :
      error.code === "origin_unavailable" ? "Verified origin is unavailable" :
      error.code === "idempotency_conflict" ? "Idempotency key was used for a different scan" :
      error.code === "invalid_scan_definition" ? "Scan definition is invalid or outside the supported safe subset" :
      error.code === "scan_service_unavailable" ? "Scan service is unavailable" :
      "Invalid scan request";
    return { body: { error: message, code: error.code }, status: error.status };
  }
  return { body: { error: "Scan service is unavailable", code: "scan_service_unavailable" }, status: 503 };
}

function validateCreateBody(body, idempotencyKey) {
  if (Object.keys(body).some((key) => !["origin_id", "capture", "contract", "page_limit"].includes(key)) ||
      Object.keys(body).length !== 4 || !SCAN_ID.test(body.origin_id ?? "") ||
      !Number.isSafeInteger(body.page_limit) || body.page_limit < 1 ||
      !IDEMPOTENCY_KEY.test(idempotencyKey ?? "") ||
      !body.capture || typeof body.capture !== "object" || Array.isArray(body.capture) ||
      !body.contract || typeof body.contract !== "object" || Array.isArray(body.contract)) {
    throw new ScanControlError("invalid_request", 422);
  }
  if (Array.isArray(body.capture.actions) && body.capture.actions.length > 0) {
    throw new ScanControlError("invalid_scan_definition", 422);
  }
}

function validateTargetForOrigin(capture, expectedOrigin) {
  let target;
  try { target = new URL(capture.url); } catch { throw new ScanControlError("invalid_scan_definition", 422); }
  let targetOrigin;
  try { targetOrigin = normalizeExactHttpsOrigin(target.origin).origin; } catch { throw new ScanControlError("invalid_scan_definition", 422); }
  if (target.protocol !== "https:" || target.username || target.password || target.hash || target.search ||
      targetOrigin !== expectedOrigin || target.origin !== expectedOrigin) {
    throw new ScanControlError("invalid_scan_definition", 422);
  }
}

function validDbChange(result, expected = 1) {
  return result?.success === true && Number.isSafeInteger(result.meta?.changes) && result.meta.changes === expected;
}

async function findIdempotentJob(db, tenantId, key) {
  return db.prepare(`
    SELECT scan_id, status, request_payload_sha256
      FROM scan_jobs
     WHERE tenant_id = ? AND idempotency_key = ?
  `).bind(tenantId, key).first();
}

async function existingIdempotentJob(db, tenantId, key, requestHash) {
  const row = await findIdempotentJob(db, tenantId, key);
  if (!row) return null;
  if (row.request_payload_sha256 !== requestHash) throw new ScanControlError("idempotency_conflict", 409);
  return row;
}

async function createScanJob(env, { tenantId, originId, idempotencyKey, capture, contract, pageLimit, nowMs, checker }) {
  if (!TENANT_ID.test(tenantId ?? "")) throw new ScanControlError("invalid_request", 422);
  let pairing;
  try { pairing = validatePair(contract, capture); } catch { throw new ScanControlError("invalid_scan_definition", 422); }
  if (!pairing.ok) throw new ScanControlError("invalid_scan_definition", 422);

  const payload = { contract, capture };
  let canonicalPayload;
  try { canonicalPayload = canonicalJson(payload); }
  catch { throw new ScanControlError("invalid_scan_definition", 422); }
  const payloadBytes = new TextEncoder().encode(canonicalPayload).byteLength;
  if (payloadBytes > MAX_ENCRYPTED_PAYLOAD_PLAINTEXT_BYTES) throw new ScanControlError("request_too_large", 413);
  if (typeof checker !== "function") throw new ScanControlError("scan_service_unavailable", 503);
  let compileResult;
  try { compileResult = JSON.parse(checker(JSON.stringify(contract), "{}")); } catch { throw new ScanControlError("scan_service_unavailable", 503); }
  if (!compileResult || compileResult.ok !== true) throw new ScanControlError("invalid_scan_definition", 422);

  const captureHash = await sha256Hex(canonicalJson(capture));
  const requestHash = await sha256Hex(canonicalPayload);
  const existing = await existingIdempotentJob(env.DB, tenantId, idempotencyKey, requestHash);
  if (existing) {
    const dispatch = existing.status === "queued"
      ? await dispatchScanJob(env.DB, env.SCAN_QUEUE, { scanId: existing.scan_id, tenantId, nowMs })
      : null;
    return { scanId: existing.scan_id, status: existing.status, reused: true, dispatch };
  }

  const authority = await env.DB.prepare(`
    SELECT o.origin, o.hostname_ascii, o.expires_at_ms,
           p.max_pages_per_scan, p.max_run_seconds, p.artifact_retention_days
      FROM verified_origins o
      JOIN tenants t ON t.tenant_id = o.tenant_id
      JOIN scan_policies p ON p.tenant_id = o.tenant_id
     WHERE o.tenant_id = ? AND o.origin_id = ? AND o.revoked_at_ms IS NULL
       AND o.expires_at_ms > ? AND t.status = 'active'
  `).bind(tenantId, originId, nowMs).first();
  if (!authority || typeof authority.origin !== "string" || !Number.isSafeInteger(authority.expires_at_ms) ||
      !Number.isSafeInteger(authority.max_pages_per_scan) || !Number.isSafeInteger(authority.max_run_seconds) ||
      !Number.isSafeInteger(authority.artifact_retention_days)) {
    throw new ScanControlError("origin_unavailable", 404);
  }
  validateTargetForOrigin(capture, authority.origin);
  if (pageLimit > authority.max_pages_per_scan || authority.max_run_seconds <= 0 ||
      authority.artifact_retention_days < 1 || authority.artifact_retention_days > 7) {
    throw new ScanControlError("invalid_scan_definition", 422);
  }
  const payloadTtlMs = positiveWindow(env.SCAN_PAYLOAD_TTL_MS);
  const queuedMaxAgeMs = positiveWindow(env.SCAN_QUEUED_MAX_AGE_MS);
  const runningGraceMs = nonNegativeWindow(env.SCAN_RUNNING_GRACE_MS);
  const requiredLifetime = queuedMaxAgeMs + authority.max_run_seconds * 1000 + runningGraceMs;
  if (![payloadTtlMs, requiredLifetime].every(Number.isSafeInteger) || payloadTtlMs < requiredLifetime) {
    throw new ScanControlError("scan_service_unavailable", 503);
  }

  const scanId = (() => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  })();
  const expiresAtMs = nowMs + authority.artifact_retention_days * DAY_MS;
  if (!Number.isSafeInteger(expiresAtMs)) throw new ScanControlError("scan_service_unavailable", 503);
  const payloadExpiresAtMs = Math.min(expiresAtMs, nowMs + payloadTtlMs);
  const encryptionKey = activePayloadKey(env);
  if (!encryptionKey) throw new ScanControlError("scan_service_unavailable", 503);
  const encrypted = await encryptScanPayload(payload, encryptionKey.keyHex, {
    tenantId, scanId, originId, payloadKeyId: encryptionKey.payloadKeyId,
  });
  // Encryption derives and authenticates the payload hash; retain a stable request hash for retries.
  if (encrypted.payloadSha256 !== requestHash) throw new ScanControlError("scan_service_unavailable", 503);

  try {
    const results = await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO scan_jobs (
          scan_id, tenant_id, origin_id, idempotency_key, capture_spec_sha256,
          page_limit, run_budget_seconds, status, created_at_ms, expires_at_ms,
          request_payload_sha256
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)
      `).bind(scanId, tenantId, originId, idempotencyKey, captureHash, pageLimit,
        authority.max_run_seconds, nowMs, expiresAtMs, requestHash),
      env.DB.prepare(`
        INSERT INTO scan_job_dispatch_outbox (
          scan_id, tenant_id, request_payload_sha256, payload_key_id, payload_nonce_b64url,
          encrypted_payload_b64url, created_at_ms, expires_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(scanId, tenantId, requestHash, encryptionKey.payloadKeyId, encrypted.nonceB64Url,
        encrypted.ciphertextB64Url, nowMs, payloadExpiresAtMs),
    ]);
    if (!Array.isArray(results) || !validDbChange(results[0]) || !validDbChange(results[1])) {
      throw new Error("D1 scan creation batch result is invalid");
    }
  } catch (error) {
    const existingAfterRace = await findIdempotentJob(env.DB, tenantId, idempotencyKey).catch(() => null);
    if (existingAfterRace) {
      if (existingAfterRace.request_payload_sha256 !== requestHash) {
        throw new ScanControlError("idempotency_conflict", 409);
      }
      const dispatch = existingAfterRace.status === "queued"
        ? await dispatchScanJob(env.DB, env.SCAN_QUEUE, { scanId: existingAfterRace.scan_id, tenantId, nowMs })
        : null;
      return { scanId: existingAfterRace.scan_id, status: existingAfterRace.status, reused: true, dispatch };
    }
    if (/scan request rate limit exceeded|daily scan quota exceeded|concurrent scan quota exceeded/i.test(String(error?.message ?? ""))) {
      throw new ScanControlError("scan_quota_exceeded", 429);
    }
    if (/active tenant|fresh verified origin|scan policy/i.test(String(error?.message ?? ""))) {
      throw new ScanControlError("origin_unavailable", 409);
    }
    throw error;
  }

  const dispatch = await dispatchScanJob(env.DB, env.SCAN_QUEUE, { scanId, tenantId, nowMs });
  return { scanId, status: "queued", reused: false, dispatch };
}

async function handleCreate(request, env, tenant, dependencies, nowMs) {
  const idempotencyKey = request.headers.get("idempotency-key");
  let body;
  try {
    body = await readBoundedJson(request, dependencies.bodyReadTimeoutMs);
  } catch (error) {
    if (error instanceof ScanBodyTimeoutError) throw new ScanControlError("request_timeout", 408);
    throw error;
  }
  validateCreateBody(body, idempotencyKey);
  const result = await createScanJob(env, {
    tenantId: tenant.tenantId,
    originId: body.origin_id,
    idempotencyKey,
    capture: body.capture,
    contract: body.contract,
    pageLimit: body.page_limit,
    nowMs,
    checker: dependencies.checker,
  });
  return {
    body: {
      scan_id: result.scanId,
      status: result.status,
      dispatch_status: result.dispatch?.status ?? (result.status === "queued" ? "pending" : "not_applicable"),
    },
    status: result.reused ? 200 : 202,
  };
}

export async function handleScanRequest(request, env, pathname, dependencies) {
  const create = pathname === "/v1/scans" && request.method === "POST";
  const statusMatch = /^\/v1\/scans\/([A-Za-z0-9_-]{22})$/.exec(pathname);
  const getStatus = Boolean(statusMatch) && request.method === "GET";
  if (!create && !getStatus) {
    const knownPath = pathname === "/v1/scans" || Boolean(statusMatch);
    return dependencies.respond({ error: knownPath ? "Method not allowed" : "Not found" }, knownPath ? 405 : 404);
  }
  if (env?.SCAN_INTAKE_ENABLED !== "true") return dependencies.respond({ error: "Not found" }, 404);
  if (create && !scanIntakeReady(env)) {
    return dependencies.respond({ error: "Scan service is not configured", code: "scan_service_unavailable" }, 503);
  }
  if (!env?.DB || !env?.TENANT_QUOTA) {
    return dependencies.respond({ error: "Tenant service is not configured" }, 503);
  }

  let tenant;
  try { tenant = await dependencies.authenticate(request, env); }
  catch { return dependencies.respond({ error: "Tenant authentication is unavailable" }, 503); }
  if (!tenant) return dependencies.respond({ error: "Unauthorized" }, 401);

  const leaseId = crypto.randomUUID();
  let reservation;
  try { reservation = await dependencies.reserve(env, tenant, leaseId); }
  catch { return dependencies.respond({ error: "Tenant quota service is unavailable" }, 503); }
  if (!reservation?.allowed) {
    const retryAfter = Math.max(1, Math.ceil(reservation?.retryAfterSeconds ?? 2));
    return dependencies.respond({ error: "Tenant request limit reached" }, 429, { "retry-after": String(retryAfter) });
  }

  let response;
  try {
    if (create) {
      const result = await handleCreate(request, env, tenant, dependencies, dependencies.now());
      response = dependencies.respond(result.body, result.status, dependencies.rateHeaders(reservation, tenant));
    } else {
      if (request.body) throw new ScanControlError("invalid_request", 422);
      const result = await getTenantScanStatus(env.DB, tenant.tenantId, statusMatch[1]);
      response = result
        ? dependencies.respond(result, 200, dependencies.rateHeaders(reservation, tenant))
        : dependencies.respond({ error: "Scan is unavailable", code: "scan_unavailable" }, 404,
          dependencies.rateHeaders(reservation, tenant));
    }
  } catch (error) {
    const normalized = publicError(error);
    response = dependencies.respond(normalized.body, normalized.status,
      dependencies.rateHeaders(reservation, tenant));
  }

  try { await dependencies.release(env, tenant, leaseId); }
  catch { return dependencies.respond({ error: "Tenant quota service is unavailable" }, 503); }
  return response;
}
