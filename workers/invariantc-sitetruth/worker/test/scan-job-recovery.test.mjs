import { test } from "node:test";
import assert from "node:assert/strict";
import { recoverStaleScanJobs } from "../src/scan-job-recovery.mjs";
import { runScanJobRecoveryIfEnabled } from "../src/scan-job-recovery-scheduler.mjs";
import { MemoryRetentionDb } from "./fixtures/retention-db.mjs";

const now = 2_000_000_000_000;
const HOUR = 60 * 60 * 1000;
const id = (char) => char.repeat(22);

function job(scanId, overrides = {}) {
  return {
    scan_id: scanId,
    tenant_id: "tenant_1",
    status: "queued",
    created_at_ms: now - 3 * HOUR,
    started_at_ms: null,
    run_budget_seconds: 60,
    ...overrides,
  };
}

test("scan-job recovery remains disabled and requires operator-approved windows", async () => {
  assert.deepEqual(await runScanJobRecoveryIfEnabled({}), { status: "disabled" });
  await assert.rejects(() => runScanJobRecoveryIfEnabled({
    SCAN_JOB_RECOVERY_ENABLED: "true", DB: new MemoryRetentionDb(),
  }), /D1 and explicit approved queue-age and running-grace windows/);
  await assert.rejects(() => runScanJobRecoveryIfEnabled({
    SCAN_JOB_RECOVERY_ENABLED: "true", SCAN_QUEUED_MAX_AGE_MS: "1000",
    DB: new MemoryRetentionDb(),
  }), /D1 and explicit approved queue-age and running-grace windows/);
  await assert.rejects(() => runScanJobRecoveryIfEnabled({
    SCAN_JOB_RECOVERY_ENABLED: "true", SCAN_QUEUED_MAX_AGE_MS: "0",
    SCAN_RUNNING_GRACE_MS: "0", DB: new MemoryRetentionDb(),
  }), /D1 and explicit approved queue-age and running-grace windows/);
});

test("recovers only queue-age and run-budget breaches with durable reasons", async () => {
  const abandonedQueue = job(id("a"));
  const freshQueue = job(id("b"), { created_at_ms: now - 30 * 60 * 1000 });
  const overBudget = job(id("c"), {
    status: "running", created_at_ms: now - 2 * HOUR,
    started_at_ms: now - 2 * HOUR, run_budget_seconds: 30 * 60,
  });
  const withinBudget = job(id("d"), {
    status: "running", created_at_ms: now - 15 * 60 * 1000,
    started_at_ms: now - 15 * 60 * 1000, run_budget_seconds: 20 * 60,
  });
  const terminal = job(id("e"), { status: "failed" });
  const db = new MemoryRetentionDb({ jobs: [abandonedQueue, freshQueue, overBudget, withinBudget, terminal] });

  const result = await runScanJobRecoveryIfEnabled({
    SCAN_JOB_RECOVERY_ENABLED: "true",
    SCAN_QUEUED_MAX_AGE_MS: String(HOUR),
    SCAN_RUNNING_GRACE_MS: String(5 * 60 * 1000),
    DB: db,
  }, { nowMs: now });

  assert.deepEqual(result, {
    status: "completed", recovered_queued: 1, recovered_running: 1, more_due: false,
  });
  assert.deepEqual(db.jobs.find((row) => row.scan_id === abandonedQueue.scan_id), {
    ...abandonedQueue, status: "failed", finished_at_ms: now, terminal_reason: "queue_timeout",
  });
  assert.equal(db.jobs.find((row) => row.scan_id === freshQueue.scan_id).status, "queued");
  assert.equal(db.jobs.find((row) => row.scan_id === overBudget.scan_id).status, "failed");
  assert.equal(db.jobs.find((row) => row.scan_id === overBudget.scan_id).terminal_reason, "run_budget_exceeded");
  assert.equal(db.jobs.find((row) => row.scan_id === withinBudget.scan_id).status, "running");
  assert.equal(db.jobs.find((row) => row.scan_id === terminal.scan_id).terminal_reason, undefined);
});

test("scan-job recovery processes a bounded batch and reports remaining work", async () => {
  const db = new MemoryRetentionDb({
    jobs: Array.from({ length: 5 }, (_, index) => job(id(String.fromCharCode(102 + index)))),
  });
  const result = await recoverStaleScanJobs(db, {
    nowMs: now, queuedMaxAgeMs: HOUR, runningGraceMs: 0, limit: 2,
  });
  assert.deepEqual(result, { recovered_queued: 2, recovered_running: 0, more_due: true });
  assert.equal(db.jobs.filter((row) => row.status === "queued").length, 3);
  assert.equal(db.jobs.filter((row) => row.terminal_reason === "queue_timeout").length, 2);
});

test("recovery validates windows and run limits", async () => {
  const db = new MemoryRetentionDb();
  await assert.rejects(() => recoverStaleScanJobs(db, { nowMs: now, queuedMaxAgeMs: 0, runningGraceMs: 0 }), RangeError);
  await assert.rejects(() => recoverStaleScanJobs(db, { nowMs: now, queuedMaxAgeMs: HOUR, runningGraceMs: -1 }), RangeError);
  await assert.rejects(() => recoverStaleScanJobs(db, { nowMs: now, queuedMaxAgeMs: HOUR, runningGraceMs: 0, limit: 26 }), RangeError);
});
