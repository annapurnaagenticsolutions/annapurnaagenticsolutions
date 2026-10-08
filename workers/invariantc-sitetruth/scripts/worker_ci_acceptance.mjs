#!/usr/bin/env node
/**
 * Linux CI-only current-runtime acceptance for isolated Wrangler D1/Workerd.
 * Generates synthetic tenant keys in memory, stores only their hashes in a
 * temporary local D1 database, and never contacts a remote Cloudflare resource.
 */
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.CI !== "true") {
  throw new Error("This isolated Workerd acceptance runner is restricted to CI (CI=true)");
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wrangler = resolve(root, "node_modules", "wrangler", "bin", "wrangler.js");
const port = Number(process.env.WORKER_CI_PORT ?? 8791);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("WORKER_CI_PORT must be an integer from 1024 to 65535");
}
const baseUrl = `http://127.0.0.1:${port}`;
const loadRequests = Number(process.env.WORKER_CI_LOAD_REQUESTS ?? 25_000);
const loadConcurrency = Number(process.env.WORKER_CI_LOAD_CONCURRENCY ?? 16);
if (!Number.isSafeInteger(loadRequests) || loadRequests < 1 || loadRequests > 50_000) {
  throw new Error("WORKER_CI_LOAD_REQUESTS must be an integer from 1 to 50000");
}
if (!Number.isSafeInteger(loadConcurrency) || loadConcurrency < 1 || loadConcurrency > 16) {
  throw new Error("WORKER_CI_LOAD_CONCURRENCY must be an integer from 1 to 16");
}
const tempRoot = await mkdtemp(join(tmpdir(), "sitetruth-worker-ci-"));
const persistPath = join(tempRoot, "wrangler-state");
const seedPath = join(tempRoot, "seed.sql");
const childEnv = { ...process.env, WRANGLER_SEND_METRICS: "false" };
for (const name of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_API_KEY", "CLOUDFLARE_EMAIL"]) {
  delete childEnv[name];
}

function makeKey() {
  const keyId = randomBytes(16).toString("base64url");
  const secret = randomBytes(32).toString("base64url");
  return {
    token: `stp_${keyId}_${secret}`,
    keyId,
    tokenHash: createHash("sha256").update(secret, "utf8").digest("hex"),
  };
}

function runNode(args, { env = childEnv, capture = false } = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
    child.once("error", rejectRun);
    child.once("close", (code, signal) => {
      if (code !== 0) {
        rejectRun(new Error(`Command failed (${code ?? signal}): ${args.join(" ")}\n${output.slice(-12000)}`));
        return;
      }
      if (capture && output.trim()) process.stdout.write(output);
      resolveRun(output);
    });
  });
}

function startWorker() {
  const child = spawn(process.execPath, [
    wrangler, "dev", "--local", "--config", "worker/wrangler.toml",
    "--persist-to", persistPath, "--ip", "127.0.0.1", "--port", String(port),
    "--log-level", "error", "--show-interactive-dev-session=false",
  ], { cwd: root, env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  let spawnError;
  const remember = (chunk) => {
    output = `${output}${chunk}`.slice(-30000);
  };
  child.stdout.setEncoding("utf8").on("data", remember);
  child.stderr.setEncoding("utf8").on("data", remember);
  child.once("error", (error) => {
    spawnError = error;
    output += `\n${error.stack ?? error}`;
  });
  return {
    child,
    logs: () => output,
    spawnError: () => spawnError,
  };
}

async function waitForWorker(server) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (server.spawnError()) throw new Error(`Could not start Wrangler dev.\n${server.logs()}`);
    if (server.child.exitCode !== null || server.child.signalCode !== null) {
      throw new Error(`Wrangler dev exited before ready.\n${server.logs()}`);
    }
    try {
      const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2_000) });
      if (response.status === 200 && (await response.json()).status === "ready") return;
    } catch {
      // The local Worker may still be compiling or opening its D1/DO bindings.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }
  throw new Error(`Wrangler dev did not become ready within 90 seconds.\n${server.logs()}`);
}

async function stopWorker(server) {
  if (server.child.exitCode !== null || server.child.signalCode !== null) return;
  server.child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolveExit) => server.child.once("close", resolveExit)),
    new Promise((resolveDelay) => setTimeout(resolveDelay, 5_000)),
  ]);
  if (server.child.exitCode === null && server.child.signalCode === null) {
    server.child.kill("SIGKILL");
    await Promise.race([
      new Promise((resolveExit) => server.child.once("close", resolveExit)),
      new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000)),
    ]);
  }
}

const smokeKey = makeKey();
const secondTenantKey = makeKey();
const revokedKey = makeKey();
const expiredKey = makeKey();
const loadKey = makeKey();
const now = Date.now();
const seedStatements = [
  `INSERT INTO tenants (tenant_id,status,requests_per_minute,requests_per_day,max_concurrent,created_at_ms) VALUES ('ci_smoke','active',1,100,1,${now});`,
  `INSERT INTO tenants (tenant_id,status,requests_per_minute,requests_per_day,max_concurrent,created_at_ms) VALUES ('ci_second','active',10,100,1,${now});`,
  `INSERT INTO tenants (tenant_id,status,requests_per_minute,requests_per_day,max_concurrent,created_at_ms) VALUES ('ci_load','active',50000,50000,16,${now});`,
  `INSERT INTO api_keys (key_id,tenant_id,token_sha256,status,created_at_ms,expires_at_ms) VALUES ('${smokeKey.keyId}','ci_smoke','${smokeKey.tokenHash}','active',${now},${now + 86_400_000});`,
  `INSERT INTO api_keys (key_id,tenant_id,token_sha256,status,created_at_ms,expires_at_ms) VALUES ('${secondTenantKey.keyId}','ci_second','${secondTenantKey.tokenHash}','active',${now},${now + 86_400_000});`,
  `INSERT INTO api_keys (key_id,tenant_id,token_sha256,status,created_at_ms,expires_at_ms) VALUES ('${revokedKey.keyId}','ci_smoke','${revokedKey.tokenHash}','revoked',${now},${now + 86_400_000});`,
  `INSERT INTO api_keys (key_id,tenant_id,token_sha256,status,created_at_ms,expires_at_ms) VALUES ('${expiredKey.keyId}','ci_smoke','${expiredKey.tokenHash}','active',${now - 172_800_000},${now - 86_400_000});`,
  `INSERT INTO api_keys (key_id,tenant_id,token_sha256,status,created_at_ms,expires_at_ms) VALUES ('${loadKey.keyId}','ci_load','${loadKey.tokenHash}','active',${now},${now + 86_400_000});`,
];

let server;
try {
  await runNode([wrangler, "d1", "migrations", "apply", "DB", "--local", "--config", "worker/wrangler.toml", "--persist-to", persistPath]);
  await runNode([wrangler, "d1", "migrations", "list", "DB", "--local", "--config", "worker/wrangler.toml", "--persist-to", persistPath]);
  await writeFile(seedPath, `${seedStatements.join("\n")}\n`, { encoding: "utf8", flag: "wx" });
  await runNode([wrangler, "d1", "execute", "DB", "--local", "--config", "worker/wrangler.toml", "--persist-to", persistPath, "--file", seedPath]);

  server = startWorker();
  await waitForWorker(server);
  const smokeEnv = {
    ...childEnv,
    WORKER_LOCAL_URL: baseUrl,
    WORKER_LOCAL_TEST_TOKEN: smokeKey.token,
    WORKER_LOCAL_SECOND_TENANT_TOKEN: secondTenantKey.token,
    WORKER_LOCAL_REVOKED_TOKEN: revokedKey.token,
    WORKER_LOCAL_EXPIRED_TOKEN: expiredKey.token,
  };
  await runNode(["scripts/worker_local_smoke.mjs"], { env: smokeEnv, capture: true });

  const loadEnv = {
    ...childEnv,
    WORKER_LOCAL_URL: baseUrl,
    WORKER_LOCAL_LOAD_TOKEN: loadKey.token,
    WORKER_LOCAL_LOAD_REQUESTS: String(loadRequests),
    WORKER_LOCAL_LOAD_CONCURRENCY: String(loadConcurrency),
  };
  await runNode(["scripts/worker_local_load.mjs"], { env: loadEnv, capture: true });
  process.stdout.write("Current Workerd/D1 CI acceptance PASSED. Scope: isolated local migrations, synthetic tenants/keys, tenant isolation, auth/revocation/expiry, quotas, and loopback load only; no Cloudflare credentials or remote resources.\n");
} finally {
  if (server) await stopWorker(server);
  const resolvedTempRoot = resolve(tempRoot);
  if (dirname(resolvedTempRoot) !== resolve(tmpdir()) || !basename(resolvedTempRoot).startsWith("sitetruth-worker-ci-")) {
    throw new Error("Refusing to remove CI persistence outside the generated temporary directory");
  }
  await rm(tempRoot, { recursive: true, force: true });
}
