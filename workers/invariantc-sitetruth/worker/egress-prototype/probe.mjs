const probes = [
  { name: "http", url: "http://http-egress.invalid/" },
  { name: "https", url: "https://https-egress.invalid/" },
  { name: "redirect", url: "https://redirect-egress.invalid/start" },
];
const tlsProbeUrl = "https://example.com/.well-known/sitetruth-egress-tls-probe";

function nestedErrorCode(error) {
  let cause = error;
  for (let depth = 0; depth < 4 && cause; depth += 1) {
    if (typeof cause.code === "string") return cause.code;
    cause = cause.cause;
  }
  return null;
}

async function runProbe({ name, url }) {
  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    const errorCode = nestedErrorCode(error);
    if (errorCode !== "SELF_SIGNED_CERT_IN_CHAIN") throw error;
    return {
      name,
      status: "blocked",
      decision: "unverified",
      finalHost: new URL(url).hostname,
      failure: "untrusted-interception-certificate",
      errorCode,
    };
  }
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
let blockedProbe;
for (const probe of probes) {
  const result = await runProbe(probe);
  if (result.status === "blocked") {
    blockedProbe = result;
    break;
  }
  results.push(result);
}

if (blockedProbe) {
  process.stdout.write(`${JSON.stringify({
    status: "inconclusive",
    scope: "fixed-invalid-deny-cases-plus-example-com-tls-handshake-only",
    probes: results,
    blockedProbe,
  })}\n`);
} else {
  let tlsResult;
  let tlsInconclusive = false;
  try {
  const tlsResponse = await fetch(tlsProbeUrl, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  const tlsDecision = tlsResponse.headers.get("x-sitetruth-egress-decision");
  const tlsFailureReason = tlsResponse.headers.get("x-sitetruth-egress-reason");
  const tlsFailureCodeHeader = tlsResponse.headers.get("x-sitetruth-egress-failure-code");
  const tlsFailureCode = typeof tlsFailureCodeHeader === "string" && /^[a-z0-9_]{1,64}$/i.test(tlsFailureCodeHeader)
    ? tlsFailureCodeHeader
    : null;
  const responseText = await tlsResponse.text();
  let tlsBody;
  try {
    tlsBody = JSON.parse(responseText);
  } catch {
    const failedClosed =
      (tlsResponse.status === 403 && tlsDecision === "deny" && tlsFailureReason === "default-deny") ||
      (tlsResponse.status === 502 && tlsDecision === "deny" && tlsFailureReason === "pinned-tls-probe-failed");
    if (failedClosed) {
      tlsInconclusive = true;
      tlsResult = {
        name: "pinned-tls",
        status: "blocked",
        decision: "deny",
        failure: tlsFailureReason,
        failureCode: tlsFailureCode,
        responseStatus: tlsResponse.status,
        authorized: false,
      };
    } else {
      throw new Error(`Unexpected TLS-only probe response (${tlsResponse.status}; ${tlsDecision}; ${tlsFailureReason}): ${responseText.slice(0, 200)}`);
    }
  }

  if (!tlsInconclusive) {
    const tlsEvidence = tlsBody?.evidence;
    const ipv4 = typeof tlsEvidence?.selectedAddress === "string" &&
      /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(tlsEvidence.selectedAddress) &&
      tlsEvidence.selectedAddress.split(".").every((octet) => Number(octet) <= 255);
    tlsResult = {
      name: "pinned-tls",
      status: tlsResponse.status,
      decision: tlsDecision,
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
  }
  } catch (error) {
    const errorCode = nestedErrorCode(error);
    if (errorCode !== "SELF_SIGNED_CERT_IN_CHAIN") throw error;
    tlsInconclusive = true;
    tlsResult = {
      name: "pinned-tls",
      status: "blocked",
      decision: "unverified",
      hostname: "example.com",
      authorized: false,
      failure: "untrusted-interception-certificate",
      errorCode,
    };
  }

  process.stdout.write(`${JSON.stringify({
    status: tlsInconclusive ? "inconclusive" : "pass",
    scope: "fixed-invalid-deny-cases-plus-example-com-tls-handshake-only",
    probes: [...results, tlsResult],
  })}\n`);
}
