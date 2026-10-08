export class MemoryRetentionDb {
  constructor({ artifacts = [], jobs = [], payloadAudits = [] } = {}) {
    this.artifacts = structuredClone(artifacts);
    this.jobs = structuredClone(jobs);
    this.audit = [];
    this.jobAudit = [];
    this.payloadAudit = structuredClone(payloadAudits);
    this.failBatchAfter = null;
  }

  prepare(sql) {
    const db = this;
    return {
      bind(...values) {
        return {
          sql,
          values,
          all: () => db.all(sql, values),
          first: () => db.first(sql, values),
          run: () => db.run(sql, values),
        };
      },
    };
  }

  async all(sql, values) {
    if (sql.includes("FROM scan_jobs") && sql.includes("ORDER BY CASE WHEN status = 'queued'")) {
      const [queueCutoff, runningGraceMs, nowMs, queuedMaxAgeMs, orderGraceMs, limit] = values;
      const candidates = this.jobs.filter((job) =>
        (job.status === "queued" && job.created_at_ms <= queueCutoff) ||
        (job.status === "running" && Number.isSafeInteger(job.started_at_ms) &&
          job.started_at_ms + job.run_budget_seconds * 1000 + runningGraceMs <= nowMs));
      return {
        results: candidates
          .sort((a, b) => {
            const aDeadline = a.status === "queued" ? a.created_at_ms + queuedMaxAgeMs : a.started_at_ms + a.run_budget_seconds * 1000 + orderGraceMs;
            const bDeadline = b.status === "queued" ? b.created_at_ms + queuedMaxAgeMs : b.started_at_ms + b.run_budget_seconds * 1000 + orderGraceMs;
            return aDeadline - bDeadline;
          })
          .slice(0, limit)
          .map(({ scan_id, tenant_id, status, created_at_ms, started_at_ms, run_budget_seconds }) =>
            ({ scan_id, tenant_id, status, created_at_ms, started_at_ms, run_budget_seconds })),
      };
    }
    if (sql.includes("FROM scan_jobs") && sql.includes("ORDER BY expires_at_ms")) {
      const [nowMs, quotaHistoryCutoff, limit] = values;
      return {
        results: this.jobs.filter((job) => job.expires_at_ms <= nowMs &&
          job.created_at_ms <= quotaHistoryCutoff &&
          ["succeeded", "failed", "cancelled"].includes(job.status ?? "succeeded") &&
          !this.artifacts.some((artifact) => artifact.scan_id === job.scan_id && artifact.tenant_id === job.tenant_id))
          .sort((a, b) => a.expires_at_ms - b.expires_at_ms)
          .slice(0, limit)
          .map(({ scan_id, tenant_id, created_at_ms, expires_at_ms }) => ({ scan_id, tenant_id, created_at_ms, expires_at_ms })),
      };
    }
    if (sql.includes("FROM scan_artifacts") && sql.includes("ORDER BY expires_at_ms")) {
      const [nowMs, limit] = values;
      return {
        results: this.artifacts
          .filter((artifact) => artifact.expires_at_ms <= nowMs)
          .sort((a, b) => a.expires_at_ms - b.expires_at_ms || a.artifact_id.localeCompare(b.artifact_id))
          .slice(0, limit)
          .map(({ artifact_id, tenant_id, scan_id, object_key, expires_at_ms }) => ({ artifact_id, tenant_id, scan_id, object_key, expires_at_ms })),
      };
    }
    if (sql.includes("FROM scan_job_deletion_audit")) {
      const [nowMs, limit] = values;
      return { results: this.jobAudit.filter((row) => row.deleted_at_ms <= nowMs)
        .sort((a, b) => a.deleted_at_ms - b.deleted_at_ms)
        .slice(0, limit)
        .map(({ scan_id }) => ({ scan_id })) };
    }
    if (sql.includes("FROM scan_payload_deletion_audit")) {
      const [cutoff, limit] = values;
      return { results: this.payloadAudit.filter((row) => row.deleted_at_ms <= cutoff)
        .sort((a, b) => a.deleted_at_ms - b.deleted_at_ms)
        .slice(0, limit)
        .map(({ scan_id }) => ({ scan_id })) };
    }
    throw new Error("Unsupported fake D1 list query");
  }

  async first(sql, values) {
    if (sql.includes("SELECT artifact_id FROM scan_artifacts")) {
      const row = this.artifacts.find((artifact) => artifact.artifact_id === values[0]);
      return row ? { artifact_id: row.artifact_id } : null;
    }
    if (sql.includes("SELECT 1 AS present FROM scan_artifacts")) {
      return this.artifacts.some((artifact) => artifact.expires_at_ms <= values[0]) ? { present: 1 } : null;
    }
    if (sql.includes("FROM scan_jobs") && sql.includes("status = 'queued'") && sql.includes("status = 'running'")) {
      const [queueCutoff, runningGraceMs, nowMs] = values;
      return this.jobs.some((job) =>
        (job.status === "queued" && job.created_at_ms <= queueCutoff) ||
        (job.status === "running" && Number.isSafeInteger(job.started_at_ms) &&
          job.started_at_ms + job.run_budget_seconds * 1000 + runningGraceMs <= nowMs))
        ? { present: 1 }
        : null;
    }
    if (sql.includes("FROM scan_jobs")) {
      const [nowMs, quotaHistoryCutoff] = values;
      return this.jobs.some((job) => job.expires_at_ms <= nowMs &&
        job.created_at_ms <= quotaHistoryCutoff &&
        ["succeeded", "failed", "cancelled"].includes(job.status ?? "succeeded") &&
        !this.artifacts.some((artifact) => artifact.scan_id === job.scan_id && artifact.tenant_id === job.tenant_id))
        ? { present: 1 }
        : null;
    }
    if (sql.includes("FROM scan_job_deletion_audit")) {
      return this.jobAudit.some((row) => row.deleted_at_ms <= values[0]) ? { present: 1 } : null;
    }
    if (sql.includes("FROM scan_payload_deletion_audit")) {
      return this.payloadAudit.some((row) => row.deleted_at_ms <= values[0]) ? { present: 1 } : null;
    }
    throw new Error("Unsupported fake D1 first query");
  }

  async run(sql, values) {
    if (sql.includes("SET deletion_attempts = deletion_attempts + 1")) {
      const [nowMs, artifactId] = values;
      const row = this.artifacts.find((artifact) => artifact.artifact_id === artifactId && artifact.expires_at_ms <= nowMs);
      if (!row) return { success: true, meta: { changes: 0 } };
      row.deletion_attempts += 1;
      row.last_delete_attempt_ms = nowMs;
      row.last_delete_error_code = null;
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("SET last_delete_error_code =")) {
      const [code, artifactId, nowMs] = values;
      const row = this.artifacts.find((artifact) => artifact.artifact_id === artifactId && artifact.expires_at_ms <= nowMs);
      if (!row) return { success: true, meta: { changes: 0 } };
      row.last_delete_error_code = code;
      return { success: true, meta: { changes: 1 } };
    }
    throw new Error("Unsupported fake D1 mutation");
  }

  async batch(statements) {
    const snapshot = structuredClone({ artifacts: this.artifacts, jobs: this.jobs, audit: this.audit, jobAudit: this.jobAudit, payloadAudit: this.payloadAudit });
    try {
      const results = [];
      for (const [index, statement] of statements.entries()) {
        results.push(await this.runBatchStatement(statement.sql, statement.values));
        if (this.failBatchAfter === index + 1) {
          this.failBatchAfter = null;
          throw new Error("synthetic transactional finalize failure");
        }
      }
      return results;
    } catch (error) {
      this.artifacts = snapshot.artifacts;
      this.jobs = snapshot.jobs;
      this.audit = snapshot.audit;
      this.jobAudit = snapshot.jobAudit;
      this.payloadAudit = snapshot.payloadAudit;
      throw error;
    }
  }

  async runBatchStatement(sql, values) {
    if (sql.includes("UPDATE scan_jobs") && sql.includes("terminal_reason = 'queue_timeout'")) {
      const [nowMs, scanId, tenantId, queueCutoff] = values;
      const job = this.jobs.find((row) => row.scan_id === scanId && row.tenant_id === tenantId &&
        row.status === "queued" && row.created_at_ms <= queueCutoff);
      if (!job) return { success: true, meta: { changes: 0 } };
      job.status = "failed";
      job.finished_at_ms = nowMs;
      job.terminal_reason = "queue_timeout";
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE scan_jobs") && sql.includes("terminal_reason = 'run_budget_exceeded'")) {
      const [nowMs, scanId, tenantId, startedAtMs, runBudgetSeconds, runningGraceMs, cutoff] = values;
      const job = this.jobs.find((row) => row.scan_id === scanId && row.tenant_id === tenantId &&
        row.status === "running" && row.started_at_ms === startedAtMs && row.run_budget_seconds === runBudgetSeconds &&
        row.started_at_ms + row.run_budget_seconds * 1000 + runningGraceMs <= cutoff);
      if (!job) return { success: true, meta: { changes: 0 } };
      job.status = "failed";
      job.finished_at_ms = nowMs;
      job.terminal_reason = "run_budget_exceeded";
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO scan_job_deletion_audit")) {
      const [deletedAtMs, scanId, tenantId, nowMs, quotaHistoryCutoff] = values;
      const job = this.jobs.find((row) => row.scan_id === scanId && row.tenant_id === tenantId &&
        row.expires_at_ms <= nowMs && ["succeeded", "failed", "cancelled"].includes(row.status ?? "succeeded") &&
        row.created_at_ms <= quotaHistoryCutoff &&
        !this.artifacts.some((artifact) => artifact.scan_id === scanId && artifact.tenant_id === tenantId));
      if (!job || this.jobAudit.some((row) => row.scan_id === scanId)) {
        return { success: true, meta: { changes: 0 } };
      }
      this.jobAudit.push({ scan_id: scanId, tenant_id: tenantId, deleted_at_ms: deletedAtMs });
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("DELETE FROM scan_job_deletion_audit")) {
      const [scanId, cutoff] = values;
      const index = this.jobAudit.findIndex((row) => row.scan_id === scanId && row.deleted_at_ms <= cutoff);
      if (index < 0) return { success: true, meta: { changes: 0 } };
      this.jobAudit.splice(index, 1);
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("DELETE FROM scan_payload_deletion_audit")) {
      const [scanId, cutoff] = values;
      const index = this.payloadAudit.findIndex((row) => row.scan_id === scanId && row.deleted_at_ms <= cutoff);
      if (index < 0) return { success: true, meta: { changes: 0 } };
      this.payloadAudit.splice(index, 1);
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("DELETE FROM scan_jobs")) {
      const [scanId, tenantId, nowMs, quotaHistoryCutoff] = values;
      const hasArtifact = this.artifacts.some((row) => row.scan_id === scanId && row.tenant_id === tenantId);
      const index = this.jobs.findIndex((row) => row.scan_id === scanId && row.tenant_id === tenantId &&
        row.expires_at_ms <= nowMs && row.created_at_ms <= quotaHistoryCutoff &&
        ["succeeded", "failed", "cancelled"].includes(row.status ?? "succeeded") && !hasArtifact);
      if (index < 0) return { success: true, meta: { changes: 0 } };
      if (!this.jobAudit.some((row) => row.scan_id === scanId && row.tenant_id === tenantId && row.deleted_at_ms >= this.jobs[index].expires_at_ms)) {
        throw new Error("scan job deletion audit required");
      }
      if (!this.jobAudit.some((row) => row.scan_id === scanId && row.tenant_id === tenantId &&
          row.deleted_at_ms >= this.jobs[index].created_at_ms + 24 * 60 * 60 * 1000)) {
        throw new Error("scan job quota history window has not elapsed");
      }
      this.jobs.splice(index, 1);
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO scan_artifact_deletion_audit")) {
      const [deletedAtMs, artifactId, nowMs] = values;
      const artifact = this.artifacts.find((row) => row.artifact_id === artifactId && row.expires_at_ms <= nowMs);
      if (!artifact || this.audit.some((row) => row.artifact_id === artifactId)) {
        return { success: true, meta: { changes: 0 } };
      }
      this.audit.push({ artifact_id: artifactId, tenant_id: artifact.tenant_id, deleted_at_ms: deletedAtMs, attempts: artifact.deletion_attempts });
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("DELETE FROM scan_artifacts")) {
      const [artifactId, nowMs] = values;
      const index = this.artifacts.findIndex((row) => row.artifact_id === artifactId && row.expires_at_ms <= nowMs);
      if (index < 0) return { success: true, meta: { changes: 0 } };
      if (!this.audit.some((row) => row.artifact_id === artifactId && row.tenant_id === this.artifacts[index].tenant_id)) {
        throw new Error("audit required before artifact deletion");
      }
      this.artifacts.splice(index, 1);
      return { success: true, meta: { changes: 1 } };
    }
    throw new Error("Unsupported fake D1 batch mutation");
  }
}
