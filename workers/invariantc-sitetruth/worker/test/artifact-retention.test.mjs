import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteExpiredArtifacts } from "../src/artifact-retention.mjs";
import { MemoryRetentionDb } from "./fixtures/retention-db.mjs";

const now = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const id = (char) => char.repeat(22);
function artifact({ artifactId = id("a"), scanId = id("s"), tenantId = "tenant_1", expiresAtMs = now - 1 } = {}) {
  return {
    artifact_id: artifactId,
    tenant_id: tenantId,
    scan_id: scanId,
    object_key: `${tenantId}/${scanId}/${artifactId}.json`,
    expires_at_ms: expiresAtMs,
    deletion_attempts: 0,
    last_delete_attempt_ms: null,
    last_delete_error_code: null,
  };
}

function bucketFor(keys = []) {
  const objects = new Set(keys);
  const calls = { heads: [], deletes: [] };
  return {
    objects,
    calls,
    failDelete: false,
    async head(key) {
      calls.heads.push(key);
      return objects.has(key) ? { key } : null;
    },
    async delete(key) {
      calls.deletes.push(key);
      if (this.failDelete) throw new Error("synthetic R2 failure");
      objects.delete(key);
    },
  };
}

test("deletes expired R2 objects before their pointers and keeps only minimal audit data", async () => {
  const expired = artifact();
  const fresh = artifact({ artifactId: id("b"), scanId: id("t"), expiresAtMs: now + 1000 });
  const db = new MemoryRetentionDb({
    artifacts: [expired, fresh],
    jobs: [
      { scan_id: expired.scan_id, tenant_id: expired.tenant_id, created_at_ms: now - 2 * DAY, expires_at_ms: now - 1 },
      { scan_id: fresh.scan_id, tenant_id: fresh.tenant_id, created_at_ms: now - 2 * DAY, expires_at_ms: now + 1000 },
    ],
  });
  const bucket = bucketFor([expired.object_key, fresh.object_key]);

  const result = await deleteExpiredArtifacts(db, bucket, { nowMs: now, limit: 10 });

  assert.deepEqual(result, { attempted: 1, deleted: 1, failed: 0, more_due: false });
  assert.deepEqual(bucket.calls.deletes, [expired.object_key]);
  assert.equal(db.artifacts.length, 1);
  assert.equal(db.artifacts[0].artifact_id, fresh.artifact_id);
  assert.equal(db.jobs.some((job) => job.scan_id === expired.scan_id), false);
  assert.deepEqual(db.audit, [{ artifact_id: expired.artifact_id, tenant_id: expired.tenant_id, deleted_at_ms: now, attempts: 1 }]);
  assert.equal(Object.hasOwn(db.audit[0], "object_key"), false);
  assert.deepEqual(db.jobAudit, [{ scan_id: expired.scan_id, tenant_id: expired.tenant_id, deleted_at_ms: now }]);
});

test("artifact cleanup preserves a recent scan job for daily quota history", async () => {
  const row = artifact();
  const recentJob = {
    scan_id: row.scan_id,
    tenant_id: row.tenant_id,
    created_at_ms: now - 12 * 60 * 60 * 1000,
    expires_at_ms: now - 11 * 60 * 60 * 1000,
  };
  const db = new MemoryRetentionDb({ artifacts: [row], jobs: [recentJob] });
  const bucket = bucketFor([row.object_key]);

  const result = await deleteExpiredArtifacts(db, bucket, { nowMs: now });

  assert.deepEqual(result, { attempted: 1, deleted: 1, failed: 0, more_due: false });
  assert.equal(db.artifacts.length, 0);
  assert.deepEqual(db.jobs, [recentJob]);
  assert.equal(db.jobAudit.length, 0);
});

test("R2 failure preserves the pointer, records a bounded code, and retries later", async () => {
  const row = artifact();
  const db = new MemoryRetentionDb({ artifacts: [row] });
  const bucket = bucketFor([row.object_key]);
  bucket.failDelete = true;

  const failed = await deleteExpiredArtifacts(db, bucket, { nowMs: now });
  assert.deepEqual(failed, { attempted: 1, deleted: 0, failed: 1, more_due: true });
  assert.equal(db.artifacts[0].deletion_attempts, 1);
  assert.equal(db.artifacts[0].last_delete_error_code, "r2_delete_failed");
  assert.equal(db.audit.length, 0);

  bucket.failDelete = false;
  const retried = await deleteExpiredArtifacts(db, bucket, { nowMs: now + 1 });
  assert.deepEqual(retried, { attempted: 1, deleted: 1, failed: 0, more_due: false });
  assert.equal(db.audit[0].attempts, 2);
});

test("D1 finalization failure leaves the pointer so a missing R2 key can be safely finalized on retry", async () => {
  const row = artifact();
  const db = new MemoryRetentionDb({ artifacts: [row], jobs: [{ scan_id: row.scan_id, tenant_id: row.tenant_id, created_at_ms: now - 2 * DAY, expires_at_ms: now - 1 }] });
  const bucket = bucketFor([row.object_key]);
  db.failBatchAfter = 1;

  const failed = await deleteExpiredArtifacts(db, bucket, { nowMs: now });
  assert.deepEqual(failed, { attempted: 1, deleted: 0, failed: 1, more_due: true });
  assert.equal(bucket.objects.has(row.object_key), false);
  assert.equal(db.artifacts.length, 1);
  assert.equal(db.audit.length, 0);
  assert.equal(db.artifacts[0].last_delete_error_code, "db_finalize_failed");

  const retried = await deleteExpiredArtifacts(db, bucket, { nowMs: now + 1 });
  assert.deepEqual(retried, { attempted: 1, deleted: 1, failed: 0, more_due: false });
  assert.equal(bucket.calls.deletes.length, 1);
  assert.equal(db.audit[0].attempts, 2);
  assert.equal(db.jobs.length, 0);
});

test("rejects malformed object keys and invalid batch sizes without deleting", async () => {
  const row = artifact();
  row.object_key = "other-tenant/private/key.json";
  const db = new MemoryRetentionDb({ artifacts: [row] });
  const bucket = bucketFor([row.object_key]);
  const result = await deleteExpiredArtifacts(db, bucket, { nowMs: now });
  assert.deepEqual(result, { attempted: 1, deleted: 0, failed: 1, more_due: true });
  assert.equal(bucket.calls.heads.length, 0);
  assert.equal(db.artifacts[0].last_delete_error_code, "invalid_object_key");
  await assert.rejects(() => deleteExpiredArtifacts(db, bucket, { nowMs: now, limit: 101 }), RangeError);
});
