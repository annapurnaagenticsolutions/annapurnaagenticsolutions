const KEY_HEX = /^[0-9a-f]{64}$/;
const KEY_ID = /^[A-Za-z0-9_-]{1,32}$/;
const HASH_HEX = /^[0-9a-f]{64}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const MAX_JSON_DEPTH = 64;

export class ScanPayloadError extends Error {
  constructor(code) {
    super(code);
    this.name = "ScanPayloadError";
    this.code = code;
  }
}

function canonicalJsonAtDepth(value, depth) {
  if (depth > MAX_JSON_DEPTH) throw new ScanPayloadError("payload_nesting_exceeded");
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new ScanPayloadError("invalid_payload_number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJsonAtDepth(item, depth + 1)).join(",")}]`;
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ScanPayloadError("invalid_payload_value");
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJsonAtDepth(value[key], depth + 1)}`).join(",")}}`;
}

export function canonicalJson(value) {
  return canonicalJsonAtDepth(value, 0);
}

export async function sha256Hex(value) {
  const input = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function decodeKey(keyHex) {
  if (typeof keyHex !== "string" || !KEY_HEX.test(keyHex)) throw new ScanPayloadError("encryption_key_unavailable");
  const key = new Uint8Array(32);
  for (let index = 0; index < key.length; index += 1) {
    key[index] = Number.parseInt(keyHex.slice(index * 2, index * 2 + 2), 16);
  }
  return key;
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64Url(value) {
  if (typeof value !== "string" || !BASE64URL.test(value)) throw new ScanPayloadError("invalid_encrypted_payload");
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function associatedData({ tenantId, scanId, originId, payloadKeyId, payloadSha256 }) {
  if (![tenantId, scanId, originId].every((value) => typeof value === "string") ||
      !KEY_ID.test(payloadKeyId ?? "") || !HASH_HEX.test(payloadSha256 ?? "")) {
    throw new ScanPayloadError("invalid_payload_binding");
  }
  return new TextEncoder().encode(canonicalJson([
    "sitetruth-scan-payload-v1", payloadKeyId, tenantId, scanId, originId, payloadSha256,
  ]));
}

async function importAesKey(keyHex, usage) {
  return crypto.subtle.importKey("raw", decodeKey(keyHex), { name: "AES-GCM" }, false, [usage]);
}

export async function encryptScanPayload(payload, keyHex, binding) {
  const plaintext = canonicalJson(payload);
  const payloadSha256 = await sha256Hex(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importAesKey(keyHex, "encrypt");
  const ciphertext = await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv,
    additionalData: associatedData({ ...binding, payloadSha256 }),
    tagLength: 128,
  }, key, new TextEncoder().encode(plaintext));
  return {
    payloadKeyId: binding.payloadKeyId,
    payloadSha256,
    nonceB64Url: toBase64Url(iv),
    ciphertextB64Url: toBase64Url(new Uint8Array(ciphertext)),
  };
}

export async function decryptScanPayload(envelope, keyHex, binding) {
  if (!envelope || !HASH_HEX.test(envelope.payloadSha256 ?? "") ||
      !KEY_ID.test(envelope.payloadKeyId ?? "") || binding?.payloadKeyId !== envelope.payloadKeyId) {
    throw new ScanPayloadError("invalid_encrypted_payload");
  }
  const iv = fromBase64Url(envelope.nonceB64Url);
  const ciphertext = fromBase64Url(envelope.ciphertextB64Url);
  if (iv.byteLength !== 12 || ciphertext.byteLength < 16) throw new ScanPayloadError("invalid_encrypted_payload");
  const key = await importAesKey(keyHex, "decrypt");
  let plaintextBytes;
  try {
    plaintextBytes = await crypto.subtle.decrypt({
      name: "AES-GCM",
      iv,
      additionalData: associatedData({ ...binding, payloadKeyId: envelope.payloadKeyId, payloadSha256: envelope.payloadSha256 }),
      tagLength: 128,
    }, key, ciphertext);
  } catch {
    throw new ScanPayloadError("encrypted_payload_authentication_failed");
  }
  let plaintext;
  try {
    plaintext = new TextDecoder("utf-8", { fatal: true }).decode(plaintextBytes);
  } catch {
    throw new ScanPayloadError("invalid_encrypted_payload");
  }
  if (await sha256Hex(plaintext) !== envelope.payloadSha256) throw new ScanPayloadError("encrypted_payload_hash_mismatch");
  try {
    return JSON.parse(plaintext);
  } catch {
    throw new ScanPayloadError("invalid_encrypted_payload");
  }
}
