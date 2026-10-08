import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import assert from "node:assert/strict";
import { initializeQuotaStorage, LEASE_TTL_MS, releaseQuota, reserveQuota } from "../src/tenant-quota-core.mjs";

function sqliteStorage() {
  const database = new DatabaseSync(":memory:");
  const sql = {
    exec(query, ...bindings) {
      const statement = database.prepare(query);
      if (/^\s*SELECT\b/i.test(query)) {
        const rows = statement.all(...bindings);
        return {
          toArray: () => rows,
          one() {
            if (rows.length !== 1) throw new Error(`expected one row, received ${rows.length}`);
            return rows[0];
          },
        };
      }
      statement.run(...bindings);
      return { toArray: () => [], one: () => undefined };
    },
  };
  initializeQuotaStorage(sql);
  return { database, sql };
}

const policy = { requestsPerMinute: 20, requestsPerDay: 100, maxConcurrent: 1 };
const leaseA = "11111111-1111-4111-8111-111111111111";
const leaseB = "22222222-2222-4222-8222-222222222222";

test("SQLite quota core blocks concurrent leases and releases cleanly", () => {
  const { database, sql } = sqliteStorage();
  try {
    const nowMs = 1_800_000_000_000;
    assert.equal(reserveQuota(sql, { leaseId: leaseA, nowMs, policy }).allowed, true);
    assert.deepEqual(reserveQuota(sql, { leaseId: leaseB, nowMs, policy }), {
      allowed: false, reason: "concurrency_limit", retryAfterSeconds: 2,
    });
    assert.deepEqual(releaseQuota(sql, { leaseId: leaseA }), { released: true });
    assert.equal(reserveQuota(sql, { leaseId: leaseB, nowMs, policy }).allowed, true);
  } finally {
    database.close();
  }
});

test("expired orphan leases are removed before the next reservation", () => {
  const { database, sql } = sqliteStorage();
  try {
    const nowMs = 1_800_000_000_000;
    const first = reserveQuota(sql, { leaseId: leaseA, nowMs, policy });
    assert.equal(first.leaseExpiresAtMs, nowMs + LEASE_TTL_MS);
    assert.equal(reserveQuota(sql, { leaseId: leaseB, nowMs: nowMs + LEASE_TTL_MS - 1, policy }).reason, "concurrency_limit");
    const afterExpiry = reserveQuota(sql, { leaseId: leaseB, nowMs: nowMs + LEASE_TTL_MS, policy });
    assert.equal(afterExpiry.allowed, true);
  } finally {
    database.close();
  }
});
