import { deleteExpiredArtifacts } from "./artifact-retention.mjs";

const MAX_ARTIFACTS_PER_RUN = 25;

/**
 * Run one bounded retention batch when the operator explicitly enables it and
 * both required bindings exist. The staging config intentionally has neither
 * the R2 binding nor a Cron Trigger, so this entrypoint remains inert there.
 */
export async function runArtifactRetentionIfEnabled(env, { nowMs = Date.now() } = {}) {
  if (env?.ARTIFACT_RETENTION_ENABLED !== "true") return { status: "disabled" };
  if (!env.DB || !env.SCAN_ARTIFACTS) {
    throw new Error("Artifact retention is enabled but D1/R2 bindings are unavailable");
  }

  const result = await deleteExpiredArtifacts(env.DB, env.SCAN_ARTIFACTS, {
    nowMs,
    limit: MAX_ARTIFACTS_PER_RUN,
  });
  return { status: "completed", ...result };
}
