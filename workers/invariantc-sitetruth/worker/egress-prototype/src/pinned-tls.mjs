import dns from "node:dns";
import tls from "node:tls";

export const TLS_PROBE_HOSTNAME = "example.com";
export const TLS_PROBE_PATH = "/.well-known/sitetruth-egress-tls-probe";

const MAX_DNS_ANSWERS = 16;
const TLS_HANDSHAKE_TIMEOUT_MS = 5_000;
const CANONICAL_IPV4 = /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/;
// Conservative denylist for IANA IPv4 special-purpose allocations. This
// fixed-host probe refuses any such answer, including globally reachable
// protocol-anycast allocations, so a DNS anomaly cannot redirect its socket
// to private, metadata, documentation, multicast, or reserved address space.
const NON_PUBLIC_IPV4_CIDRS = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.31.196.0", 24],
  ["192.52.193.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["192.175.48.0", 24],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

export function isCanonicalIpv4(address) {
  if (typeof address !== "string" || !CANONICAL_IPV4.test(address)) return false;
  const octets = address.split(".").map(Number);
  return octets.every((octet) => octet >= 0 && octet <= 255);
}

function ipv4ToUint32(address) {
  return address.split(".").map(Number).reduce((value, octet) => ((value << 8) | octet) >>> 0, 0);
}

function belongsToCidr(addressValue, network, prefixLength) {
  const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
  return ((addressValue & mask) >>> 0) === ((ipv4ToUint32(network) & mask) >>> 0);
}

export function isSafePublicIpv4Address(address) {
  if (!isCanonicalIpv4(address)) return false;
  const addressValue = ipv4ToUint32(address);
  return !NON_PUBLIC_IPV4_CIDRS.some(([network, prefixLength]) =>
    belongsToCidr(addressValue, network, prefixLength));
}

function normalizedIpv4RemoteAddress(address) {
  if (isCanonicalIpv4(address)) return address;
  const mapped = typeof address === "string" ? /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address) : null;
  return mapped && isCanonicalIpv4(mapped[1]) ? mapped[1] : null;
}

function normalizeAnswers(addresses) {
  if (!Array.isArray(addresses) || addresses.length < 1 || addresses.length > MAX_DNS_ANSWERS) {
    throw new Error("pinned_tls_dns_answer_count_invalid");
  }
  const unique = [...new Set(addresses)];
  if (unique.some((address) => !isCanonicalIpv4(address))) {
    throw new Error("pinned_tls_dns_answer_invalid");
  }
  return unique;
}

function connectAndVerify(hostname, address, {
  connectTls = tls.connect,
  timeoutMs = TLS_HANDSHAKE_TIMEOUT_MS,
} = {}) {
  return new Promise((resolve, reject) => {
    let socket;
    let settled = false;
    const timer = setTimeout(() => finish(new Error("pinned_tls_handshake_timeout")), timeoutMs);

    const finish = (error, evidence) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        try { socket?.destroy(); } catch { /* best-effort close after failure */ }
        reject(error);
      } else {
        try { socket.end(); } catch { /* the handshake is already complete */ }
        resolve(evidence);
      }
    };

    try {
      socket = connectTls({
        host: address,
        port: 443,
        servername: hostname,
        checkServerIdentity: (serverName, certificate) => {
          if (serverName !== hostname) return new Error("pinned_tls_server_name_mismatch");
          return tls.checkServerIdentity(hostname, certificate);
        },
        rejectUnauthorized: true,
        ALPNProtocols: ["http/1.1"],
      });
    } catch {
      finish(new Error("pinned_tls_connection_failed"));
      return;
    }

    socket.once("secureConnect", () => {
      const remoteAddress = normalizedIpv4RemoteAddress(socket.remoteAddress);
      if (!socket.authorized || remoteAddress !== address || socket.servername !== hostname) {
        finish(new Error("pinned_tls_peer_validation_failed"));
        return;
      }
      finish(null, {
        hostname,
        selectedAddress: address,
        remoteAddress,
        servername: socket.servername,
        authorized: true,
        addressFamily: 4,
      });
    });
    socket.once("error", () => finish(new Error("pinned_tls_connection_failed")));
    socket.once("close", () => {
      if (!settled) finish(new Error("pinned_tls_connection_closed_early"));
    });
  });
}

/**
 * CI-only architecture probe. The caller can select exactly one fixed public
 * test hostname; the TCP destination is the checked A-record address. This
 * function performs a TLS handshake only and never sends an HTTP request.
 */
export async function probePinnedTlsHost(hostname, dependencies = {}) {
  if (hostname !== TLS_PROBE_HOSTNAME) throw new Error("pinned_tls_hostname_not_allowed");
  const resolve4 = dependencies.resolve4 ?? ((host) => dns.promises.resolve4(host));
  const addresses = normalizeAnswers(await resolve4(hostname));
  if (addresses.some((address) => !isSafePublicIpv4Address(address))) {
    throw new Error("pinned_tls_dns_answer_not_public");
  }
  const selectedAddress = addresses[0];
  const evidence = await connectAndVerify(hostname, selectedAddress, dependencies);
  return { ...evidence, resolvedAddressCount: addresses.length };
}
