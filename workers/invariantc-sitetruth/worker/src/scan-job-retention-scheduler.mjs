import { deleteExpiredScanJobs } from "./scan-job-retention.mjs";

const MAX_SCAN_JOBS_PER_RUN = 25;

export async function runScanJobRetentionIfEnabled(env, { nowMs = Date.now() } = {}) {
  if (env?.SCAN_JOB_RETENTION_ENABLED !== "true") return { status: "disabled" };
  const configuredAuditRetention = env.SCAN_JOB_AUDIT_RETENTION_MS;
  const auditRetentionMs = Number(configuredAuditRetention);
  if (!env.DB || typeof configuredAuditRetention !== "string" || !/^[1-9]\d*$/.test(configuredAuditRetention) ||
      !Number.isSafeInteger(auditRetentionMs)) {
    throw new Error("Scan-job retention requires D1 and an approved positive audit retention window");
  }
  const result = await deleteExpiredScanJobs(env.DB, {
    nowMs,
    auditRetentionMs,
    limit: MAX_SCAN_JOBS_PER_RUN,
  });
  return { status: "completed", ...result };
}
