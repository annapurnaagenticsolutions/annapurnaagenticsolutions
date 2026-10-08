import { test } from "node:test";
import assert from "node:assert/strict";
import { decideQuota, getQuotaWindows } from "../src/quota-policy.mjs";

const policy = { requestsPerMinute: 2, requestsPerDay: 5, maxConcurrent: 1 };
const nowMs = Date.UTC(2026, 9, 8, 12, 30, 15);
const windows = getQuotaWindows(nowMs);

test("permits within policy and returns deterministic remaining counters", () => {
  assert.deepEqual(decideQuota({ nowMs, ...windows, minuteUsed: 0, dayUsed: 3, activeLeases: 0 }, policy), {
    allowed: true, minuteRemaining: 1, dayRemaining: 1,
    minuteResetAtMs: windows.minuteStartMs + 60_000,
    dayResetAtMs: windows.dayStartMs + 86_400_000,
  });
});

test("blocks minute, day, and concurrent request ceilings with retry hints", () => {
  assert.equal(decideQuota({ nowMs, ...windows, minuteUsed: 2, dayUsed: 3, activeLeases: 0 }, policy).reason, "minute_limit");
  assert.equal(decideQuota({ nowMs, ...windows, minuteUsed: 0, dayUsed: 5, activeLeases: 0 }, policy).reason, "daily_limit");
  const concurrent = decideQuota({ nowMs, ...windows, minuteUsed: 0, dayUsed: 3, activeLeases: 1 }, policy);
  assert.equal(concurrent.reason, "concurrency_limit");
  assert.ok(concurrent.retryAfterSeconds >= 1);
});

test("resets stale windows and rejects non-positive policies", () => {
  const yesterday = getQuotaWindows(nowMs - 86_400_000);
  assert.equal(decideQuota({ nowMs, ...yesterday, minuteUsed: 50, dayUsed: 50, activeLeases: 0 }, policy).allowed, true);
  assert.throws(() => decideQuota({ nowMs, ...windows, minuteUsed: 0, dayUsed: 0, activeLeases: 0 }, { ...policy, requestsPerDay: 0 }), /positive/);
});
