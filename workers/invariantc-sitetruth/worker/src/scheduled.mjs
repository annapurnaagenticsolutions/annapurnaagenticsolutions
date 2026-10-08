import { runArtifactRetentionIfEnabled } from "./retention-scheduler.mjs";
import { runDomainMetadataRetentionIfEnabled } from "./domain-retention-scheduler.mjs";
import { runScanJobRetentionIfEnabled } from "./scan-job-retention-scheduler.mjs";
import { runScanJobRecoveryIfEnabled } from "./scan-job-recovery-scheduler.mjs";
import { runScanOutboxDispatchIfEnabled } from "./scan-outbox-scheduler.mjs";

export async function runScheduledMaintenance(controller, env) {
  const options = { nowMs: controller.scheduledTime };
  const recoveryResult = await Promise.resolve()
    .then(() => runScanJobRecoveryIfEnabled(env, options))
    .then((value) => ({ status: "fulfilled", value }), (reason) => ({ status: "rejected", reason }));
  const results = await Promise.allSettled([
    runArtifactRetentionIfEnabled(env, options),
    runScanJobRetentionIfEnabled(env, options),
    runDomainMetadataRetentionIfEnabled(env, options),
    runScanOutboxDispatchIfEnabled(env, options),
  ]);
  if (recoveryResult.status === "rejected") throw recoveryResult.reason;
  const failure = results.find((result) => result.status === "rejected");
  if (failure) throw failure.reason;
  const [artifacts, scanJobs, domainMetadata, scanOutbox] = results.map((result) => result.value);
  return { scanJobRecovery: recoveryResult.value, artifacts, scanJobs, domainMetadata, scanOutbox };
}
