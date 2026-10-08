import { DurableObject, WorkerEntrypoint } from "cloudflare:workers";
import { handleOutboundRequest } from "./policy.mjs";

const PROBE_TIMEOUT_MS = 15_000;
const MAX_OUTPUT_BYTES = 16_384;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export class DenyAllOutbound extends WorkerEntrypoint {
  fetch(request) {
    return handleOutboundRequest(request);
  }
}

export class EgressProbe extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/run" || request.method !== "POST") {
      return new Response("Not found\n", { status: 404 });
    }

    const container = this.ctx.container;
    if (!container) return jsonResponse({ status: "blocked", reason: "container-binding-missing" }, 503);

    const deadline = new AbortController();
    const timeout = setTimeout(() => deadline.abort("egress probe time limit exceeded"), PROBE_TIMEOUT_MS);
    try {
      if (container.running) await container.destroy();

      const egressWorker = this.ctx.exports.DenyAllOutbound({ props: {} });
      await container.interceptAllOutboundHttp(egressWorker);
      await container.interceptOutboundHttps("*", egressWorker);

      container.start({
        image: container.images.probe,
        enableInternet: false,
        entrypoint: [
          "sh", "-lc",
          "set -eu; test -s /etc/cloudflare/certs/cloudflare-containers-ca.crt; cp /etc/cloudflare/certs/cloudflare-containers-ca.crt /usr/local/share/ca-certificates/cloudflare-containers-ca.crt; update-ca-certificates >/dev/null; exec sleep infinity",
        ],
      });

      // Node needs the injected interception CA explicitly; certificate verification stays enabled.
      const process = await container.exec([
        "sh", "-lc",
        "NODE_EXTRA_CA_CERTS=/etc/cloudflare/certs/cloudflare-containers-ca.crt exec node --use-system-ca /app/probe.mjs",
      ], {
        cwd: "/app",
        signal: deadline.signal,
        user: "1000:1000",
      });
      const output = await process.output();
      const stdout = new Uint8Array(output.stdout);
      const stderr = new Uint8Array(output.stderr);
      if (stdout.byteLength + stderr.byteLength > MAX_OUTPUT_BYTES) {
        return jsonResponse({ status: "blocked", reason: "probe-output-limit" }, 502);
      }
      if (output.exitCode !== 0 || stderr.byteLength > 0) {
        return jsonResponse({
          status: "blocked",
          reason: "probe-failed",
          exitCode: output.exitCode,
          stderr: new TextDecoder().decode(stderr).slice(0, 2_000),
        }, 502);
      }
      return new Response(stdout, {
        headers: {
          "cache-control": "no-store",
          "content-type": "application/json; charset=utf-8",
        },
      });
    } catch (error) {
      return jsonResponse({ status: "blocked", reason: "probe-error", message: String(error).slice(0, 500) }, 502);
    } finally {
      clearTimeout(timeout);
      try {
        if (container.running) await container.destroy();
      } catch {
        // The next invocation starts from a fresh container and remains default-deny.
      }
    }
  }
}

export default {
  async fetch(request, env) {
    if (env.EGRESS_PROBE_MODE !== "ci") return new Response("Not found\n", { status: 404 });

    const url = new URL(request.url);
    if (!LOOPBACK_HOSTS.has(url.hostname)) return new Response("Not found\n", { status: 404 });
    if (url.pathname === "/_ci/health" && request.method === "GET") {
      return jsonResponse({ status: "ready", mode: "synthetic-egress-probe" });
    }
    if (url.pathname !== "/_ci/egress" || request.method !== "POST") {
      return new Response("Not found\n", { status: 404 });
    }

    const id = env.EGRESS_PROBE.idFromName("one-shot-ci-egress-probe");
    return env.EGRESS_PROBE.get(id).fetch("https://egress-probe.internal/run", { method: "POST" });
  },
};
