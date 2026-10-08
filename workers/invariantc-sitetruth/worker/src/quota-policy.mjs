const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

export function getQuotaWindows(nowMs) {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new TypeError("nowMs must be a non-negative safe integer");
  return {
    minuteStartMs: Math.floor(nowMs / MINUTE_MS) * MINUTE_MS,
    dayStartMs: Math.floor(nowMs / DAY_MS) * DAY_MS,
  };
}

export function decideQuota({ nowMs, minuteStartMs, minuteUsed, dayStartMs, dayUsed, activeLeases }, policy) {
  const limits = [policy?.requestsPerMinute, policy?.requestsPerDay, policy?.maxConcurrent];
  if (!limits.every((value) => Number.isSafeInteger(value) && value > 0)) {
    throw new TypeError("all tenant quota limits must be positive safe integers");
  }
  const windows = getQuotaWindows(nowMs);
  const minuteCount = minuteStartMs === windows.minuteStartMs ? minuteUsed : 0;
  const dayCount = dayStartMs === windows.dayStartMs ? dayUsed : 0;
  if (![minuteCount, dayCount, activeLeases].every((value) => Number.isSafeInteger(value) && value >= 0)) {
    throw new TypeError("quota counters must be non-negative safe integers");
  }

  if (minuteCount >= policy.requestsPerMinute) {
    return { allowed: false, reason: "minute_limit", retryAfterSeconds: Math.max(1, Math.ceil((windows.minuteStartMs + MINUTE_MS - nowMs) / 1000)) };
  }
  if (dayCount >= policy.requestsPerDay) {
    return { allowed: false, reason: "daily_limit", retryAfterSeconds: Math.max(1, Math.ceil((windows.dayStartMs + DAY_MS - nowMs) / 1000)) };
  }
  if (activeLeases >= policy.maxConcurrent) {
    return { allowed: false, reason: "concurrency_limit", retryAfterSeconds: 2 };
  }
  return {
    allowed: true,
    minuteRemaining: policy.requestsPerMinute - minuteCount - 1,
    dayRemaining: policy.requestsPerDay - dayCount - 1,
    minuteResetAtMs: windows.minuteStartMs + MINUTE_MS,
    dayResetAtMs: windows.dayStartMs + DAY_MS,
  };
}
