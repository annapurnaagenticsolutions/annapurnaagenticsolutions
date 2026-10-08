#!/usr/bin/env node
/** Synthetic loopback-only HTTP load check for a locally running Wrangler Worker. */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

const baseUrl = process.env.WORKER_LOCAL_URL ?? "http://127.0.0.1:8787";
const base = new URL(baseUrl);
if (base.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) || base.username || base.password || base.search || base.hash) {
  throw new Error("WORKER_LOCAL_URL must be a credential-free HTTP loopback origin");
}

const token = process.env.WORKER_LOCAL_LOAD_TOKEN ?? process.env.WORKER_LOCAL_TEST_TOKEN;
if (!/^stp_[A-Za-z0-9_-]{22}_[A-Za-z0-9_-]{43}$/.test(token ?? "")) {
  throw new Error("Set WORKER_LOCAL_TEST_TOKEN to a synthetic local-only API key");
}

function setting(name, fallback, min, max) {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}`);
  }
  return value;
}

const requestCount = setting("WORKER_LOCAL_LOAD_REQUESTS", 128, 1, 100_000);
const concurrency = setting("WORKER_LOCAL_LOAD_CONCURRENCY", 8, 1, 64);
const health = await fetch(new URL("/health", base), { signal: AbortSignal.timeout(10_000) });
if (!health.ok || (await health.json()).status !== "ready") throw new Error("Local Worker is not ready");

const contract = JSON.parse(await readFile(resolve("examples/apples.contract.json"), "utf8"));
const observations = JSON.parse(await readFile(resolve("examples/apples.observations.json"), "utf8"));
const payload = JSON.stringify({ contract, observations });
const latencies = [];
const failures = [];
let nextRequest = 0;

async function runRequests() {
  for (;;) {
    const index = nextRequest++;
    if (index >= requestCount) return;
    const started = performance.now();
    try {
      const response = await fetch(new URL("/v1/check", base), {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: payload,
        signal: AbortSignal.timeout(20_000),
      });
      latencies.push(performance.now() - started);
      const result = await response.json();
      if (response.status !== 200 || result.ok !== true || result.report?.outcome !== "fail") {
        failures.push({ index, status: response.status, reason: result.reason ?? result.error ?? "unexpected synthetic report" });
      }
    } catch (error) {
      failures.push({ index, reason: error instanceof Error ? error.name : "request_error" });
    }
  }
}

const wallStarted = performance.now();
await Promise.all(Array.from({ length: Math.min(concurrency, requestCount) }, () => runRequests()));
const elapsedMs = performance.now() - wallStarted;
latencies.sort((a, b) => a - b);
const percentile = (p) => latencies.length ? Number(latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * p) - 1)].toFixed(3)) : null;
const result = {
  scope: "synthetic loopback Wrangler/Workerd HTTP workload; not Cloudflare edge or production capacity evidence",
  requests: requestCount,
  concurrency,
  completed_responses: latencies.length,
  failures: failures.length,
  failure_samples: failures.slice(0, 5),
  elapsed_ms: Number(elapsedMs.toFixed(3)),
  requests_per_second: Number((requestCount / (elapsedMs / 1000)).toFixed(2)),
  latency_ms: { p50: percentile(0.5), p95: percentile(0.95), max: latencies.length ? Number(latencies.at(-1).toFixed(3)) : null },
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
