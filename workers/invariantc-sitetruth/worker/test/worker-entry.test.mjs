import { test } from "node:test";
import assert from "node:assert/strict";
import { runScheduledMaintenance } from "../src/scheduled.mjs";

test("scheduled maintenance remains inert when hosted and retention flags are disabled", async () => {
  const result = await runScheduledMaintenance({ scheduledTime: 1_800_000_000_000 }, {
    ARTIFACT_RETENTION_ENABLED: "false",
    DOMAIN_METADATA_RETENTION_ENABLED: "false",
    SCAN_JOB_RETENTION_ENABLED: "false",
  });
  assert.deepEqual(result, {
    scanJobRecovery: { status: "disabled" },
    artifacts: { status: "disabled" },
    scanJobs: { status: "disabled" },
    domainMetadata: { status: "disabled" },
    scanOutbox: { status: "disabled" },
  });
});
