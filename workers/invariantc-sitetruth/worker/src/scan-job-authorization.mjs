import { normalizeExactHttpsOrigin } from "./domain-verification.mjs";

const SCAN_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

function validateLookup(db, scanId, nowMs) {
  if (!db || typeof db.prepare !== "function") throw new TypeError("D1 database is required");
  if (typeof scanId !== "string" || !SCAN_ID_PATTERN.test(scanId)) throw new TypeError("invalid scan id");
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) throw new TypeError("nowMs must be a positive safe integer");
}

function checkedGrant(row, nowMs) {
  if (!row) return null;
  const origin = normalizeExactHttpsOrigin(row.origin);
  if (origin.origin !== row.origin || origin.hostnameAscii !== row.hostname_ascii) {
    throw new Error("Stored scan origin is not canonical");
  }
  if (![row.started_at_ms, row.page_limit, row.run_budget_seconds].every(Number.isSafeInteger) ||
      row.started_at_ms <= 0 || row.page_limit <= 0 || row.run_budget_seconds <= 0 ||
      !/^[0-9a-f]{64}$/.test(row.capture_spec_sha256 ?? "")) {
    throw new Error("Stored scan authorization metadata is invalid");
  }
  const deadline = row.started_at_ms + row.run_budget_seconds * 1000;
  if (!Number.isSafeInteger(deadline)) throw new Error("Stored scan runtime deadline is invalid");
  if (nowMs < row.started_at_ms || nowMs >= deadline) return null;

  return {
    scanId: row.scan_id,
    tenantId: row.tenant_id,
    originId: row.origin_id,
    origin: origin.origin,
    captureSpecSha256: row.capture_spec_sha256,
    pageLimit: row.page_limit,
    runBudgetSeconds: row.run_budget_seconds,
    startedAtMs: row.started_at_ms,
  };
}

/**
 * Atomically transitions one queued job only while its tenant and verified
 * origin are active. Call getScanNavigationGrant again immediately before
 * page.goto; do not derive a target URL from a queue message or caller input.
 */
export async function claimScanJobForExecution(db, { scanId, nowMs }) {
  validateLookup(db, scanId, nowMs);
  const result = await db.prepare(`
    UPDATE scan_jobs
       SET status = 'running', started_at_ms = ?, finished_at_ms = NULL
     WHERE scan_id = ?
       AND status = 'queued'
       AND EXISTS (
         SELECT 1
           FROM tenants t
           JOIN verified_origins o ON o.tenant_id = t.tenant_id
          WHERE t.tenant_id = scan_jobs.tenant_id
            AND t.status = 'active'
            AND o.origin_id = scan_jobs.origin_id
            AND o.revoked_at_ms IS NULL
            AND o.expires_at_ms > ?
       )
  `).bind(nowMs, scanId, nowMs).run();

  if (result?.success !== true || !Number.isSafeInteger(result.meta?.changes) || result.meta.changes < 0) {
    throw new Error("Scan job claim result is unavailable");
  }
  if (result.meta.changes === 0) return null;
  if (result.meta.changes !== 1) throw new Error("Scan job claim changed an unexpected number of rows");
  return getScanNavigationGrant(db, { scanId, nowMs });
}

/** Re-read tenant, job, and origin authority at the browser navigation boundary. */
export async function getScanNavigationGrant(db, { scanId, nowMs }) {
  validateLookup(db, scanId, nowMs);
  const row = await db.prepare(`
    SELECT j.scan_id, j.tenant_id, j.origin_id, o.hostname_ascii, o.origin,
           j.capture_spec_sha256, j.page_limit, j.run_budget_seconds, j.started_at_ms
      FROM scan_jobs j
      JOIN tenants t ON t.tenant_id = j.tenant_id
      JOIN verified_origins o ON o.tenant_id = j.tenant_id AND o.origin_id = j.origin_id
     WHERE j.scan_id = ?
       AND j.status = 'running'
       AND t.status = 'active'
       AND o.revoked_at_ms IS NULL
       AND o.expires_at_ms > ?
  `).bind(scanId, nowMs).first();
  return checkedGrant(row, nowMs);
}
