import { getDomain } from "tldts";

const OPTIONS = Object.freeze({
  allowPrivateDomains: true,
  extractHostname: false,
});

/**
 * The input is an already-normalized hostname from new URL(). Treat a missing
 * registrable domain as non-registrable, covering public and private suffixes.
 */
export function isPublicSuffixHostname(hostname) {
  if (typeof hostname !== "string" || hostname.length === 0) return true;
  return getDomain(hostname, OPTIONS) === null;
}
