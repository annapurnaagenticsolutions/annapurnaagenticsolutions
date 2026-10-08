const MAX_BATCH_SIZE = 100;
const DAILY_SCAN_QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;
const TENANT_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const ROW_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

function validObjectKey(artifact) {
  return TENANT_ID_PATTERN.test(artifact.tenant_id ?? "") &&
    ROW_ID_PATTERN.test(artifact.scan_id ?? "") &&
    ROW_ID_PATTERN.test(artifact.artifact_id ?? "") &&
    artifact.object_key === `${artifact.tenant_id}/${artifact.scan_id}/${artifact.artifact_id}.json`;
}

async function recordDeleteFailure(db, artifactId, nowMs, code) {
  await db.prepare(`
    UPDATE scan_artifacts SET last_delete_error_code = ?
     WHERE artifact_id = ? AND expires_at_ms <= ?
  `).bind(code, artifactId, nowMs).run();
}

async function finalizeDeletedArtifact(db, artifact, nowMs) {
  const quotaHistoryCutoff = nowMs - DAILY_SCAN_QUOTA_WINDOW_MS;
  await db.batch([
    db.prepare(`
      INSERT INTO scan_artifact_deletion_audit (artifact_id, tenant_id, deleted_at_ms, attempts)
      SELECT artifact_id, tenant_id, ?, deletion_attempts
        FROM scan_artifacts WHERE artifact_id = ? AND expires_at_ms <= ?
      ON CONFLICT (artifact_id) DO NOTHING
    `).bind(nowMs, artifact.artifact_id, nowMs),
    db.prepare(`
      DELETE FROM scan_artifacts WHERE artifact_id = ? AND expires_at_ms <= ?
    `).bind(artifact.artifact_id, nowMs),
    db.prepare(`
      INSERT INTO scan_job_deletion_audit (scan_id, tenant_id, deleted_at_ms)
      SELECT scan_id, tenant_id, ? FROM scan_jobs
       WHERE scan_id = ? AND tenant_id = ? AND status IN ('succeeded', 'failed', 'cancelled')
         AND expires_at_ms <= ?
         AND created_at_ms <= ?
         AND NOT EXISTS (
           SELECT 1 FROM scan_artifacts
            WHERE scan_id = scan_jobs.scan_id AND tenant_id = scan_jobs.tenant_id
         )
      ON CONFLICT (scan_id) DO NOTHING
    `).bind(nowMs, artifact.scan_id, artifact.tenant_id, nowMs, quotaHistoryCutoff),
    db.prepare(`
      DELETE FROM scan_jobs
       WHERE scan_id = ? AND tenant_id = ? AND expires_at_ms <= ?
         AND status IN ('succeeded', 'failed', 'cancelled')
         AND created_at_ms <= ?
         AND NOT EXISTS (
           SELECT 1 FROM scan_artifacts
            WHERE scan_id = ? AND tenant_id = ?
         )
         AND EXISTS (
           SELECT 1 FROM scan_job_deletion_audit d
            WHERE d.scan_id = scan_jobs.scan_id AND d.tenant_id = scan_jobs.tenant_id
              AND d.deleted_at_ms >= scan_jobs.expires_at_ms
         )
    `).bind(artifact.scan_id, artifact.tenant_id, nowMs, quotaHistoryCutoff, artifact.scan_id, artifact.tenant_id),
  ]);

  const retained = await db.prepare(`
    SELECT artifact_id FROM scan_artifacts WHERE artifact_id = ?
  `).bind(artifact.artifact_id).first();
  if (retained) throw new Error("artifact metadata finalization incomplete");
}

/**
 * Remove expired objects before their D1 pointers. This core is intentionally
 * not scheduled or bound to R2 by the staging Worker until retention operations
 * and storage costs receive separate review.
 */
export async function deleteExpiredArtifacts(db, bucket, { nowMs = Date.now(), limit = 25 } = {}) {
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function" ||
      !bucket || typeof bucket.head !== "function" || typeof bucket.delete !== "function") {
    throw new TypeError("D1 and R2 bindings are required");
  }
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) throw new RangeError("nowMs must be a positive safe integer");
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_BATCH_SIZE) {
    throw new RangeError(`limit must be between 1 and ${MAX_BATCH_SIZE}`);
  }

  const selection = await db.prepare(`
    SELECT artifact_id, tenant_id, scan_id, object_key, expires_at_ms
      FROM scan_artifacts
     WHERE expires_at_ms <= ?
     ORDER BY expires_at_ms, artifact_id
     LIMIT ?
  `).bind(nowMs, limit).all();
  if (!Array.isArray(selection?.results)) throw new Error("expired artifact query failed");

  let attempted = 0;
  let deleted = 0;
  let failed = 0;
  for (const artifact of selection.results) {
    const attempt = await db.prepare(`
      UPDATE scan_artifacts
         SET deletion_attempts = deletion_attempts + 1,
             last_delete_attempt_ms = ?,
             last_delete_error_code = NULL
       WHERE artifact_id = ? AND expires_at_ms <= ?
    `).bind(nowMs, artifact.artifact_id, nowMs).run();
    if (attempt.meta?.changes !== 1) continue;
    attempted += 1;

    let failureCode = null;
    if (!validObjectKey(artifact)) {
      failureCode = "invalid_object_key";
    } else {
      try {
        const object = await bucket.head(artifact.object_key);
        if (object !== null) await bucket.delete(artifact.object_key);
      } catch {
        failureCode = "r2_delete_failed";
      }
    }

    if (failureCode) {
      try { await recordDeleteFailure(db, artifact.artifact_id, nowMs, failureCode); } catch { /* retain pointer and retry later */ }
      failed += 1;
      continue;
    }

    try {
      await finalizeDeletedArtifact(db, artifact, nowMs);
      deleted += 1;
    } catch {
      try { await recordDeleteFailure(db, artifact.artifact_id, nowMs, "db_finalize_failed"); } catch { /* retain pointer and retry later */ }
      failed += 1;
    }
  }

  const pending = await db.prepare(`
    SELECT 1 AS present FROM scan_artifacts WHERE expires_at_ms <= ? LIMIT 1
  `).bind(nowMs).first();
  return { attempted, deleted, failed, more_due: Boolean(pending) };
}
