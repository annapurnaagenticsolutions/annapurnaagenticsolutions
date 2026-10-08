export class MemoryDomainRetentionDb {
  constructor({ challenges = [], origins = [], scanJobs = [] } = {}) {
    this.challenges = structuredClone(challenges);
    this.origins = structuredClone(origins);
    this.scanJobs = structuredClone(scanJobs);
    this.audit = [];
  }

  prepare(sql) {
    const db = this;
    return {
      sql,
      bind(...values) {
        return {
          sql,
          values,
          all: () => db.all(sql, values),
          first: () => db.first(sql, values),
        };
      },
    };
  }

  async all(sql, values) {
    if (sql.includes("FROM domain_metadata_deletion_audit")) {
      const [cutoff, limit] = values;
      return { results: this.audit.filter((row) => row.deleted_at_ms <= cutoff)
        .sort((a, b) => a.deleted_at_ms - b.deleted_at_ms)
        .slice(0, limit)
        .map(({ record_type, record_id }) => ({ record_type, record_id })) };
    }
    if (sql.includes("FROM verified_origins") && sql.includes("ORDER BY COALESCE")) {
      const [cutoff, limit] = values;
      return { results: this.origins
        .filter((row) => (row.revoked_at_ms ?? row.expires_at_ms) <= cutoff &&
          !this.scanJobs.some((job) => job.tenant_id === row.tenant_id && job.origin_id === row.origin_id))
        .sort((a, b) => (a.revoked_at_ms ?? a.expires_at_ms) - (b.revoked_at_ms ?? b.expires_at_ms))
        .slice(0, limit)
        .map(({ origin_id, tenant_id, revoked_at_ms, expires_at_ms }) => ({ origin_id, tenant_id, revoked_at_ms, expires_at_ms })) };
    }
    if (sql.includes("FROM domain_challenges") && sql.includes("ORDER BY expires_at_ms")) {
      const [expiryCutoff, issueCutoff, limit] = values;
      return { results: this.challenges
        .filter((row) => row.expires_at_ms <= expiryCutoff && row.issued_at_ms <= issueCutoff &&
          !this.origins.some((origin) => origin.tenant_id === row.tenant_id && origin.challenge_id === row.challenge_id))
        .sort((a, b) => a.expires_at_ms - b.expires_at_ms)
        .slice(0, limit)
        .map(({ challenge_id, tenant_id, issued_at_ms, expires_at_ms }) => ({ challenge_id, tenant_id, issued_at_ms, expires_at_ms })) };
    }
    throw new Error("Unsupported fake domain-retention list query");
  }

  async first(sql, values) {
    if (sql.includes("FROM domain_metadata_deletion_audit")) {
      return this.audit.some((row) => row.deleted_at_ms <= values[0]) ? { present: 1 } : null;
    }
    if (sql.includes("FROM domain_challenges") && sql.includes("NOT EXISTS")) {
      const [expiryCutoff, issueCutoff] = values;
      return this.challenges.some((row) => row.expires_at_ms <= expiryCutoff && row.issued_at_ms <= issueCutoff &&
        !this.origins.some((origin) => origin.tenant_id === row.tenant_id && origin.challenge_id === row.challenge_id))
        ? { present: 1 }
        : null;
    }
    if (sql.includes("FROM verified_origins") && sql.includes("NOT EXISTS")) {
      const [cutoff] = values;
      return this.origins.some((row) => (row.revoked_at_ms ?? row.expires_at_ms) <= cutoff &&
        !this.scanJobs.some((job) => job.tenant_id === row.tenant_id && job.origin_id === row.origin_id))
        ? { present: 1 }
        : null;
    }
    throw new Error("Unsupported fake domain-retention pending query");
  }

  async batch(statements) {
    const snapshot = structuredClone({ challenges: this.challenges, origins: this.origins, audit: this.audit });
    try {
      return statements.map((statement) => this.run(statement.sql, statement.values));
    } catch (error) {
      this.challenges = snapshot.challenges;
      this.origins = snapshot.origins;
      this.audit = snapshot.audit;
      throw error;
    }
  }

  run(sql, values) {
    if (sql.includes("DELETE FROM domain_metadata_deletion_audit")) {
      const [recordType, recordId, cutoff] = values;
      const index = this.audit.findIndex((entry) => entry.record_type === recordType &&
        entry.record_id === recordId && entry.deleted_at_ms <= cutoff);
      if (index < 0) return { success: true, meta: { changes: 0 } };
      this.audit.splice(index, 1);
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO domain_metadata_deletion_audit")) {
      const [recordType, recordId, tenantId, nowMs, , , retentionCutoff, issueCutoff] = values;
      const source = recordType === "origin" ? this.origins : this.challenges;
      const row = source.find((item) => item.tenant_id === tenantId &&
        (recordType === "origin" ? item.origin_id : item.challenge_id) === recordId);
      const eligible = row && (recordType === "origin"
        ? (row.revoked_at_ms ?? row.expires_at_ms) <= retentionCutoff
        : row.expires_at_ms <= retentionCutoff && row.issued_at_ms <= issueCutoff);
      if (!eligible || this.audit.some((entry) => entry.record_type === recordType && entry.record_id === recordId)) {
        return { success: true, meta: { changes: 0 } };
      }
      this.audit.push({ record_type: recordType, record_id: recordId, tenant_id: tenantId, deleted_at_ms: nowMs });
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("DELETE FROM verified_origins")) {
      const [originId, tenantId, cutoff] = values;
      const index = this.origins.findIndex((row) => row.origin_id === originId && row.tenant_id === tenantId &&
        (row.revoked_at_ms ?? row.expires_at_ms) <= cutoff &&
        !this.scanJobs.some((job) => job.tenant_id === tenantId && job.origin_id === originId));
      return this.deleteRow(index, this.origins, "origin", originId, tenantId);
    }
    if (sql.includes("DELETE FROM domain_challenges")) {
      const [challengeId, tenantId, expiryCutoff, issueCutoff] = values;
      const index = this.challenges.findIndex((row) => row.challenge_id === challengeId && row.tenant_id === tenantId &&
        row.expires_at_ms <= expiryCutoff && row.issued_at_ms <= issueCutoff &&
        !this.origins.some((origin) => origin.tenant_id === tenantId && origin.challenge_id === challengeId));
      return this.deleteRow(index, this.challenges, "challenge", challengeId, tenantId);
    }
    throw new Error("Unsupported fake domain-retention mutation");
  }

  deleteRow(index, rows, recordType, recordId, tenantId) {
    if (index < 0) return { success: true, meta: { changes: 0 } };
    if (!this.audit.some((entry) => entry.record_type === recordType && entry.record_id === recordId && entry.tenant_id === tenantId)) {
      throw new Error("domain metadata deletion audit required");
    }
    rows.splice(index, 1);
    return { success: true, meta: { changes: 1 } };
  }
}
