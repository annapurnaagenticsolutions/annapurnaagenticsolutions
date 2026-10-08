const MAX_JOBS_PER_RUN = 25;
const DAILY_SCAN_QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;

function validate(db, nowMs, auditRetentionMs, limit) {
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function") {
    throw new TypeError("D1 binding is required");
  }
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) throw new RangeError("nowMs must be a positive safe integer");
  if (!Number.isSafeInteger(auditRetentionMs) || auditRetentionMs <= 0) {
    throw new RangeError("auditRetentionMs must be an operator-approved positive safe integer");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_JOBS_PER_RUN) {
    throw new RangeError(`limit must be between 1 and ${MAX_JOBS_PER_RUN}`);
  }
}

/** Delete only expired terminal jobs after report objects/pointers are gone. */
export async function deleteExpiredScanJobs(db, {
  nowMs = Date.now(),
  auditRetentionMs,
  limit = MAX_JOBS_PER_RUN,
} = {}) {
  validate(db, nowMs, auditRetentionMs, limit);
  const quotaHistoryCutoff = nowMs - DAILY_SCAN_QUOTA_WINDOW_MS;
  const selection = await db.prepare(`
    SELECT scan_id, tenant_id, created_at_ms, expires_at_ms
      FROM scan_jobs
     WHERE status IN ('succeeded', 'failed', 'cancelled')
       AND expires_at_ms <= ?
       AND created_at_ms <= ?
       AND NOT EXISTS (
         SELECT 1 FROM scan_artifacts a
          WHERE a.scan_id = scan_jobs.scan_id AND a.tenant_id = scan_jobs.tenant_id
       )
     ORDER BY expires_at_ms, scan_id
     LIMIT ?
  `).bind(nowMs, quotaHistoryCutoff, limit).all();
  if (!Array.isArray(selection?.results)) throw new Error("expired scan job query failed");

  const jobs = selection.results.filter((row) =>
    typeof row.scan_id === "string" && typeof row.tenant_id === "string" &&
    Number.isSafeInteger(row.created_at_ms) && row.created_at_ms <= quotaHistoryCutoff &&
    Number.isSafeInteger(row.expires_at_ms) && row.expires_at_ms <= nowMs);
  const statements = jobs.flatMap((job) => [
    db.prepare(`
      INSERT INTO scan_job_deletion_audit (scan_id, tenant_id, deleted_at_ms)
      SELECT scan_id, tenant_id, ? FROM scan_jobs
       WHERE scan_id = ? AND tenant_id = ? AND status IN ('succeeded', 'failed', 'cancelled')
         AND expires_at_ms <= ?
         AND created_at_ms <= ?
         AND NOT EXISTS (
           SELECT 1 FROM scan_artifacts a
            WHERE a.scan_id = scan_jobs.scan_id AND a.tenant_id = scan_jobs.tenant_id
         )
      ON CONFLICT (scan_id) DO NOTHING
    `).bind(nowMs, job.scan_id, job.tenant_id, nowMs, quotaHistoryCutoff),
    db.prepare(`
      DELETE FROM scan_jobs
       WHERE scan_id = ? AND tenant_id = ? AND status IN ('succeeded', 'failed', 'cancelled')
         AND expires_at_ms <= ?
         AND created_at_ms <= ?
         AND NOT EXISTS (
           SELECT 1 FROM scan_artifacts a
            WHERE a.scan_id = scan_jobs.scan_id AND a.tenant_id = scan_jobs.tenant_id
         )
         AND EXISTS (
           SELECT 1 FROM scan_job_deletion_audit d
            WHERE d.scan_id = scan_jobs.scan_id AND d.tenant_id = scan_jobs.tenant_id
              AND d.deleted_at_ms >= scan_jobs.expires_at_ms
         )
    `).bind(job.scan_id, job.tenant_id, nowMs, quotaHistoryCutoff),
  ]);
  const results = statements.length ? await db.batch(statements) : [];
  let deleted = 0;
  for (let index = 0; index < jobs.length; index += 1) deleted += results[index * 2 + 1]?.meta?.changes ?? 0;

  const auditCutoff = nowMs - auditRetentionMs;
  const auditSelection = await db.prepare(`
    SELECT scan_id FROM scan_job_deletion_audit
     WHERE deleted_at_ms <= ?
     ORDER BY deleted_at_ms, scan_id
     LIMIT ?
  `).bind(auditCutoff, limit).all();
  if (!Array.isArray(auditSelection?.results)) throw new Error("scan job audit-retention query failed");
  const audits = auditSelection.results.filter((row) => typeof row.scan_id === "string");
  const auditResults = audits.length ? await db.batch(audits.map((row) => db.prepare(`
    DELETE FROM scan_job_deletion_audit WHERE scan_id = ? AND deleted_at_ms <= ?
  `).bind(row.scan_id, auditCutoff))) : [];
  const auditRowsDeleted = auditResults.reduce((count, result) => count + (result?.meta?.changes ?? 0), 0);

  const payloadAuditSelection = await db.prepare(`
    SELECT scan_id FROM scan_payload_deletion_audit
     WHERE deleted_at_ms <= ?
     ORDER BY deleted_at_ms, scan_id
     LIMIT ?
  `).bind(auditCutoff, limit).all();
  if (!Array.isArray(payloadAuditSelection?.results)) throw new Error("scan payload audit-retention query failed");
  const payloadAudits = payloadAuditSelection.results.filter((row) => typeof row.scan_id === "string");
  const payloadAuditResults = payloadAudits.length ? await db.batch(payloadAudits.map((row) => db.prepare(`
    DELETE FROM scan_payload_deletion_audit WHERE scan_id = ? AND deleted_at_ms <= ?
  `).bind(row.scan_id, auditCutoff))) : [];
  const payloadAuditRowsDeleted = payloadAuditResults.reduce((count, result) => count + (result?.meta?.changes ?? 0), 0);

  const [pendingJobs, pendingAudits, pendingPayloadAudits] = await Promise.all([
    db.prepare(`
      SELECT 1 AS present FROM scan_jobs
       WHERE status IN ('succeeded', 'failed', 'cancelled') AND expires_at_ms <= ?
         AND created_at_ms <= ?
         AND NOT EXISTS (
           SELECT 1 FROM scan_artifacts a
            WHERE a.scan_id = scan_jobs.scan_id AND a.tenant_id = scan_jobs.tenant_id
         )
       LIMIT 1
    `).bind(nowMs, quotaHistoryCutoff).first(),
    db.prepare("SELECT 1 AS present FROM scan_job_deletion_audit WHERE deleted_at_ms <= ? LIMIT 1")
      .bind(auditCutoff).first(),
    db.prepare("SELECT 1 AS present FROM scan_payload_deletion_audit WHERE deleted_at_ms <= ? LIMIT 1")
      .bind(auditCutoff).first(),
  ]);
  return {
    deleted,
    audit_rows_deleted: auditRowsDeleted,
    payload_audit_rows_deleted: payloadAuditRowsDeleted,
    more_due: Boolean(pendingJobs || pendingAudits || pendingPayloadAudits),
  };
}
