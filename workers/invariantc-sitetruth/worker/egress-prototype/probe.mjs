const probes = [
  { name: "http", url: "http://http-egress.invalid/" },
  { name: "https", url: "https://https-egress.invalid/" },
  { name: "redirect", url: "https://redirect-egress.invalid/start" },
];
const tlsProbeUrl = "https://example.com/.well-known/sitetruth-egress-tls-probe";

async function runProbe({ name, url }) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(5_000),
  });
  const decision = response.headers.get("x-sitetruth-egress-decision");
  const result = {
    name,
    status: response.status,
    decision,
    finalHost: new URL(response.url).hostname,
  };

  const expectedFinalHost = name === "redirect" ? "final-egress.invalid" : new URL(url).hostname;
  if (response.status !== 403 || decision !== "deny" || result.finalHost !== expectedFinalHost) {
    throw new Error(`Unexpected ${name} probe result: ${JSON.stringify(result)}`);
  }
  await response.arrayBuffer();
  return result;
}

const results = [];
for (const probe of probes) results.push(await runProbe(probe));

const tlsResponse = await fetch(tlsProbeUrl, {
  method: "GET",
  redirect: "manual",
  signal: AbortSignal.timeout(10_000),
});
const tlsBody = await tlsResponse.json();
const tlsEvidence = tlsBody?.evidence;
const ipv4 = typeof tlsEvidence?.selectedAddress === "string" &&
  /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(tlsEvidence.selectedAddress) &&
  tlsEvidence.selectedAddress.split(".").every((octet) => Number(octet) <= 255);
const tlsResult = {
  name: "pinned-tls",
  status: tlsResponse.status,
  decision: tlsResponse.headers.get("x-sitetruth-egress-decision"),
  hostname: tlsEvidence?.hostname,
  selectedAddress: tlsEvidence?.selectedAddress,
  remoteAddress: tlsEvidence?.remoteAddress,
  servername: tlsEvidence?.servername,
  authorized: tlsEvidence?.authorized,
  addressFamily: tlsEvidence?.addressFamily,
  resolvedAddressCount: tlsEvidence?.resolvedAddressCount,
};
if (
  tlsResponse.status !== 200 ||
  tlsResult.decision !== "pinned-tls-pass" ||
  tlsBody.status !== "pass" ||
  tlsResult.hostname !== "example.com" ||
  tlsResult.servername !== "example.com" ||
  tlsResult.authorized !== true ||
  !ipv4 ||
  tlsResult.remoteAddress !== tlsResult.selectedAddress ||
  tlsResult.addressFamily !== 4 ||
  !Number.isSafeInteger(tlsResult.resolvedAddressCount) ||
  tlsResult.resolvedAddressCount < 1 ||
  tlsResult.resolvedAddressCount > 16
) {
  throw new Error(`Unexpected pinned TLS probe result: ${JSON.stringify(tlsResult)}`);
}

process.stdout.write(`${JSON.stringify({
  status: "pass",
  scope: "fixed-invalid-deny-cases-plus-example-com-tls-handshake-only",
  probes: [...results, tlsResult],
})}\n`);
