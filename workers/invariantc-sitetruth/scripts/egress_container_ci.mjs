#!/usr/bin/env node
/**
 * CI-only local Docker/Workerd probe for Cloudflare Container HTTP/S interception.
 * It uses fixed .invalid cases plus one fixed example.com TLS handshake probe,
 * no customer data, and no remote bindings.
 */
import { execFileSync } from "node:child_process";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.CI !== "true") {
  throw new Error("Container egress prototype execution is restricted to CI (CI=true)");
}
if (process.platform !== "linux") {
  throw new Error("Container egress prototype requires the isolated Linux CI runner; it is not a local host smoke");
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wrangler = resolve(root, "node_modules", "wrangler", "bin", "wrangler.js");
const port = Number(process.env.EGRESS_CI_PORT ?? 8792);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("EGRESS_CI_PORT must be an integer from 1024 through 65535");
}
const baseUrl = `http://127.0.0.1:${port}`;
const tempRoot = await mkdtemp(join(tmpdir(), "sitetruth-egress-ci-"));
const persistPath = join(tempRoot, "wrangler-state");
const childEnv = { ...process.env, WRANGLER_SEND_METRICS: "false" };
for (const name of [
  "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_API_KEY", "CLOUDFLARE_EMAIL",
  "CLOUDFLARE_ACCOUNT_ID", "CF_ACCOUNT_ID", "CF_API_TOKEN",
]) {
  delete childEnv[name];
}

function startWorker() {
  const child = spawn(process.execPath, [
    wrangler, "dev", "--local", "--config", "worker/egress-prototype/wrangler.toml",
    "--persist-to", persistPath, "--ip", "127.0.0.1", "--port", String(port),
    "--var", "EGRESS_PROBE_MODE:ci", "--log-level", "error", "--show-interactive-dev-session=false",
  ], { cwd: root, env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  let spawnError;
  const remember = (chunk) => { output = `${output}${chunk}`.slice(-30_000); };
  child.stdout.setEncoding("utf8").on("data", remember);
  child.stderr.setEncoding("utf8").on("data", remember);
  child.once("error", (error) => { spawnError = error; remember(error.stack ?? String(error)); });
  return { child, logs: () => output, spawnError: () => spawnError };
}

async function waitForWorker(server) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (server.spawnError()) throw new Error(`Could not start local Wrangler.\n${server.logs()}`);
    if (server.child.exitCode !== null || server.child.signalCode !== null) {
      throw new Error(`Wrangler exited before readiness.\n${server.logs()}`);
    }
    try {
      const response = await fetch(`${baseUrl}/_ci/health`, { signal: AbortSignal.timeout(2_000) });
      if (response.status === 200 && (await response.json()).status === "ready") return;
    } catch {
      // Local Workerd and the Linux container image may still be starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }
  throw new Error(`Local Worker did not become ready within 90 seconds.\n${server.logs()}`);
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

let server;
try {
  const dockerVersion = execFileSync("docker", ["info", "--format", "{{.ServerVersion}}"], {
    encoding: "utf8",
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 15_000,
  }).trim();
  if (!dockerVersion) throw new Error("Docker Engine returned an empty version");
  process.stdout.write(`Docker Engine available: ${dockerVersion}\n`);

  server = startWorker();
  await waitForWorker(server);
  const response = await fetch(`${baseUrl}/_ci/egress`, {
    method: "POST",
    signal: AbortSignal.timeout(60_000),
  });
  const responseText = await response.text();
  let body;
  try {
    body = JSON.parse(responseText);
  } catch {
    throw new Error(`Egress prototype returned non-JSON (${response.status}): ${responseText.slice(0, 1_000)}\n${server.logs()}`);
  }
  if (
    !response.ok ||
    !["pass", "inconclusive"].includes(body.status) ||
    body.scope !== "fixed-invalid-deny-cases-plus-example-com-tls-handshake-only"
  ) {
    throw new Error(`Egress prototype failed (${response.status}): ${JSON.stringify(body)}\n${server.logs()}`);
  }
  const expectedDenials = [
    { name: "http", status: 403, decision: "deny", finalHost: "http-egress.invalid" },
    { name: "https", status: 403, decision: "deny", finalHost: "https-egress.invalid" },
    { name: "redirect", status: 403, decision: "deny", finalHost: "final-egress.invalid" },
  ];
  const completedProbes = Array.isArray(body.probes) ? body.probes : [];
  const validIpv4 = (address) => typeof address === "string" &&
    /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(address) &&
    address.split(".").every((octet) => Number(octet) <= 255);
  if (body.status === "inconclusive" && body.blockedProbe) {
    const blocked = body.blockedProbe;
    const validPrefix = completedProbes.length >= 1 && completedProbes.length < expectedDenials.length &&
      JSON.stringify(completedProbes) === JSON.stringify(expectedDenials.slice(0, completedProbes.length));
    if (
      !validPrefix ||
      blocked.name !== expectedDenials[completedProbes.length]?.name ||
      blocked.status !== "blocked" ||
      blocked.decision !== "unverified" ||
      blocked.failure !== "untrusted-interception-certificate" ||
      blocked.errorCode !== "SELF_SIGNED_CERT_IN_CHAIN"
    ) {
      throw new Error(`Egress probe returned an unsupported partial result: ${JSON.stringify(body)}`);
    }
    process.stdout.write(`${JSON.stringify(body)}\n`);
    process.stdout.write(`Only ${completedProbes.length}/${expectedDenials.length} fixed denial responses were verified. The next HTTPS probe (${blocked.name}) failed closed on the local interception certificate; HTTPS interception and positive TLS remain unverified release gates.\n`);
  } else {
    const denials = completedProbes.slice(0, expectedDenials.length);
    const tls = completedProbes[expectedDenials.length];
    if (JSON.stringify(denials) !== JSON.stringify(expectedDenials)) {
      throw new Error(`Egress probe did not match the expected fixed denial cases: ${JSON.stringify(denials)}`);
    }
    if (completedProbes.length !== 4 || tls?.name !== "pinned-tls") {
      throw new Error(`Egress probe returned an invalid result set: ${JSON.stringify(completedProbes)}`);
    }

    if (body.status === "inconclusive") {
      const notUntrustedCertificateResult =
        tls.status !== "blocked" ||
        tls.decision !== "unverified" ||
        tls.failure !== "untrusted-interception-certificate" ||
        tls.errorCode !== "SELF_SIGNED_CERT_IN_CHAIN" ||
        tls.authorized !== false;
      const exactDefaultDeny =
        tls.status === "blocked" &&
        tls.decision === "deny" &&
        tls.failure === "default-deny" &&
        tls.responseStatus === 403 &&
        tls.authorized === false;
      const safeFailureCode = typeof tls.failureCode === "string" && /^[A-Za-z0-9_]{1,64}$/.test(tls.failureCode);
      const tlsProbeFailedClosed =
        tls.status === "blocked" &&
        tls.decision === "deny" &&
        tls.failure === "pinned-tls-probe-failed" &&
        tls.responseStatus === 502 &&
        tls.authorized === false &&
        safeFailureCode;
      if (notUntrustedCertificateResult && !exactDefaultDeny && !tlsProbeFailedClosed) {
        throw new Error(`Egress probe returned an unsupported inconclusive result: ${JSON.stringify(tls)}`);
      }
      process.stdout.write(`${JSON.stringify(body)}\n`);
      const tlsSummary = tls.failure === "default-deny"
        ? "The TLS URL was denied by the default-deny policy; the pinned TLS route did not demonstrate a handshake."
        : `The TLS-only probe failed closed (${tls.failure}${tls.failureCode ? `: ${tls.failureCode}` : ""}).`;
      process.stdout.write(`All three fixed deny probes PASSED. ${tlsSummary} Positive TLS remains an open release gate.\n`);
    } else {
      if (
        tls.status !== 200 ||
        tls.decision !== "pinned-tls-pass" ||
        tls.hostname !== "example.com" ||
        tls.servername !== "example.com" ||
        tls.authorized !== true ||
        !validIpv4(tls.selectedAddress) ||
        tls.remoteAddress !== tls.selectedAddress ||
        tls.addressFamily !== 4 ||
        !Number.isSafeInteger(tls.resolvedAddressCount) ||
        tls.resolvedAddressCount < 1 ||
        tls.resolvedAddressCount > 16
      ) {
        throw new Error(`Egress probe did not prove the fixed-host TLS handshake contract: ${JSON.stringify(tls)}`);
      }
      process.stdout.write(`${JSON.stringify(body)}\n`);
      process.stdout.write("Container egress prototype PASSED under Docker/Workerd. Scope is limited to fixed .invalid denial probes and one example.com TLS handshake with no HTTP request to the site; it is not a browser or public-site security approval.\n");
    }
  }
} finally {
  if (server) await stopWorker(server);
  const resolvedTempRoot = resolve(tempRoot);
  if (dirname(resolvedTempRoot) !== resolve(tmpdir()) || !basename(resolvedTempRoot).startsWith("sitetruth-egress-ci-")) {
    throw new Error("Refusing to remove prototype persistence outside its generated temporary directory");
  }
  await rm(tempRoot, { recursive: true, force: true });
}
