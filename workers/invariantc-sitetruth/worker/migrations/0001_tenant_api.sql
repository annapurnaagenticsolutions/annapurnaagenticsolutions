-- Pilot API identity and quota policy only. No contract, observation, report, or end-user PII is stored.
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id TEXT PRIMARY KEY NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 80 AND tenant_id NOT GLOB '*[^A-Za-z0-9_-]*'),
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended')),
  requests_per_minute INTEGER CHECK (requests_per_minute IS NULL OR (typeof(requests_per_minute) = 'integer' AND requests_per_minute > 0)),
  requests_per_day INTEGER CHECK (requests_per_day IS NULL OR (typeof(requests_per_day) = 'integer' AND requests_per_day > 0)),
  max_concurrent INTEGER CHECK (max_concurrent IS NULL OR (typeof(max_concurrent) = 'integer' AND max_concurrent > 0)),
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms > 0),
  CHECK (
    (requests_per_minute IS NULL AND requests_per_day IS NULL AND max_concurrent IS NULL)
    OR (requests_per_minute IS NOT NULL AND requests_per_day IS NOT NULL AND max_concurrent IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS api_keys (
  key_id TEXT PRIMARY KEY NOT NULL CHECK (length(key_id) = 22 AND key_id NOT GLOB '*[^A-Za-z0-9_-]*'),
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  token_sha256 TEXT NOT NULL UNIQUE CHECK (length(token_sha256) = 64 AND token_sha256 NOT GLOB '*[^0-9a-f]*'),
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms > 0),
  expires_at_ms INTEGER NOT NULL CHECK (expires_at_ms > created_at_ms),
  revoked_at_ms INTEGER CHECK (revoked_at_ms IS NULL OR revoked_at_ms >= created_at_ms)
);

CREATE INDEX IF NOT EXISTS api_keys_tenant_status ON api_keys (tenant_id, status);
