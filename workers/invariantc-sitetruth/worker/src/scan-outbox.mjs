const SCAN_ID = /^[A-Za-z0-9_-]{22}$/;
const TENANT_ID = /^[A-Za-z0-9_-]{1,80}$/;
const MAX_PENDING_DISPATCHES = 25;

function validateScanKey(scanId, tenantId) {
  if (typeof scanId !== "string" || !SCAN_ID.test(scanId)) throw new TypeError("invalid scan id");
  if (typeof tenantId !== "string" || !TENANT_ID.test(tenantId)) throw new TypeError("invalid tenant id");
}

function validateTime(nowMs) {
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) throw new TypeError("nowMs must be a positive safe integer");
}

function validD1Change(result) {
  return result?.success === true && Number.isSafeInteger(result.meta?.changes) && result.meta.changes >= 0;
}

export async function dispatchScanJob(db, queue, { scanId, tenantId, nowMs = Date.now() }) {
  if (!db || typeof db.prepare !== "function") throw new TypeError("D1 database is required");
  validateScanKey(scanId, tenantId);
  validateTime(nowMs);
  if (!queue || typeof queue.send !== "function") return { status: "pending", reason: "queue_unavailable" };

  const row = await db.prepare(`
    SELECT j.status, o.dispatched_at_ms, o.expires_at_ms
      FROM scan_jobs j
      JOIN scan_job_dispatch_outbox o ON o.scan_id = j.scan_id AND o.tenant_id = j.tenant_id
     WHERE j.scan_id = ? AND j.tenant_id = ?
  `).bind(scanId, tenantId).first();
  if (!row || row.status !== "queued") return { status: row ? "terminal_or_claimed" : "not_found" };
  if (row.dispatched_at_ms !== null) return { status: "dispatched" };
  if (!Number.isSafeInteger(row.expires_at_ms) || row.expires_at_ms <= nowMs) return { status: "expired" };

  let sendSucceeded = false;
  try {
    await queue.send({ version: 1, scan_id: scanId, tenant_id: tenantId }, { contentType: "json" });
    sendSucceeded = true;
  } catch {
    // Retain only a bounded failure code. Queue errors may contain credentials or resource names.
  }

  const result = await db.prepare(`
    UPDATE scan_job_dispatch_outbox
       SET dispatch_attempts = dispatch_attempts + 1,
           last_attempt_at_ms = ?,
           dispatched_at_ms = CASE WHEN ? = 1 THEN ? ELSE dispatched_at_ms END,
           last_error_code = CASE WHEN ? = 1 THEN NULL ELSE 'queue_send_failed' END
     WHERE scan_id = ? AND tenant_id = ? AND dispatched_at_ms IS NULL AND expires_at_ms > ?
  `).bind(nowMs, sendSucceeded ? 1 : 0, nowMs, sendSucceeded ? 1 : 0, scanId, tenantId, nowMs).run();
  if (!validD1Change(result)) throw new Error("Scan outbox update result is unavailable");
  if (result.meta.changes === 0) return { status: "terminal_or_claimed" };
  return { status: sendSucceeded ? "dispatched" : "pending", reason: sendSucceeded ? null : "queue_send_failed" };
}

export async function dispatchPendingScanJobs(db, queue, { nowMs = Date.now(), limit = MAX_PENDING_DISPATCHES } = {}) {
  if (!db || typeof db.prepare !== "function") throw new TypeError("D1 database is required");
  validateTime(nowMs);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PENDING_DISPATCHES) {
    throw new TypeError("scan outbox limit is outside the bounded range");
  }
  if (!queue || typeof queue.send !== "function") return { scanned: 0, dispatched: 0, pending: 0, expired: 0 };

  const selection = await db.prepare(`
    SELECT o.scan_id, o.tenant_id
      FROM scan_job_dispatch_outbox o
      JOIN scan_jobs j ON j.scan_id = o.scan_id AND j.tenant_id = o.tenant_id
     WHERE o.dispatched_at_ms IS NULL AND o.expires_at_ms > ? AND j.status = 'queued'
     ORDER BY o.created_at_ms, o.scan_id
     LIMIT ?
  `).bind(nowMs, limit).all();
  if (selection?.success !== true || !Array.isArray(selection.results)) {
    throw new Error("Scan outbox selection result is unavailable");
  }
  let dispatched = 0;
  let pending = 0;
  for (const row of selection.results) {
    if (typeof row?.scan_id !== "string" || typeof row?.tenant_id !== "string") {
      throw new Error("Scan outbox row is invalid");
    }
    const result = await dispatchScanJob(db, queue, { scanId: row.scan_id, tenantId: row.tenant_id, nowMs });
    if (result.status === "dispatched") dispatched += 1;
    else if (result.status === "pending") pending += 1;
  }
  return { scanned: selection.results.length, dispatched, pending, expired: 0 };
}

export async function getTenantScanStatus(db, tenantId, scanId) {
  if (!db || typeof db.prepare !== "function") throw new TypeError("D1 database is required");
  validateScanKey(scanId, tenantId);
  const row = await db.prepare(`
    SELECT scan_id, status, created_at_ms, started_at_ms, finished_at_ms, terminal_reason
      FROM scan_jobs
     WHERE tenant_id = ? AND scan_id = ?
  `).bind(tenantId, scanId).first();
  if (!row) return null;
  if (!SCAN_ID.test(row.scan_id) || !["queued", "running", "succeeded", "failed", "cancelled"].includes(row.status) ||
      !Number.isSafeInteger(row.created_at_ms)) {
    throw new Error("Scan status row is invalid");
  }
  return {
    scan_id: row.scan_id,
    status: row.status,
    created_at_ms: row.created_at_ms,
    ...(Number.isSafeInteger(row.started_at_ms) ? { started_at_ms: row.started_at_ms } : {}),
    ...(Number.isSafeInteger(row.finished_at_ms) ? { finished_at_ms: row.finished_at_ms } : {}),
    ...(typeof row.terminal_reason === "string" ? { terminal_reason: row.terminal_reason } : {}),
  };
}
