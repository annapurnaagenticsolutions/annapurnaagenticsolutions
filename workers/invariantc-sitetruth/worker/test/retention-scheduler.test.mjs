import { test } from "node:test";
import assert from "node:assert/strict";
import { runArtifactRetentionIfEnabled } from "../src/retention-scheduler.mjs";
import { MemoryRetentionDb } from "./fixtures/retention-db.mjs";

const now = 1_800_000_000_000;
const id = (char) => char.repeat(22);

function artifact() {
  const tenantId = "tenant_1";
  const scanId = id("s");
  const artifactId = id("a");
  return {
    artifact_id: artifactId,
    tenant_id: tenantId,
    scan_id: scanId,
    object_key: `${tenantId}/${scanId}/${artifactId}.json`,
    expires_at_ms: now - 1,
    deletion_attempts: 0,
    last_delete_attempt_ms: null,
    last_delete_error_code: null,
  };
}

function fakeBucket(objectKey) {
  const objects = new Set([objectKey]);
  const calls = [];
  return {
    objects,
    calls,
    async head(key) { return objects.has(key) ? { key } : null; },
    async delete(key) { calls.push(key); objects.delete(key); },
  };
}

test("scheduled retention stays inert unless the exact enable flag is set", async () => {
  assert.deepEqual(await runArtifactRetentionIfEnabled({ ARTIFACT_RETENTION_ENABLED: "false" }), { status: "disabled" });
  assert.deepEqual(await runArtifactRetentionIfEnabled({}), { status: "disabled" });
});

test("enabled retention fails closed if either storage binding is missing", async () => {
  await assert.rejects(
    () => runArtifactRetentionIfEnabled({ ARTIFACT_RETENTION_ENABLED: "true", DB: {} }),
    /D1\/R2 bindings are unavailable/,
  );
});

test("enabled retention executes one bounded batch and returns only aggregate counts", async () => {
  const row = artifact();
  const db = new MemoryRetentionDb({ artifacts: [row] });
  const bucket = fakeBucket(row.object_key);
  const result = await runArtifactRetentionIfEnabled({
    ARTIFACT_RETENTION_ENABLED: "true",
    DB: db,
    SCAN_ARTIFACTS: bucket,
  }, { nowMs: now });

  assert.deepEqual(result, { status: "completed", attempted: 1, deleted: 1, failed: 0, more_due: false });
  assert.deepEqual(bucket.calls, [row.object_key]);
  assert.equal(db.artifacts.length, 0);
  assert.equal(Object.hasOwn(result, "object_key"), false);
});
