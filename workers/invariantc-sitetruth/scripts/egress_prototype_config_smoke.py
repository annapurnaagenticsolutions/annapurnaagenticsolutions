#!/usr/bin/env python3
"""Structural smoke for the isolated, default-deny Container egress prototype."""
from pathlib import Path
import tomllib


ROOT = Path(__file__).resolve().parents[1]
PROTOTYPE = ROOT / "worker" / "egress-prototype"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"Egress prototype config smoke FAILED: {message}")


with (PROTOTYPE / "wrangler.toml").open("rb") as stream:
    config = tomllib.load(stream)

require(config.get("name") == "invariantc-sitetruth-egress-prototype", "prototype must have a distinct Worker name")
require(config.get("workers_dev") is False, "prototype must not be published to workers.dev")
require("enable_ctx_exports" in config.get("compatibility_flags", []), "WorkerEntrypoint egress binding requires ctx.exports compatibility")
require(config.get("vars", {}).get("EGRESS_PROBE_MODE") == "disabled", "probe route must be disabled by default")
require(not config.get("routes") and not config.get("d1_databases") and not config.get("r2_buckets"), "prototype must have no public routes or shared data bindings")

containers = config.get("containers", [])
require(len(containers) == 1, "exactly one ephemeral prototype Container must be configured")
container = containers[0]
require(container.get("class_name") == "EgressProbe", "Container class binding is inconsistent")
require(container.get("scheduling_policy") == "durable_object", "Container must use the Durable Object scheduling policy")
require(container.get("images", {}).get("probe", {}).get("dockerfile") == "./Dockerfile", "named image must use the prototype Dockerfile")
require("max_instances" not in container, "durable_object policy does not support max_instances")

binding = config.get("durable_objects", {}).get("bindings", [])
require(binding == [{"name": "EGRESS_PROBE", "class_name": "EgressProbe"}], "prototype DO binding must be isolated")
require(config.get("exports", {}).get("EgressProbe") == {"type": "durable-object", "storage": "sqlite"}, "prototype DO export must use SQLite")
require(config.get("exports", {}).get("DenyAllOutbound", {}).get("type") == "worker", "deny handler must be an explicit WorkerEntrypoint export")
require(config.get("exports", {}).get("DenyAllOutbound", {}).get("cache", {}).get("enabled") is False, "egress deny/redirect decisions must not be cached")
require((PROTOTYPE / "Dockerfile").is_file() and (PROTOTYPE / "probe.mjs").is_file(), "probe image sources are missing")
tls_source_path = PROTOTYPE / "src" / "pinned-tls.mjs"
require(tls_source_path.is_file(), "fixed-host TLS probe source is missing")

source = (PROTOTYPE / "src" / "index.mjs").read_text(encoding="utf-8")
policy = (PROTOTYPE / "src" / "policy.mjs").read_text(encoding="utf-8")
tls_source = tls_source_path.read_text(encoding="utf-8")
require("enableInternet: false" in source, "container must deny public internet by default")
require("interceptAllOutboundHttp" in source and 'interceptOutboundHttps("*"' in source, "all HTTP and HTTPS interception must be installed")
require("ctx.exports.DenyAllOutbound" in source, "egress must route through the WorkerEntrypoint")
require("fetch(" not in policy and "return fetch(request)" not in source, "deny policy must not contain a pass-through fetch")
require('"node:dns"' in tls_source and "resolve4" in tls_source, "fixed TLS probe must resolve its IPv4 destination")
require('"node:tls"' in tls_source and "tls.connect" in tls_source, "fixed TLS probe must use a TLS socket")
require('export const TLS_PROBE_HOSTNAME = "example.com"' in tls_source, "TLS probe hostname must stay fixed")
require(
    "function pinnedIpv4Lookup(hostname, address)" in tls_source
    and 'requestedHost !== hostname' in tls_source
    and 'done(null, [{ address, family: 4 }])' in tls_source
    and 'done(null, address, 4)' in tls_source
    and 'host: hostname' in tls_source
    and 'lookup: pinnedIpv4Lookup(hostname, address)' in tls_source
    and 'servername: hostname' in tls_source,
    "TLS socket must preserve hostname interception while pinning lookup to the checked IPv4 address",
)
require("rejectUnauthorized: true" in tls_source and "remoteAddress !== address" in tls_source, "TLS probe must verify certificate and connected peer")
require('TLS_PROBE_PATH = "/.well-known/sitetruth-egress-tls-probe"' in tls_source, "TLS probe path must stay fixed")
require("TLS_PROBE_PATH" in policy and "probePinnedTlsHost" in policy, "only the exact fixed TLS probe may invoke the socket probe")
require("_ci/egress" in source and 'EGRESS_PROBE_MODE !== "ci"' in source, "execution route must be gated to explicit CI mode")
require("127.0.0.1" in source, "execution route must require a loopback hostname")
require("redirect-egress.invalid" in policy and "final-egress.invalid" in policy, "redirect test must use only fixed .invalid names")

print("Egress prototype config smoke PASSED: isolated Worker, no public route or shared data, internet disabled, all HTTP/S intercepted, default-deny handler, fixed-host TLS handshake-only probe, CI-loopback entrypoint.")
print("This structural check does not run Wrangler, Docker, Workerd, or Cloudflare Container networking.")
