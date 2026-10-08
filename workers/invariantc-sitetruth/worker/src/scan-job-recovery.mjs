const MAX_RECOVERIES_PER_RUN = 25;

function validate(db, nowMs, queuedMaxAgeMs, runningGraceMs, limit) {
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function") {
    throw new TypeError("D1 binding is required");
  }
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) throw new RangeError("nowMs must be a positive safe integer");
  if (!Number.isSafeInteger(queuedMaxAgeMs) || queuedMaxAgeMs <= 0) {
    throw new RangeError("queuedMaxAgeMs must be an operator-approved positive safe integer");
  }
  if (!Number.isSafeInteger(runningGraceMs) || runningGraceMs < 0) {
    throw new RangeError("runningGraceMs must be an operator-approved non-negative safe integer");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RECOVERIES_PER_RUN) {
    throw new RangeError(`limit must be between 1 and ${MAX_RECOVERIES_PER_RUN}`);
  }
}

function isRecoveryCandidate(row, nowMs, queueCutoff, runningGraceMs) {
  if (typeof row.scan_id !== "string" || typeof row.tenant_id !== "string") return false;
  if (row.status === "queued") {
    return Number.isSafeInteger(row.created_at_ms) && row.created_at_ms <= queueCutoff;
  }
  if (row.status === "running") {
    if (!Number.isSafeInteger(row.started_at_ms) || !Number.isSafeInteger(row.run_budget_seconds) ||
        row.started_at_ms <= 0 || row.run_budget_seconds <= 0) return false;
    const deadline = row.started_at_ms + row.run_budget_seconds * 1000 + runningGraceMs;
    return Number.isSafeInteger(deadline) && deadline <= nowMs;
  }
  return false;
}

/**
 * Fail stale queue items and over-budget executions using operator-approved
 * thresholds. This function does not delete jobs or access customer origins.
 */
export async function recoverStaleScanJobs(db, {
  nowMs = Date.now(),
  queuedMaxAgeMs,
  runningGraceMs,
  limit = MAX_RECOVERIES_PER_RUN,
} = {}) {
  validate(db, nowMs, queuedMaxAgeMs, runningGraceMs, limit);
  const queueCutoff = nowMs - queuedMaxAgeMs;
  const selection = await db.prepare(`
    SELECT scan_id, tenant_id, status, created_at_ms, started_at_ms, run_budget_seconds
      FROM scan_jobs
     WHERE (status = 'queued' AND created_at_ms <= ?)
        OR (status = 'running' AND started_at_ms IS NOT NULL
            AND started_at_ms + run_budget_seconds * 1000 + ? <= ?)
     ORDER BY CASE WHEN status = 'queued'
                   THEN created_at_ms + ?
                   ELSE started_at_ms + run_budget_seconds * 1000 + ? END,
              scan_id
     LIMIT ?
  `).bind(queueCutoff, runningGraceMs, nowMs, queuedMaxAgeMs, runningGraceMs, limit).all();
  if (!Array.isArray(selection?.results)) throw new Error("stale scan-job recovery query failed");

  const candidates = selection.results.filter((row) =>
    isRecoveryCandidate(row, nowMs, queueCutoff, runningGraceMs));
  if (candidates.length !== selection.results.length) {
    throw new Error("stale scan-job recovery query returned an invalid candidate");
  }

  const statements = candidates.map((row) => row.status === "queued"
    ? db.prepare(`
        UPDATE scan_jobs
           SET status = 'failed', finished_at_ms = ?, terminal_reason = 'queue_timeout'
         WHERE scan_id = ? AND tenant_id = ? AND status = 'queued' AND created_at_ms <= ?
      `).bind(nowMs, row.scan_id, row.tenant_id, queueCutoff)
    : db.prepare(`
        UPDATE scan_jobs
           SET status = 'failed', finished_at_ms = ?, terminal_reason = 'run_budget_exceeded'
         WHERE scan_id = ? AND tenant_id = ? AND status = 'running'
           AND started_at_ms = ? AND run_budget_seconds = ?
           AND started_at_ms + run_budget_seconds * 1000 + ? <= ?
      `).bind(nowMs, row.scan_id, row.tenant_id, row.started_at_ms,
        row.run_budget_seconds, runningGraceMs, nowMs));
  const results = statements.length ? await db.batch(statements) : [];
  let recoveredQueued = 0;
  let recoveredRunning = 0;
  for (let index = 0; index < candidates.length; index += 1) {
    const changes = results[index]?.meta?.changes ?? 0;
    if (candidates[index].status === "queued") recoveredQueued += changes;
    else recoveredRunning += changes;
  }

  const pending = await db.prepare(`
    SELECT 1 AS present FROM scan_jobs
     WHERE (status = 'queued' AND created_at_ms <= ?)
        OR (status = 'running' AND started_at_ms IS NOT NULL
            AND started_at_ms + run_budget_seconds * 1000 + ? <= ?)
     LIMIT 1
  `).bind(queueCutoff, runningGraceMs, nowMs).first();
  return {
    recovered_queued: recoveredQueued,
    recovered_running: recoveredRunning,
    more_due: Boolean(pending),
  };
}
