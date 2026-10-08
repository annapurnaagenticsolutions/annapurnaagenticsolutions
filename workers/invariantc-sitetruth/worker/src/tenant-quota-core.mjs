import { decideQuota, getQuotaWindows } from "./quota-policy.mjs";

export const LEASE_TTL_MS = 120_000;

export function initializeQuotaStorage(sql) {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS usage_windows (
      period TEXT PRIMARY KEY CHECK (period IN ('minute', 'day')),
      window_start_ms INTEGER NOT NULL,
      used INTEGER NOT NULL CHECK (used >= 0)
    )
  `);
  sql.exec(`
    CREATE TABLE IF NOT EXISTS active_leases (
      lease_id TEXT PRIMARY KEY,
      expires_at_ms INTEGER NOT NULL
    )
  `);
  sql.exec("CREATE INDEX IF NOT EXISTS active_leases_expiry ON active_leases (expires_at_ms)");
}

export function reserveQuota(sql, { leaseId, nowMs, policy }) {
  if (!/^[0-9a-f-]{36}$/i.test(leaseId ?? "")) throw new TypeError("invalid request lease");
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new TypeError("invalid request time");
  const windows = getQuotaWindows(nowMs);
  sql.exec("DELETE FROM active_leases WHERE expires_at_ms <= ?", nowMs);

  const rows = sql.exec("SELECT period, window_start_ms, used FROM usage_windows").toArray();
  const minute = rows.find((row) => row.period === "minute");
  const day = rows.find((row) => row.period === "day");
  const active = sql.exec("SELECT COUNT(*) AS count FROM active_leases").one().count;
  const decision = decideQuota({
    nowMs,
    minuteStartMs: minute?.window_start_ms ?? null,
    minuteUsed: minute?.used ?? 0,
    dayStartMs: day?.window_start_ms ?? null,
    dayUsed: day?.used ?? 0,
    activeLeases: active,
  }, policy);
  if (!decision.allowed) return decision;

  sql.exec(`
    INSERT INTO usage_windows (period, window_start_ms, used) VALUES ('minute', ?, 1)
    ON CONFLICT(period) DO UPDATE SET
      used = CASE WHEN usage_windows.window_start_ms = excluded.window_start_ms THEN usage_windows.used + 1 ELSE 1 END,
      window_start_ms = excluded.window_start_ms
  `, windows.minuteStartMs);
  sql.exec(`
    INSERT INTO usage_windows (period, window_start_ms, used) VALUES ('day', ?, 1)
    ON CONFLICT(period) DO UPDATE SET
      used = CASE WHEN usage_windows.window_start_ms = excluded.window_start_ms THEN usage_windows.used + 1 ELSE 1 END,
      window_start_ms = excluded.window_start_ms
  `, windows.dayStartMs);
  sql.exec("INSERT INTO active_leases (lease_id, expires_at_ms) VALUES (?, ?)", leaseId, nowMs + LEASE_TTL_MS);
  return { ...decision, leaseExpiresAtMs: nowMs + LEASE_TTL_MS };
}

export function releaseQuota(sql, { leaseId }) {
  if (!/^[0-9a-f-]{36}$/i.test(leaseId ?? "")) throw new TypeError("invalid request lease");
  sql.exec("DELETE FROM active_leases WHERE lease_id = ?", leaseId);
  return { released: true };
}
