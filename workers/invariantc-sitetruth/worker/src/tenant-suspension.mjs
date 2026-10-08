const TENANT_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

/**
 * Atomically cancel active scan jobs before suspending a tenant.
 * Direct D1 status changes are rejected by migration 0007 while jobs remain
 * queued/running, so suspension cannot strand work between two operations.
 */
export async function suspendTenantAndCancelActiveScans(db, { tenantId, nowMs }) {
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function") {
    throw new TypeError("D1 database with batch support is required");
  }
  if (typeof tenantId !== "string" || !TENANT_ID_PATTERN.test(tenantId)) {
    throw new TypeError("invalid tenant id");
  }
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) {
    throw new TypeError("nowMs must be a positive safe integer");
  }

  const results = await db.batch([
    db.prepare(`
      UPDATE scan_jobs
         SET status = 'cancelled',
             finished_at_ms = MAX(?, COALESCE(started_at_ms, created_at_ms))
       WHERE tenant_id = ?
         AND status IN ('queued', 'running')
    `).bind(nowMs, tenantId),
    db.prepare(`
      UPDATE tenants
         SET status = 'suspended'
       WHERE tenant_id = ? AND status = 'active'
    `).bind(tenantId),
  ]);

  if (!Array.isArray(results) || results.length !== 2 || results.some((result) =>
    result?.success !== true || !Number.isSafeInteger(result.meta?.changes) || result.meta.changes < 0)) {
    throw new Error("Tenant suspension batch result is unavailable");
  }
  const [jobs, tenant] = results;
  return {
    status: tenant.meta.changes === 1 ? "suspended" : "unchanged",
    cancelledScans: jobs.meta.changes,
  };
}
