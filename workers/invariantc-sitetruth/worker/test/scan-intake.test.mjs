import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../src/handler.mjs";
import { decryptScanPayload } from "../src/scan-payload-crypto.mjs";
import { dispatchPendingScanJobs } from "../src/scan-outbox.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const now = 1_800_000_000_000;
const scanIdPattern = /^[A-Za-z0-9_-]{22}$/;
const tenantA = { tenantId: "tenant_a", requestsPerMinute: 60, requestsPerDay: 100, maxConcurrent: 3 };
const tenantB = { tenantId: "tenant_b", requestsPerMinute: 60, requestsPerDay: 100, maxConcurrent: 3 };
const token = `stp_${"k".repeat(22)}_${"s".repeat(43)}`;
const encryptionKey = "a".repeat(64);
const nextEncryptionKey = "b".repeat(64);

class SqliteD1Statement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.values = []; }
  bind(...values) { this.values = values; return this; }
  async run() {
    const result = this.db.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
  async first() { return this.db.prepare(this.sql).get(...this.values) ?? null; }
  async all() {
    const result = this.db.prepare(this.sql).all(...this.values);
    return { success: true, results: result };
  }
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
  db.exec(`
    INSERT INTO tenants
      (tenant_id,status,requests_per_minute,requests_per_day,max_concurrent,created_at_ms)
      VALUES ('tenant_a','active',60,100,3,${now});
    INSERT INTO scan_policies
      (tenant_id,scan_requests_per_minute,scans_per_day,max_concurrent_scans,max_pages_per_scan,
       max_run_seconds,max_report_bytes,artifact_retention_days,updated_at_ms)
      VALUES ('tenant_a',20,20,3,5,60,262144,1,${now});
    INSERT INTO domain_challenges
      (challenge_id,tenant_id,hostname_ascii,token_sha256,issued_at_ms,expires_at_ms,consumed_at_ms)
      VALUES ('${"c".repeat(22)}','tenant_a','owned.example.com','${"b".repeat(64)}',${now - 10},${now + 899_990},${now - 1});
    INSERT INTO verified_origins
      (origin_id,tenant_id,hostname_ascii,origin,challenge_id,verified_at_ms,expires_at_ms)
      VALUES ('${"o".repeat(22)}','tenant_a','owned.example.com','https://owned.example.com','${"c".repeat(22)}',${now - 1},${now + 86_399_999});
  `);
  t.after(() => db.close());
  return db;
}

function capture(url = "https://owned.example.com/products") {
  return {
    version: 1,
    url,
    sources: [
      { id: "scene", layer: "structured_scene", extract: [{ pointer: "/objects", kind: "attribute_json", selector: "#scene", attribute: "data-objects" }] },
      { id: "ui", layer: "dom", extract: [{ pointer: "/label_count", kind: "number_text", selector: "#label" }] },
    ],
  };
}

const contract = {
  version: 1,
  id: "apple_label_matches_scene",
  sources: [{ id: "scene", layer: "structured_scene" }, { id: "ui", layer: "dom" }],
  assertions: [{
    id: "object_count_consistency",
    expected: { kind: "count", value: { kind: "path", source: "scene", pointer: "/objects" } },
    actual: { kind: "path", source: "ui", pointer: "/label_count" },
    rule: { kind: "equal" },
    severity: "error",
  }],
};

function scanEnvironment(db, queue = { send: async () => {} }, overrides = {}) {
  return {
    DB: d1(db),
    TENANT_QUOTA: {},
    SCAN_QUEUE: queue,
    SCAN_PAYLOAD_ENCRYPTION_KEYS: JSON.stringify({ v1: encryptionKey, v2: nextEncryptionKey }),
    SCAN_PAYLOAD_ACTIVE_KEY_ID: "v1",
    SCAN_PAYLOAD_TTL_MS: "86400000",
    SCAN_QUEUED_MAX_AGE_MS: "60000",
    SCAN_RUNNING_GRACE_MS: "1000",
    SCAN_JOB_AUDIT_RETENTION_MS: "86400000",
    DOMAIN_VERIFICATION_ENABLED: "true",
    SCAN_JOB_RECOVERY_ENABLED: "true",
    SCAN_JOB_RETENTION_ENABLED: "true",
    SCAN_INTAKE_ENABLED: "true",
    SCAN_OUTBOX_DISPATCH_ENABLED: "true",
    SCAN_EXECUTION_ENABLED: "true",
    SCAN_QUEUE_CONSUMER_READY: "true",
    SCAN_RUNNER_READY: "true",
    SCAN_MAINTENANCE_READY: "true",
    ...overrides,
  };
}

function harness() {
  let sends = 0;
  const queue = { send: async () => { sends += 1; } };
  const tenantHandler = createHandler(() => JSON.stringify({ ok: true, report: { outcome: "unknown" } }), {
    bodyReadTimeoutMs: 1000,
    now: () => now,
    authenticate: async (request) => request.headers.get("x-tenant") === "tenant_b" ? tenantB : tenantA,
    reserve: async () => ({ allowed: true, minuteRemaining: 59, dayRemaining: 99, minuteResetAtMs: now + 60_000 }),
    release: async () => {},
  });
  return { queue, get sends() { return sends; }, handler: tenantHandler };
}

function createRequest(body, { idempotencyKey = "request-key-000001", tenantId = "tenant_a" } = {}) {
  return new Request("https://api.example/v1/scans", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
      "x-tenant": tenantId,
    },
    body: JSON.stringify(body),
  });
}

function createBody(overrides = {}) {
  return { origin_id: "o".repeat(22), capture: capture(), contract, page_limit: 1, ...overrides };
}

test("scan intake requires every runtime, queue, retention, and recovery gate", async (t) => {
  const db = await freshDb(t);
  const app = harness();
  const body = JSON.stringify(createBody());
  for (const override of [
    { SCAN_RUNNER_READY: "false" },
    { SCAN_QUEUE_CONSUMER_READY: "false" },
    { SCAN_EXECUTION_ENABLED: "false" },
    { SCAN_PAYLOAD_ENCRYPTION_KEYS: undefined },
  ]) {
    const response = await app.handler(new Request("https://api.example/v1/scans", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "idempotency-key": "request-key-000001" },
      body,
    }), scanEnvironment(db, app.queue, override));
    assert.equal(response.status, 503);
  }
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM scan_jobs").get().count, 0);
  assert.equal(app.sends, 0);
});

test("creates an encrypted tenant-owned job, dispatches it, and reuses its idempotency key", async (t) => {
  const db = await freshDb(t);
  const app = harness();
  const env = scanEnvironment(db, app.queue);
  const first = await app.handler(createRequest(createBody()), env);
  const firstBody = await first.json();
  assert.equal(first.status, 202);
  assert.match(firstBody.scan_id, scanIdPattern);
  assert.equal(firstBody.status, "queued");
  assert.equal(firstBody.dispatch_status, "dispatched");
  assert.equal(app.sends, 1);

  const job = db.prepare("SELECT * FROM scan_jobs WHERE scan_id = ?").get(firstBody.scan_id);
  const outbox = db.prepare("SELECT * FROM scan_job_dispatch_outbox WHERE scan_id = ?").get(firstBody.scan_id);
  assert.equal(job.request_payload_sha256.length, 64);
  assert.equal(outbox.request_payload_sha256, job.request_payload_sha256);
  assert.equal(outbox.payload_key_id, "v1");
  assert.equal(outbox.encrypted_payload_b64url.includes("apple_label_matches_scene"), false);
  const payload = await decryptScanPayload({
    payloadSha256: outbox.request_payload_sha256,
    payloadKeyId: outbox.payload_key_id,
    nonceB64Url: outbox.payload_nonce_b64url,
    ciphertextB64Url: outbox.encrypted_payload_b64url,
  }, encryptionKey, {
    tenantId: "tenant_a", scanId: firstBody.scan_id, originId: "o".repeat(22), payloadKeyId: "v1",
  });
  assert.equal(payload.capture.url, "https://owned.example.com/products");

  const duplicate = await app.handler(createRequest(createBody()), env);
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).scan_id, firstBody.scan_id);
  assert.equal(app.sends, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM scan_jobs").get().count, 1);

  const conflict = await app.handler(createRequest(createBody({ capture: capture("https://owned.example.com/other") })), env);
  assert.equal(conflict.status, 409);

  const otherTenant = await app.handler(new Request(`https://api.example/v1/scans/${firstBody.scan_id}`, {
    headers: { authorization: `Bearer ${token}`, "x-tenant": "tenant_b" },
  }), env);
  assert.equal(otherTenant.status, 404);

  const ownStatus = await app.handler(new Request(`https://api.example/v1/scans/${firstBody.scan_id}`, {
    headers: { authorization: `Bearer ${token}`, "x-tenant": "tenant_a" },
  }), env);
  assert.equal(ownStatus.status, 200);
  assert.equal((await ownStatus.json()).scan_id, firstBody.scan_id);

  db.prepare("UPDATE scan_jobs SET status='failed',finished_at_ms=?,terminal_reason='queue_timeout' WHERE scan_id=?")
    .run(now + 1, firstBody.scan_id);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM scan_job_dispatch_outbox").get().count, 0);
  assert.equal(db.prepare("SELECT reason FROM scan_payload_deletion_audit WHERE scan_id=?").get(firstBody.scan_id).reason, "job_terminal");

  const rotated = await app.handler(createRequest(createBody(), { idempotencyKey: "request-key-000002" }), {
    ...env, SCAN_PAYLOAD_ACTIVE_KEY_ID: "v2",
  });
  const rotatedBody = await rotated.json();
  assert.equal(rotated.status, 202);
  const rotatedOutbox = db.prepare("SELECT * FROM scan_job_dispatch_outbox WHERE scan_id=?").get(rotatedBody.scan_id);
  assert.equal(rotatedOutbox.payload_key_id, "v2");
  assert.deepEqual(await decryptScanPayload({
    payloadKeyId: rotatedOutbox.payload_key_id,
    payloadSha256: rotatedOutbox.request_payload_sha256,
    nonceB64Url: rotatedOutbox.payload_nonce_b64url,
    ciphertextB64Url: rotatedOutbox.encrypted_payload_b64url,
  }, nextEncryptionKey, {
    tenantId: "tenant_a", scanId: rotatedBody.scan_id, originId: "o".repeat(22), payloadKeyId: "v2",
  }).then(({ capture: decodedCapture }) => decodedCapture.url), "https://owned.example.com/products");
});

test("rejects unsafe targets, interactive actions, and malformed idempotency without storing jobs", async (t) => {
  const db = await freshDb(t);
  const app = harness();
  const env = scanEnvironment(db, app.queue);
  const external = await app.handler(createRequest(createBody({ capture: capture("https://evil.example/products") })), env);
  assert.equal(external.status, 422);
  const interactive = await app.handler(createRequest(createBody({ capture: { ...capture(), actions: [{ kind: "click", selector: "button" }] } }), {
    idempotencyKey: "request-key-000002",
  }), env);
  assert.equal(interactive.status, 422);
  const invalidKey = await app.handler(createRequest(createBody(), { idempotencyKey: "short" }), env);
  assert.equal(invalidKey.status, 422);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM scan_jobs").get().count, 0);
  assert.equal(app.sends, 0);
});

test("bounds contract depth, JSON nesting, and extraction-field work before scan creation", async (t) => {
  const db = await freshDb(t);
  const app = harness();
  const env = scanEnvironment(db, app.queue);

  let nestedExpression = { kind: "path", source: "scene", pointer: "/objects" };
  for (let index = 0; index < 40; index += 1) nestedExpression = { kind: "count", value: nestedExpression };
  const deepExpression = { ...contract, assertions: [{ ...contract.assertions[0], expected: nestedExpression }] };
  const expressionResponse = await app.handler(createRequest(createBody({ contract: deepExpression }), {
    idempotencyKey: "complex-expression-01",
  }), env);
  assert.equal(expressionResponse.status, 422);

  let nestedLiteral = "value";
  for (let index = 0; index < 80; index += 1) nestedLiteral = [nestedLiteral];
  const deeplyNestedJson = { ...contract, assertions: [{
    ...contract.assertions[0], expected: { kind: "literal", value: nestedLiteral },
  }] };
  const jsonResponse = await app.handler(createRequest(createBody({ contract: deeplyNestedJson }), {
    idempotencyKey: "complex-json-000001",
  }), env);
  assert.equal(jsonResponse.status, 422);

  const manyFields = capture();
  manyFields.sources[0].extract = Array.from({ length: 129 }, (_, index) => ({
    pointer: `/field_${index}`, kind: "exists", selector: `#field-${index}`,
  }));
  const fieldResponse = await app.handler(createRequest(createBody({ capture: manyFields }), {
    idempotencyKey: "complex-fields-000001",
  }), env);
  assert.equal(fieldResponse.status, 422);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM scan_jobs").get().count, 0);
  assert.equal(app.sends, 0);
});

test("durable outbox retains a failed queue send and retries it idempotently", async (t) => {
  const db = await freshDb(t);
  let attempts = 0;
  const failingQueue = { send: async () => { attempts += 1; throw new Error("synthetic queue failure"); } };
  const app = harness();
  const env = scanEnvironment(db, failingQueue);
  const created = await app.handler(createRequest(createBody()), env);
  const result = await created.json();
  assert.equal(created.status, 202);
  assert.equal(result.dispatch_status, "pending");
  const pending = db.prepare("SELECT dispatch_attempts,last_error_code FROM scan_job_dispatch_outbox WHERE scan_id=?")
    .get(result.scan_id);
  assert.equal(pending.dispatch_attempts, 1);
  assert.equal(pending.last_error_code, "queue_send_failed");
  const pendingDispatch = db.prepare(`SELECT j.status,o.dispatched_at_ms,o.expires_at_ms
    FROM scan_jobs j JOIN scan_job_dispatch_outbox o USING (scan_id) WHERE j.scan_id=?`)
    .get(result.scan_id);
  assert.equal(pendingDispatch.status, "queued");
  assert.equal(pendingDispatch.dispatched_at_ms, null);
  assert.equal(pendingDispatch.expires_at_ms, now + 86_400_000);

  const delivered = [];
  const retry = await dispatchPendingScanJobs(d1(db), { send: async (message) => delivered.push(message) }, { nowMs: now + 1 });
  assert.deepEqual(retry, { scanned: 1, dispatched: 1, pending: 0, expired: 0 });
  assert.deepEqual(delivered, [{ version: 1, scan_id: result.scan_id, tenant_id: "tenant_a" }]);
  assert.equal(attempts, 1);
});

test("encryption authenticates tenant, scan, and origin bindings and rejects tampering", async () => {
  const { encryptScanPayload } = await import("../src/scan-payload-crypto.mjs");
  const binding = { tenantId: "tenant_a", scanId: "s".repeat(22), originId: "o".repeat(22), payloadKeyId: "v1" };
  const encrypted = await encryptScanPayload({ safe: true }, encryptionKey, binding);
  assert.deepEqual(await decryptScanPayload(encrypted, encryptionKey, binding), { safe: true });
  await assert.rejects(() => decryptScanPayload(encrypted, encryptionKey, { ...binding, tenantId: "tenant_b" }),
    (error) => error.code === "encrypted_payload_authentication_failed");
  await assert.rejects(() => decryptScanPayload(encrypted, encryptionKey, { ...binding, payloadKeyId: "v2" }));
  const alteredCiphertext = Buffer.from(encrypted.ciphertextB64Url, "base64url");
  alteredCiphertext[0] ^= 1;
  const tampered = { ...encrypted, ciphertextB64Url: alteredCiphertext.toString("base64url") };
  await assert.rejects(() => decryptScanPayload(tampered, encryptionKey, binding));
});
