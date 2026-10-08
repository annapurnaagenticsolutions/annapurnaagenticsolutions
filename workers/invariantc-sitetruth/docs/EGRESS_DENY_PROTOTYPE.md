# Isolated Container egress prototype

**Status:** default-deny source, fixed-host TLS handshake-only probe, and CI harness implemented. Hosted local Workerd has refused its first intercepted HTTPS denial request with `SELF_SIGNED_CERT_IN_CHAIN` after the plain HTTP denial passed. CI reports that exact fail-closed condition as inconclusive; it does not prove HTTPS interception or the positive TLS path and does not clear the runtime gate. Not a scanner, browser runtime, staging binding, or security approval.

## Scope

The standalone Worker under `worker/egress-prototype/` has a separate name and configuration. It has no scanner API, D1/R2/KV binding, route, `workers.dev` endpoint, customer input, or enabled-by-default probe. `EGRESS_PROBE_MODE` is `disabled`; only the isolated CI runner overrides it to `ci`, and the local test route additionally requires a loopback request hostname.

The one-shot Durable Object starts a new Container with `enableInternet: false`, registers `interceptAllOutboundHttp()` and `interceptOutboundHttps("*")`, routes both through `DenyAllOutbound`, installs the runtime-injected Cloudflare interception CA at startup, then executes a fixed Node probe with `--use-system-ca` and `NODE_EXTRA_CA_CERTS` pointing to that injected CA. Certificate verification remains enabled. The policy has no general forwarding path. Fixed `.invalid` cases verify default denial and a synthetic redirect from `redirect-egress.invalid` to `final-egress.invalid`. One additional request to the Container's intercepted `https://example.com/.well-known/sitetruth-egress-tls-probe` invokes a trusted Worker-side probe: it resolves A records, rejects the whole answer set if any address falls in a conservative IANA special-purpose IPv4 block, connects only to the selected checked address, explicitly verifies the certificate against `example.com` with `tls.checkServerIdentity`, sets SNI, checks the socket peer address, and returns synthetic JSON only after the handshake. The egress policy independently validates that successful evidence contains an allowed public IPv4 address. The trusted Worker does not send an HTTP request to `example.com`; no page content is read. The probe is fixed to that hostname/path and cannot be used as a general fetch proxy. The special-purpose denylist follows the current [IANA IPv4 special-purpose registry](https://www.iana.org/assignments/iana-ipv4-special-registry); it is defense-in-depth for this fixed IPv4 probe, not a general destination policy.

## Run in the approved hosted CI environment

```bash
npm run verify:egress-prototype-config
npm run worker:egress-prototype-ci
```

The execution command requires `CI=true`, Linux, Docker Engine, and local Wrangler/Workerd. The CI job uses a GitHub-hosted Ubuntu runner, `permissions: contents: read`, no Cloudflare credentials, no deployment command, and a temporary local persistence directory that is removed after the run. On this Windows host, the `docker` command is not installed, so the Container runtime test cannot run locally. Do not enable local probes by weakening the CI/environment guards.

A `pass` result must show status 403 and the `deny` decision for direct HTTP and HTTPS requests, a 403 for the final host after the fixed HTTPS redirect, and a successful TLS-only record where the selected IPv4 address equals `remoteAddress`, SNI is `example.com`, and certificate authorization succeeded. An `inconclusive` result is accepted only when a prefix of the fixed probes has passed and the next intercepted HTTPS request fails closed with the exact `SELF_SIGNED_CERT_IN_CHAIN` error, or all three denial probes pass and that same error blocks the TLS-only request. It validates only the denial responses that completed before the error; it proves no positive TLS behavior. Any other TLS failure remains a CI failure.

Local validation: the focused policy/TLS tests passed (32 tests), including explicit hostname certificate matching and private, metadata, reserved, documentation, benchmarking, multicast, special-purpose and mixed-answer-set rejection before socket creation; the current full JavaScript suite passed (122 passed, 0 failed; one Windows symlink test skipped); four WASM Worker integration tests passed; the Worker and egress config smokes passed; workflow pin and timeout checks passed; and the changed JavaScript files passed `node --check`. The installed esbuild also bundled the current Worker source graph with Cloudflare and Node built-ins external, and the output passed `node --check`; this is a syntax/import graph check only. The hosted Workerd job built the image, returned the plain HTTP deny response, then failed closed on the first intercepted HTTPS request because its local certificate chain was untrusted (`SELF_SIGNED_CERT_IN_CHAIN`) even after explicit Node CA configuration. The CI now records only the completed prefix as inconclusive. No HTTPS-deny, redirect, positive TLS, staging update, or deployment is claimed.

## What this proves and does not prove

Only a `pass` demonstrates the selected Cloudflare Container API configuration and HTTP/S interception for these fixed Node requests under local Docker/Workerd, including one fixed-host TLS handshake through the trusted Worker. An `inconclusive` result demonstrates only the fixed denial responses listed as completed before the local interception certificate was rejected. Neither outcome demonstrates:

- Chromium, Playwright, browser sandboxing, subresources, popup, service worker, WebSocket, QUIC, or browser-specific networking behavior;
- runtime rejection of wrong-host certificates, invalid chains, DNS rebinding, arbitrary destinations, or private/reserved/metadata addresses;
- safe HTTP streaming, redirect-by-redirect revalidation, customer-site behavior, or general address-pinned scanning;
- correct handling of all IPv4/IPv6 private, reserved, metadata, mapped, alternate numeric, or unexpected-port cases;
- deployed Cloudflare edge behavior, account plan/availability, cost, scale, isolation under concurrent tenants, or a supported production configuration;
- security approval or authorization to scan any site.

Cloudflare documents the `durable_object` scheduling policy as public beta. It also documents that processes in a deployed Container using this policy retain root Linux capabilities even when `exec()` specifies another UID/GID. A future browser design must address that sandbox limitation with an independently reviewed boundary or a different runtime. Before any reviewed release, pin the base image and operating-system package inputs by immutable digest/version. The current Cloudflare Containers image and API must not be connected to a scan route.

## Source references

- [Durable Object Container API](https://developers.cloudflare.com/containers/api/durable-object-container/)
- [Container outbound traffic](https://developers.cloudflare.com/containers/configuration/outbound-traffic/)
- [Container scheduling policies](https://developers.cloudflare.com/containers/configuration/scheduling-policy/)
- [Local Container development](https://developers.cloudflare.com/containers/guides/local-dev/)
- [Workers `node:dns`](https://developers.cloudflare.com/workers/runtime-apis/nodejs/dns/)
- [Workers `node:tls`](https://developers.cloudflare.com/workers/runtime-apis/nodejs/tls/)
- [Workers TCP sockets](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/)
- [IANA IPv4 special-purpose address registry](https://www.iana.org/assignments/iana-ipv4-special-registry)
