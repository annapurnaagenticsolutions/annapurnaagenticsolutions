import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  claimScanJobForExecution,
  getScanNavigationGrant,
} from "../src/scan-job-authorization.mjs";
import { suspendTenantAndCancelActiveScans } from "../src/tenant-suspension.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const now = 1_800_000_000_000;

class SqliteD1Statement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.values = []; }
  bind(...values) { this.values = values; return this; }
  async run() {
    const result = this.db.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
  async first() { return this.db.prepare(this.sql).get(...this.values) ?? null; }
}

function d1(db) {
  return {
    prepare: (sql) => new SqliteD1Statement(db, sql),
    async batch(statements) {
      db.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

async function freshDb(t) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const migration of [
    "0001_tenant_api.sql",
    "0002_domain_verification.sql",
    "0003_scan_retention.sql",
    "0004_domain_metadata_retention.sql",
    "0005_scan_job_deletion_audit.sql",
    "0006_scan_job_recovery_reason.sql",
    "0007_cancel_scans_on_access_revocation.sql",
    "0008_scan_job_dispatch_outbox.sql",
  ]) {
    db.exec(await readFile(join(root, "migrations", migration), "utf8"));
  }
  t.after(() => db.close());
  return db;
}

function addTenant(db, tenantId, { status = "active", concurrency = 3 } = {}) {
  db.prepare(`INSERT INTO tenants
    (tenant_id,status,requests_per_minute,requests_per_day,max_concurrent,created_at_ms)
    VALUES (?,?,60,100,?,?)`).run(tenantId, status, concurrency, now);
  db.prepare(`INSERT INTO scan_policies
    (tenant_id,scan_requests_per_minute,scans_per_day,max_concurrent_scans,max_pages_per_scan,
     max_run_seconds,max_report_bytes,artifact_retention_days,updated_at_ms)
    VALUES (?,20,20,?,5,120,262144,7,?)`).run(tenantId, concurrency, now);
}

function addOrigin(db, tenantId, originId, challengeId, { expiresAt = now + 60_000 } = {}) {
  const issued = now - 10;
  const verified = issued + 1;
  db.prepare(`INSERT INTO domain_challenges
    (challenge_id,tenant_id,hostname_ascii,token_sha256,issued_at_ms,expires_at_ms,consumed_at_ms)
    VALUES (?,?,'owned.example.com',?, ?, ?, ?)`)
    .run(challengeId, tenantId, "a".repeat(64), issued, issued + 900_000, verified);
  db.prepare(`INSERT INTO verified_origins
    (origin_id,tenant_id,hostname_ascii,origin,challenge_id,verified_at_ms,expires_at_ms)
    VALUES (?,?,'owned.example.com','https://owned.example.com',?,?,?)`)
    .run(originId, tenantId, challengeId, verified, expiresAt);
}

function addJob(db, scanId, tenantId, originId, createdAt = now) {
  db.prepare(`INSERT INTO scan_jobs
    (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,page_limit,run_budget_seconds,
     status,created_at_ms,expires_at_ms)
    VALUES (?,?,?, ?, ?,2,60,'queued',?,?)`)
    .run(scanId, tenantId, originId, `idempotency-${scanId}`, "b".repeat(64), createdAt, createdAt + 7 * 86_400_000);
}

test("claims one job only under active tenant and fresh origin, then rechecks navigation authority", async (t) => {
  const db = await freshDb(t);
  addTenant(db, "tenant_a");
  addOrigin(db, "tenant_a", "o".repeat(22), "c".repeat(22));
  addJob(db, "s".repeat(22), "tenant_a", "o".repeat(22));

  const grant = await claimScanJobForExecution(d1(db), { scanId: "s".repeat(22), nowMs: now + 1 });
  assert.deepEqual(grant, {
    scanId: "s".repeat(22),
    tenantId: "tenant_a",
    originId: "o".repeat(22),
    origin: "https://owned.example.com",
    captureSpecSha256: "b".repeat(64),
    pageLimit: 2,
    runBudgetSeconds: 60,
    startedAtMs: now + 1,
  });
  assert.equal(await claimScanJobForExecution(d1(db), { scanId: "s".repeat(22), nowMs: now + 2 }), null);
  assert.deepEqual(await getScanNavigationGrant(d1(db), { scanId: "s".repeat(22), nowMs: now + 2 }), grant);
});

test("does not claim queued jobs with expired proof", async (t) => {
  const db = await freshDb(t);
  addTenant(db, "tenant_expired");
  addOrigin(db, "tenant_expired", "e".repeat(22), "f".repeat(22), { expiresAt: now + 1 });
  addJob(db, "x".repeat(22), "tenant_expired", "e".repeat(22));
  assert.equal(await claimScanJobForExecution(d1(db), { scanId: "x".repeat(22), nowMs: now + 1 }), null);

  addTenant(db, "tenant_suspend_after_claim");
  addOrigin(db, "tenant_suspend_after_claim", "i".repeat(22), "j".repeat(22));
  addJob(db, "k".repeat(22), "tenant_suspend_after_claim", "i".repeat(22));
  const client = d1(db);
  assert.ok(await claimScanJobForExecution(client, { scanId: "k".repeat(22), nowMs: now + 1 }));
  assert.deepEqual(await suspendTenantAndCancelActiveScans(client, {
    tenantId: "tenant_suspend_after_claim",
    nowMs: now + 2,
  }), { status: "suspended", cancelledScans: 1 });
  assert.equal(await getScanNavigationGrant(client, { scanId: "k".repeat(22), nowMs: now + 2 }), null);
});

test("navigation grant fails closed after proof revocation or run-budget expiry", async (t) => {
  const db = await freshDb(t);
  addTenant(db, "tenant_a");
  addOrigin(db, "tenant_a", "o".repeat(22), "c".repeat(22));
  addJob(db, "s".repeat(22), "tenant_a", "o".repeat(22));
  const client = d1(db);
  assert.ok(await claimScanJobForExecution(client, { scanId: "s".repeat(22), nowMs: now + 1 }));
  assert.equal(await getScanNavigationGrant(client, { scanId: "s".repeat(22), nowMs: now + 60_001 }), null);

  db.prepare("UPDATE verified_origins SET revoked_at_ms = ? WHERE origin_id = ?")
    .run(now + 2, "o".repeat(22));
  assert.equal(db.prepare("SELECT status FROM scan_jobs WHERE scan_id = ?").get("s".repeat(22)).status, "cancelled");
  assert.equal(await getScanNavigationGrant(client, { scanId: "s".repeat(22), nowMs: now + 3 }), null);
});

test("tenant suspension atomically cancels queued and running jobs", async (t) => {
  const db = await freshDb(t);
  addTenant(db, "tenant_suspend");
  addOrigin(db, "tenant_suspend", "o".repeat(22), "c".repeat(22));
  addJob(db, "s".repeat(22), "tenant_suspend", "o".repeat(22), now + 10);
  addJob(db, "t".repeat(22), "tenant_suspend", "o".repeat(22), now + 15);
  db.prepare("UPDATE scan_jobs SET status='running',started_at_ms=? WHERE scan_id=?")
    .run(now + 20, "t".repeat(22));

  assert.throws(() => db.prepare("UPDATE tenants SET status='suspended' WHERE tenant_id=?")
    .run("tenant_suspend"), /cancel active scan jobs/);
  const result = await suspendTenantAndCancelActiveScans(d1(db), {
    tenantId: "tenant_suspend",
    nowMs: now + 18,
  });
  assert.deepEqual(result, { status: "suspended", cancelledScans: 2 });
  assert.deepEqual(db.prepare("SELECT scan_id,status,finished_at_ms FROM scan_jobs WHERE tenant_id=? ORDER BY scan_id")
    .all("tenant_suspend").map((row) => ({
      scan_id: row.scan_id,
      status: row.status,
      finished_at_ms: row.finished_at_ms,
    })), [
    { scan_id: "s".repeat(22), status: "cancelled", finished_at_ms: now + 18 },
    { scan_id: "t".repeat(22), status: "cancelled", finished_at_ms: now + 20 },
  ]);
  assert.equal(db.prepare("SELECT status FROM tenants WHERE tenant_id=?").get("tenant_suspend").status, "suspended");
  assert.throws(() => addJob(db, "u".repeat(22), "tenant_suspend", "o".repeat(22), now + 22), /active tenant/);
});

test("rejects malformed scan lookups and ambiguous D1 mutation results", async () => {
  const emptyDb = { prepare() { throw new Error("query should not run"); } };
  await assert.rejects(() => claimScanJobForExecution(emptyDb, { scanId: "bad", nowMs: now }), /invalid scan id/);
  await assert.rejects(() => getScanNavigationGrant(emptyDb, { scanId: "s".repeat(22), nowMs: 0 }), /positive safe integer/);
  const malformedDb = { prepare: () => ({ bind: () => ({ run: async () => ({ success: true, meta: {} }) }) }) };
  await assert.rejects(() => claimScanJobForExecution(malformedDb, { scanId: "s".repeat(22), nowMs: now }), /claim result is unavailable/);
});
