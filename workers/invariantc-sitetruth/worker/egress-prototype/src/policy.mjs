import {
  isSafePublicIpv4Address,
  probePinnedTlsHost,
  TLS_PROBE_HOSTNAME,
  TLS_PROBE_PATH,
} from "./pinned-tls.mjs";

const REDIRECT_PROBE_HOST = "redirect-egress.invalid";
const FINAL_PROBE_HOST = "final-egress.invalid";

function deniedResponse(reason = "default-deny", status = 403) {
  return new Response("Outbound request denied by SiteTruth egress prototype.\n", {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "x-sitetruth-egress-decision": "deny",
      "x-sitetruth-egress-reason": reason,
    },
  });
}

/**
 * A default-deny egress policy with one fixed synthetic redirect and one
 * fixed-host TLS-handshake-only probe. It never forwards an HTTP request.
 */
function validPinnedTlsEvidence(value) {
  return value?.hostname === TLS_PROBE_HOSTNAME &&
    value?.servername === TLS_PROBE_HOSTNAME &&
    value?.authorized === true &&
    isSafePublicIpv4Address(value?.selectedAddress) &&
    value?.remoteAddress === value.selectedAddress &&
    value?.addressFamily === 4 &&
    Number.isSafeInteger(value?.resolvedAddressCount) && value.resolvedAddressCount > 0;
}

/** Deny all traffic except the synthetic redirect and a fixed TLS-only probe. */
export async function handleOutboundRequest(request, { probeTls = probePinnedTlsHost } = {}) {
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return deniedResponse("invalid-url");
  }

  if (request.method !== "GET") return deniedResponse("method-not-allowed");
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
    return deniedResponse("scheme-or-authority-not-allowed");
  }

  if (
    url.protocol === "https:" &&
    url.hostname === REDIRECT_PROBE_HOST &&
    url.pathname === "/start" &&
    url.search === ""
  ) {
    return new Response(null, {
      status: 302,
      headers: {
        "cache-control": "no-store",
        location: `https://${FINAL_PROBE_HOST}/blocked`,
        "x-sitetruth-egress-decision": "synthetic-redirect",
      },
    });
  }

  if (
    url.protocol === "https:" &&
    url.hostname === TLS_PROBE_HOSTNAME &&
    url.port === "" &&
    url.pathname === TLS_PROBE_PATH &&
    url.search === "" &&
    url.hash === "" &&
    request.body === null
  ) {
    try {
      const evidence = await probeTls(TLS_PROBE_HOSTNAME);
      if (!validPinnedTlsEvidence(evidence)) return deniedResponse("pinned-tls-validation-failed", 502);
      return new Response(JSON.stringify({ status: "pass", evidence }), {
        headers: {
          "cache-control": "no-store",
          "content-type": "application/json; charset=utf-8",
          "x-sitetruth-egress-decision": "pinned-tls-pass",
        },
      });
    } catch {
      return deniedResponse("pinned-tls-probe-failed", 502);
    }
  }

  return deniedResponse();
}
