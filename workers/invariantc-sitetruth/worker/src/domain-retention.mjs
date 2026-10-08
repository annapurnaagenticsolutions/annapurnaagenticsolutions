const MAX_ROWS_PER_RUN = 24;
const MAX_TENANT_ISSUANCE_WINDOW_MS = 24 * 60 * 60 * 1000;

function validateOptions(db, { nowMs, retentionMs, auditRetentionMs, limit }) {
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function") {
    throw new TypeError("D1 binding is required");
  }
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) throw new RangeError("nowMs must be a positive safe integer");
  if (!Number.isSafeInteger(retentionMs) || retentionMs <= 0) {
    throw new RangeError("retentionMs must be an operator-approved positive safe integer");
  }
  if (!Number.isSafeInteger(auditRetentionMs) || auditRetentionMs <= 0) {
    throw new RangeError("auditRetentionMs must be an operator-approved positive safe integer");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_ROWS_PER_RUN) {
    throw new RangeError(`limit must be between 1 and ${MAX_ROWS_PER_RUN}`);
  }
}

function prepareAuditedDelete(db, { recordType, recordId, tenantId, nowMs, table, idColumn, retentionCutoff }) {
  const lifecyclePredicate = recordType === "origin"
    ? "COALESCE(revoked_at_ms, expires_at_ms) <= ?"
    : "expires_at_ms <= ? AND issued_at_ms <= ?";
  const lifecycleValues = recordType === "origin"
    ? [retentionCutoff]
    : [retentionCutoff, retentionCutoff];
  const audit = db.prepare(`
    INSERT INTO domain_metadata_deletion_audit (record_type, record_id, tenant_id, deleted_at_ms)
    SELECT ?, ?, ?, ? FROM ${table}
     WHERE ${idColumn} = ? AND tenant_id = ? AND ${lifecyclePredicate}
    ON CONFLICT (record_type, record_id) DO NOTHING
  `).bind(recordType, recordId, tenantId, nowMs, recordId, tenantId, ...lifecycleValues);
  const remove = recordType === "origin"
    ? db.prepare(`
        DELETE FROM verified_origins
         WHERE origin_id = ? AND tenant_id = ? AND COALESCE(revoked_at_ms, expires_at_ms) <= ?
           AND NOT EXISTS (
             SELECT 1 FROM scan_jobs j WHERE j.tenant_id = verified_origins.tenant_id
               AND j.origin_id = verified_origins.origin_id
           )
      `).bind(recordId, tenantId, retentionCutoff)
    : db.prepare(`
        DELETE FROM domain_challenges
         WHERE challenge_id = ? AND tenant_id = ? AND expires_at_ms <= ? AND issued_at_ms <= ?
           AND NOT EXISTS (
             SELECT 1 FROM verified_origins o WHERE o.tenant_id = domain_challenges.tenant_id
               AND o.challenge_id = domain_challenges.challenge_id
           )
      `).bind(recordId, tenantId, retentionCutoff, retentionCutoff);
  return [audit, remove];
}

function eligibleLifecycle(record, nowMs, retentionMs) {
  const endedAt = record.revoked_at_ms ?? record.expires_at_ms;
  return endedAt <= nowMs - retentionMs;
}

/**
 * Delete expired/revoked domain proof records in a bounded, audited D1 batch.
 * Data and audit retention windows are mandatory operator policy inputs.
 * Challenge rows also remain for at least the existing 24-hour issuance
 * quota window, and origin rows remain while any scan job references them.
 */
export async function deleteExpiredDomainMetadata(db, {
  nowMs = Date.now(),
  retentionMs,
  auditRetentionMs,
  limit = MAX_ROWS_PER_RUN,
} = {}) {
  validateOptions(db, { nowMs, retentionMs, auditRetentionMs, limit });
  const retentionCutoff = nowMs - retentionMs;

  const [originSelection, challengeSelection] = await Promise.all([
    db.prepare(`
      SELECT origin_id, tenant_id, revoked_at_ms, expires_at_ms
        FROM verified_origins
       WHERE COALESCE(revoked_at_ms, expires_at_ms) <= ?
         AND NOT EXISTS (
           SELECT 1 FROM scan_jobs j WHERE j.tenant_id = verified_origins.tenant_id
             AND j.origin_id = verified_origins.origin_id
         )
       ORDER BY COALESCE(revoked_at_ms, expires_at_ms), origin_id
       LIMIT ?
    `).bind(retentionCutoff, limit).all(),
    db.prepare(`
      SELECT challenge_id, tenant_id, issued_at_ms, expires_at_ms
        FROM domain_challenges
       WHERE expires_at_ms <= ? AND issued_at_ms <= ?
         AND NOT EXISTS (
           SELECT 1 FROM verified_origins o WHERE o.tenant_id = domain_challenges.tenant_id
             AND o.challenge_id = domain_challenges.challenge_id
         )
       ORDER BY expires_at_ms, challenge_id
       LIMIT ?
    `).bind(
      Math.min(retentionCutoff, nowMs - MAX_TENANT_ISSUANCE_WINDOW_MS),
      Math.min(retentionCutoff, nowMs - MAX_TENANT_ISSUANCE_WINDOW_MS),
      limit,
    ).all(),
  ]);
  if (!Array.isArray(originSelection?.results) || !Array.isArray(challengeSelection?.results)) {
    throw new Error("domain metadata retention candidate query failed");
  }

  const originRows = originSelection.results.filter((row) =>
    typeof row.origin_id === "string" && typeof row.tenant_id === "string" &&
    eligibleLifecycle(row, nowMs, retentionMs)).slice(0, limit);
  const challengeRows = challengeSelection.results.filter((row) =>
    typeof row.challenge_id === "string" && typeof row.tenant_id === "string")
    .slice(0, Math.max(0, limit - originRows.length));
  const statements = [
    ...originRows.flatMap((row) => prepareAuditedDelete(db, {
      recordType: "origin", recordId: row.origin_id, tenantId: row.tenant_id,
      nowMs, table: "verified_origins", idColumn: "origin_id", retentionCutoff,
    })),
    ...challengeRows.flatMap((row) => prepareAuditedDelete(db, {
      recordType: "challenge", recordId: row.challenge_id, tenantId: row.tenant_id,
      nowMs, table: "domain_challenges", idColumn: "challenge_id",
      retentionCutoff: Math.min(retentionCutoff, nowMs - MAX_TENANT_ISSUANCE_WINDOW_MS),
    })),
  ];
  const results = statements.length ? await db.batch(statements) : [];
  let originsDeleted = 0;
  let challengesDeleted = 0;
  for (let index = 0; index < originRows.length; index += 1) {
    originsDeleted += results[index * 2 + 1]?.meta?.changes ?? 0;
  }
  const challengeOffset = originRows.length * 2;
  for (let index = 0; index < challengeRows.length; index += 1) {
    challengesDeleted += results[challengeOffset + index * 2 + 1]?.meta?.changes ?? 0;
  }

  const auditCutoff = nowMs - auditRetentionMs;
  const auditSelection = await db.prepare(`
    SELECT record_type, record_id FROM domain_metadata_deletion_audit
     WHERE deleted_at_ms <= ?
     ORDER BY deleted_at_ms, record_type, record_id
     LIMIT ?
  `).bind(auditCutoff, limit).all();
  if (!Array.isArray(auditSelection?.results)) throw new Error("domain metadata audit-retention query failed");
  const auditRows = auditSelection.results.filter((row) =>
    ["challenge", "origin"].includes(row.record_type) && typeof row.record_id === "string");
  const auditResults = auditRows.length ? await db.batch(auditRows.map((row) => db.prepare(`
    DELETE FROM domain_metadata_deletion_audit
     WHERE record_type = ? AND record_id = ? AND deleted_at_ms <= ?
  `).bind(row.record_type, row.record_id, auditCutoff))) : [];
  const auditRowsDeleted = auditResults.reduce((count, result) => count + (result?.meta?.changes ?? 0), 0);

  const [pendingOrigins, pendingChallenges, pendingAudit] = await Promise.all([
    db.prepare(`
      SELECT 1 AS present FROM verified_origins
       WHERE COALESCE(revoked_at_ms, expires_at_ms) <= ?
         AND NOT EXISTS (
           SELECT 1 FROM scan_jobs j WHERE j.tenant_id = verified_origins.tenant_id
             AND j.origin_id = verified_origins.origin_id
         )
       LIMIT 1
    `).bind(retentionCutoff).first(),
    db.prepare(`
      SELECT 1 AS present FROM domain_challenges
       WHERE expires_at_ms <= ? AND issued_at_ms <= ?
         AND NOT EXISTS (
           SELECT 1 FROM verified_origins o WHERE o.tenant_id = domain_challenges.tenant_id
             AND o.challenge_id = domain_challenges.challenge_id
         )
       LIMIT 1
    `).bind(
      Math.min(retentionCutoff, nowMs - MAX_TENANT_ISSUANCE_WINDOW_MS),
      Math.min(retentionCutoff, nowMs - MAX_TENANT_ISSUANCE_WINDOW_MS),
    ).first(),
    db.prepare(`
      SELECT 1 AS present FROM domain_metadata_deletion_audit
       WHERE deleted_at_ms <= ? LIMIT 1
    `).bind(auditCutoff).first(),
  ]);

  return {
    origins_deleted: originsDeleted,
    challenges_deleted: challengesDeleted,
    audit_rows_deleted: auditRowsDeleted,
    more_due: Boolean(pendingOrigins || pendingChallenges || pendingAudit),
  };
}
