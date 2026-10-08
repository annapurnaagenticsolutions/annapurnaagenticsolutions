import { recoverStaleScanJobs } from "./scan-job-recovery.mjs";

const MAX_SCAN_JOB_RECOVERIES_PER_RUN = 25;

function parsePositiveWindow(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseNonNegativeWindow(value) {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function runScanJobRecoveryIfEnabled(env, { nowMs = Date.now() } = {}) {
  if (env?.SCAN_JOB_RECOVERY_ENABLED !== "true") return { status: "disabled" };
  const queuedMaxAgeMs = parsePositiveWindow(env.SCAN_QUEUED_MAX_AGE_MS);
  const runningGraceMs = parseNonNegativeWindow(env.SCAN_RUNNING_GRACE_MS);
  if (!env.DB || queuedMaxAgeMs === null || runningGraceMs === null) {
    throw new Error("Scan-job recovery requires D1 and explicit approved queue-age and running-grace windows");
  }
  const result = await recoverStaleScanJobs(env.DB, {
    nowMs,
    queuedMaxAgeMs,
    runningGraceMs,
    limit: MAX_SCAN_JOB_RECOVERIES_PER_RUN,
  });
  return { status: "completed", ...result };
}
