import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteExpiredScanJobs } from "../src/scan-job-retention.mjs";
import { runScanJobRetentionIfEnabled } from "../src/scan-job-retention-scheduler.mjs";
import { MemoryRetentionDb } from "./fixtures/retention-db.mjs";

const now = 2_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const id = (char) => char.repeat(22);

function job(scanId, { createdAtMs = now - 2 * DAY, expiresAtMs = now - 1, status = "succeeded" } = {}) {
  return { scan_id: scanId, tenant_id: "tenant_1", created_at_ms: createdAtMs, expires_at_ms: expiresAtMs, status };
}

test("scan-job retention remains disabled and requires an explicit audit window", async () => {
  assert.deepEqual(await runScanJobRetentionIfEnabled({}), { status: "disabled" });
  await assert.rejects(() => runScanJobRetentionIfEnabled({
    SCAN_JOB_RETENTION_ENABLED: "true", DB: new MemoryRetentionDb(),
  }), /D1 and an approved positive audit retention window/);
  await assert.rejects(() => runScanJobRetentionIfEnabled({
    SCAN_JOB_RETENTION_ENABLED: "true", SCAN_JOB_AUDIT_RETENTION_MS: "2e6", DB: new MemoryRetentionDb(),
  }), /D1 and an approved positive audit retention window/);
});

test("removes only expired terminal jobs without artifacts and records minimal audit", async () => {
  const expired = job(id("a"));
  const db = new MemoryRetentionDb({
    jobs: [
      expired,
      job(id("b"), { expiresAtMs: now + DAY }),
      job(id("c"), { status: "running" }),
      job(id("d")),
      job(id("e"), { createdAtMs: now - 12 * 60 * 60 * 1000, expiresAtMs: now - 11 * 60 * 60 * 1000 }),
    ],
    artifacts: [{ scan_id: id("d"), tenant_id: "tenant_1", expires_at_ms: now - 1 }],
  });
  const result = await runScanJobRetentionIfEnabled({
    SCAN_JOB_RETENTION_ENABLED: "true",
    SCAN_JOB_AUDIT_RETENTION_MS: String(30 * DAY),
    DB: db,
  }, { nowMs: now });

  assert.deepEqual(result, { status: "completed", deleted: 1, audit_rows_deleted: 0, payload_audit_rows_deleted: 0, more_due: false });
  assert.equal(db.jobs.some((row) => row.scan_id === expired.scan_id), false);
  assert.equal(db.jobs.some((row) => row.scan_id === id("b")), true);
  assert.equal(db.jobs.some((row) => row.scan_id === id("c")), true);
  assert.equal(db.jobs.some((row) => row.scan_id === id("d")), true);
  assert.equal(db.jobs.some((row) => row.scan_id === id("e")), true, "recent scan remains for daily quota history");
  assert.deepEqual(db.jobAudit, [{ scan_id: expired.scan_id, tenant_id: expired.tenant_id, deleted_at_ms: now }]);
});

test("scan-job deletion audits expire only after the separately configured window", async () => {
  const db = new MemoryRetentionDb();
  db.jobAudit.push({ scan_id: id("x"), tenant_id: "tenant_1", deleted_at_ms: now - 10 * DAY });
  const result = await deleteExpiredScanJobs(db, { nowMs: now, auditRetentionMs: 7 * DAY });
  assert.deepEqual(result, { deleted: 0, audit_rows_deleted: 1, payload_audit_rows_deleted: 0, more_due: false });
  assert.equal(db.jobAudit.length, 0);
});

test("encrypted-payload deletion evidence expires under the same approved audit window", async () => {
  const db = new MemoryRetentionDb({ payloadAudits: [
    { scan_id: id("p"), tenant_id: "tenant_1", deleted_at_ms: now - 10 * DAY, reason: "job_terminal" },
    { scan_id: id("q"), tenant_id: "tenant_1", deleted_at_ms: now - 2 * DAY, reason: "job_terminal" },
  ] });
  const result = await deleteExpiredScanJobs(db, { nowMs: now, auditRetentionMs: 7 * DAY });
  assert.deepEqual(result, { deleted: 0, audit_rows_deleted: 0, payload_audit_rows_deleted: 1, more_due: false });
  assert.deepEqual(db.payloadAudit.map((row) => row.scan_id), [id("q")]);
});

test("expired scan-job cleanup is bounded per run", async () => {
  const db = new MemoryRetentionDb({
    jobs: Array.from({ length: 5 }, (_, index) => job(id(String.fromCharCode(97 + index)))),
  });
  const result = await deleteExpiredScanJobs(db, { nowMs: now, auditRetentionMs: DAY, limit: 2 });
  assert.equal(result.deleted, 2);
  assert.equal(result.more_due, true);
  assert.equal(db.jobs.length, 3);
});

test("does not erase a terminal job inside the daily quota history window", async () => {
  const recent = job(id("r"), {
    createdAtMs: now - 12 * 60 * 60 * 1000,
    expiresAtMs: now - 11 * 60 * 60 * 1000,
  });
  const db = new MemoryRetentionDb({ jobs: [recent] });

  const result = await deleteExpiredScanJobs(db, { nowMs: now, auditRetentionMs: DAY });

  assert.deepEqual(result, { deleted: 0, audit_rows_deleted: 0, payload_audit_rows_deleted: 0, more_due: false });
  assert.deepEqual(db.jobs, [recent]);
  assert.equal(db.jobAudit.length, 0);
});
