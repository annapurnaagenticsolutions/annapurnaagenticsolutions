#!/usr/bin/env node
/**
 * Read-only acceptance smoke for the feature-disabled SiteTruth staging Worker.
 * It never sends credentials or customer data and rejects non-staging hosts.
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const DEFAULT_STAGING_BASE_URL =
  "https://invariantc-sitetruth-api-staging.annapurnaagenticsolutions-4f9.workers.dev";
const STAGING_HOST_PATTERN = /^invariantc-sitetruth-api-staging\.[a-z0-9-]+\.workers\.dev$/;
const MAX_RESPONSE_BYTES = 16 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

function parseStagingBaseUrl(value) {
  let base;
  try {
    base = new URL(value);
  } catch {
    throw new Error("Staging URL must be a valid HTTPS staging Worker origin");
  }
  if (base.protocol !== "https:" || !STAGING_HOST_PATTERN.test(base.hostname) ||
      (base.port && base.port !== "443") || base.username || base.password ||
      (base.pathname !== "/" && base.pathname !== "") || base.search || base.hash) {
    throw new Error("Staging URL must be a credential-free HTTPS staging Worker origin for invariantc-sitetruth-api-staging on workers.dev");
  }
  return base;
}

async function readBoundedText(response, maxBytes = MAX_RESPONSE_BYTES) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel().catch(() => {});
    throw new Error("Staging response exceeded the size limit");
  }
  if (!response.body) return "";

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
        throw new Error("Staging response exceeded the size limit");
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

async function request(fetchImpl, base, path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(new URL(path, base), {
      ...init,
      redirect: "error",
      signal: controller.signal,
    });
    const body = await readBoundedText(response);
    return { response, body };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`Staging request timed out: ${path}`);
    if (error instanceof Error && error.message.startsWith("Staging response exceeded")) throw error;
    const code = error?.cause?.code;
    const safeCode = typeof code === "string" && /^[A-Z0-9_]+$/.test(code) ? `; ${code}` : "";
    const errorName = typeof error?.name === "string" && /^[A-Za-z]+$/.test(error.name) ? error.name : "Error";
    throw new Error(`Staging request failed: ${path} (${errorName}${safeCode})`);
  } finally {
    clearTimeout(timeout);
  }
}

function requireStatus(response, expected, path) {
  if (response.status !== expected) throw new Error(`Staging ${path} returned HTTP ${response.status}; expected ${expected}`);
}

export async function runStagingReadonlySmoke({
  baseUrl = DEFAULT_STAGING_BASE_URL,
  fetchImpl = fetch,
} = {}) {
  const base = parseStagingBaseUrl(baseUrl);
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required");

  const healthResult = await request(fetchImpl, base, "/health");
  requireStatus(healthResult.response, 200, "/health");
  if (!healthResult.response.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new Error("Staging /health did not return JSON");
  }
  let health;
  try {
    health = JSON.parse(healthResult.body);
  } catch {
    throw new Error("Staging /health returned invalid JSON");
  }
  const disabledHealth = {
    service: "invariantc-sitetruth-api",
    status: "ready",
    domain_verification: "disabled",
    customer_payload_storage: "disabled",
    browser_scanning: "disabled",
    hosted_scan_intake: "disabled",
  };
  for (const [key, expected] of Object.entries(disabledHealth)) {
    if (health?.[key] !== expected) throw new Error(`Staging /health gate mismatch: ${key}`);
  }

  const previewResult = await request(fetchImpl, base, "/");
  requireStatus(previewResult.response, 200, "/");
  const previewHeaders = previewResult.response.headers;
  const csp = previewHeaders.get("content-security-policy") ?? "";
  if (!csp.includes("connect-src 'none'") || !csp.includes("frame-ancestors 'none'") ||
      previewHeaders.get("x-frame-options") !== "DENY" ||
      previewHeaders.get("x-content-type-options") !== "nosniff" ||
      previewHeaders.get("referrer-policy") !== "no-referrer") {
    throw new Error("Staging preview security headers are incomplete");
  }

  const unauthenticated = await request(fetchImpl, base, "/v1/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  requireStatus(unauthenticated.response, 401, "/v1/check without credentials");

  return {
    baseUrl: base.origin,
    checks: ["/health ready with hosted features disabled", "preview security headers", "unauthenticated /v1/check rejected"],
  };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await runStagingReadonlySmoke({
      baseUrl: process.env.SITETRUTH_STAGING_BASE_URL ?? DEFAULT_STAGING_BASE_URL,
    });
    for (const check of result.checks) console.log(`PASS ${check}`);
    console.log("Scope: read-only staging HTTP checks; no credentials, customer data, D1 writes, scans, or deployment.");
  } catch (error) {
    console.error(`Staging read-only smoke FAILED: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  }
}
