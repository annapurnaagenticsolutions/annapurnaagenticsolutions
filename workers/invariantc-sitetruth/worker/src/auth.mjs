const TOKEN_PATTERN = /^stp_([A-Za-z0-9_-]{22})_([A-Za-z0-9_-]{43})$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;

export class AuthenticationUnavailableError extends Error {}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function equalHash(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || !HASH_PATTERN.test(left) || !HASH_PATTERN.test(right)) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function validPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export async function authenticateTenant(request, env) {
  if (!env?.DB) throw new AuthenticationUnavailableError("Tenant database is not configured");
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return null;
  const match = TOKEN_PATTERN.exec(authorization.slice(7));
  if (!match) return null;
  const [, keyId, secret] = match;

  const row = await env.DB.prepare(`
    SELECT k.token_sha256, t.tenant_id, t.requests_per_minute,
           t.requests_per_day, t.max_concurrent
      FROM api_keys AS k
      JOIN tenants AS t ON t.tenant_id = k.tenant_id
     WHERE k.key_id = ?
       AND k.status = 'active'
       AND t.status = 'active'
       AND (k.expires_at_ms IS NULL OR k.expires_at_ms > ?)
  `).bind(keyId, Date.now()).first();
  if (!row) return null;

  const submittedHash = await sha256Hex(secret);
  if (!equalHash(submittedHash, row.token_sha256)) return null;
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(row.tenant_id ?? "")) {
    throw new AuthenticationUnavailableError("Tenant record is invalid");
  }
  if (![row.requests_per_minute, row.requests_per_day, row.max_concurrent].every(validPositiveInteger)) {
    throw new AuthenticationUnavailableError("Tenant quota policy is not configured");
  }

  return {
    tenantId: row.tenant_id,
    requestsPerMinute: row.requests_per_minute,
    requestsPerDay: row.requests_per_day,
    maxConcurrent: row.max_concurrent,
  };
}
