import { deleteExpiredDomainMetadata } from "./domain-retention.mjs";

const MAX_DOMAIN_METADATA_ROWS_PER_RUN = 24;

/** Run only when a retention period is explicitly configured and enabled. */
export async function runDomainMetadataRetentionIfEnabled(env, { nowMs = Date.now() } = {}) {
  if (env?.DOMAIN_METADATA_RETENTION_ENABLED !== "true") return { status: "disabled" };
  const configuredRetention = env.DOMAIN_METADATA_RETENTION_MS;
  const configuredAuditRetention = env.DOMAIN_DELETION_AUDIT_RETENTION_MS;
  const retentionMs = Number(configuredRetention);
  const auditRetentionMs = Number(configuredAuditRetention);
  if (!env.DB || typeof configuredRetention !== "string" || !/^[1-9]\d*$/.test(configuredRetention) ||
      !Number.isSafeInteger(retentionMs) || typeof configuredAuditRetention !== "string" ||
      !/^[1-9]\d*$/.test(configuredAuditRetention) || !Number.isSafeInteger(auditRetentionMs)) {
    throw new Error("Domain metadata retention requires D1 and approved positive data/audit retention windows");
  }
  const result = await deleteExpiredDomainMetadata(env.DB, {
    nowMs,
    retentionMs,
    auditRetentionMs,
    limit: MAX_DOMAIN_METADATA_ROWS_PER_RUN,
  });
  return { status: "completed", ...result };
}
