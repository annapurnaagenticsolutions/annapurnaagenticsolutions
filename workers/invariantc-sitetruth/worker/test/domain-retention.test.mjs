import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteExpiredDomainMetadata } from "../src/domain-retention.mjs";
import { runDomainMetadataRetentionIfEnabled } from "../src/domain-retention-scheduler.mjs";
import { MemoryDomainRetentionDb } from "./fixtures/domain-retention-db.mjs";

const now = 2_000_000_000_000;
const id = (char) => char.repeat(22);
const DAY = 24 * 60 * 60 * 1000;

function challenge(challengeId, issuedAt, consumedAt = null) {
  return {
    challenge_id: challengeId,
    tenant_id: "tenant_1",
    hostname_ascii: `${challengeId[0]}.example.com`,
    token_sha256: "a".repeat(64),
    issued_at_ms: issuedAt,
    expires_at_ms: issuedAt + 15 * 60 * 1000,
    consumed_at_ms: consumedAt,
  };
}

function origin(originId, challengeId, terminalAt, revokedAt = null) {
  return {
    origin_id: originId,
    tenant_id: "tenant_1",
    hostname_ascii: `${originId[0]}.example.com`,
    origin: `https://${originId[0]}.example.com`,
    challenge_id: challengeId,
    verified_at_ms: terminalAt - DAY,
    expires_at_ms: revokedAt === null ? terminalAt : terminalAt + DAY,
    revoked_at_ms: revokedAt,
  };
}

test("domain metadata retention stays off without the exact flag and requires D1 plus an explicit window", async () => {
  assert.deepEqual(await runDomainMetadataRetentionIfEnabled({}), { status: "disabled" });
  assert.deepEqual(await runDomainMetadataRetentionIfEnabled({ DOMAIN_METADATA_RETENTION_ENABLED: "false" }), { status: "disabled" });
  await assert.rejects(() => runDomainMetadataRetentionIfEnabled({
    DOMAIN_METADATA_RETENTION_ENABLED: "true", DB: {},
  }), /D1 and approved positive data\/audit retention windows/);
  await assert.rejects(() => runDomainMetadataRetentionIfEnabled({
    DOMAIN_METADATA_RETENTION_ENABLED: "true", DOMAIN_METADATA_RETENTION_MS: "1e6", DB: new MemoryDomainRetentionDb(),
  }), /D1 and approved positive data\/audit retention windows/);
  await assert.rejects(() => deleteExpiredDomainMetadata(new MemoryDomainRetentionDb(), {
    nowMs: now, retentionMs: DAY,
  }), /auditRetentionMs/);
});

test("domain cleanup is bounded, audited, preserves quota history and respects scan references", async () => {
  const oldIssuedAt = now - 12 * DAY;
  const linkedChallengeId = id("c");
  const standaloneChallengeId = id("d");
  const recentChallengeId = id("e");
  const heldOriginId = id("f");
  const linkedOriginId = id("g");
  const heldByJobOriginId = id("h");
  const db = new MemoryDomainRetentionDb({
    challenges: [
      challenge(linkedChallengeId, oldIssuedAt, oldIssuedAt + 1000),
      challenge(standaloneChallengeId, oldIssuedAt),
      challenge(recentChallengeId, now - 12 * 60 * 60 * 1000),
      challenge(id("i"), now - 20 * DAY),
    ],
    origins: [
      origin(heldOriginId, id("i"), now - 6 * DAY),
      origin(linkedOriginId, linkedChallengeId, now - 8 * DAY),
      origin(heldByJobOriginId, id("j"), now - 9 * DAY),
    ],
    scanJobs: [{ tenant_id: "tenant_1", origin_id: heldByJobOriginId }],
  });

  const first = await runDomainMetadataRetentionIfEnabled({
    DOMAIN_METADATA_RETENTION_ENABLED: "true",
    DOMAIN_METADATA_RETENTION_MS: String(7 * DAY),
    DOMAIN_DELETION_AUDIT_RETENTION_MS: String(30 * DAY),
    DB: db,
  }, { nowMs: now });
  assert.deepEqual(first, {
    status: "completed", origins_deleted: 1, challenges_deleted: 1, audit_rows_deleted: 0, more_due: true,
  });
  assert.equal(db.origins.some((row) => row.origin_id === heldOriginId), true);
  assert.equal(db.origins.some((row) => row.origin_id === heldByJobOriginId), true);
  assert.equal(db.challenges.some((row) => row.challenge_id === recentChallengeId), true);
  assert.equal(db.challenges.some((row) => row.challenge_id === linkedChallengeId), true);

  const second = await deleteExpiredDomainMetadata(db, {
    nowMs: now + 1, retentionMs: 7 * DAY, auditRetentionMs: 30 * DAY,
  });
  assert.deepEqual(second, { origins_deleted: 0, challenges_deleted: 1, audit_rows_deleted: 0, more_due: false });
  assert.equal(db.challenges.some((row) => row.challenge_id === linkedChallengeId), false);
  assert.deepEqual(db.audit.map(({ record_type, record_id }) => [record_type, record_id]).sort(), [
    ["challenge", standaloneChallengeId],
    ["challenge", linkedChallengeId],
    ["origin", linkedOriginId],
  ].sort());
  assert.equal(db.audit.every((row) => Object.keys(row).sort().join(",") === "deleted_at_ms,record_id,record_type,tenant_id"), true);
});

test("domain metadata cleanup rejects bad windows and reports pending bounded batches", async () => {
  for (const retentionMs of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(() => deleteExpiredDomainMetadata(new MemoryDomainRetentionDb(), {
      nowMs: now, retentionMs, auditRetentionMs: DAY,
    }), /retentionMs/);
  }
  const db = new MemoryDomainRetentionDb({
    challenges: Array.from({ length: 20 }, (_, index) => challenge(id(String.fromCharCode(97 + index)), now - 30 * DAY)),
  });
  const result = await deleteExpiredDomainMetadata(db, {
    nowMs: now, retentionMs: DAY, auditRetentionMs: DAY, limit: 4,
  });
  assert.equal(result.challenges_deleted, 4);
  assert.equal(result.more_due, true);
});

test("audit evidence expires only after its separately configured retention window", async () => {
  const db = new MemoryDomainRetentionDb();
  db.audit.push({ record_type: "origin", record_id: id("x"), tenant_id: "tenant_1", deleted_at_ms: now - 10 * DAY });
  const result = await deleteExpiredDomainMetadata(db, {
    nowMs: now, retentionMs: DAY, auditRetentionMs: 7 * DAY,
  });
  assert.equal(result.audit_rows_deleted, 1);
  assert.equal(db.audit.length, 0);
});
