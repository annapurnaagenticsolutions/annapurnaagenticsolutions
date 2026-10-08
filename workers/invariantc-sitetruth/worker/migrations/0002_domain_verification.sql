CREATE TABLE IF NOT EXISTS domain_challenges (
  challenge_id TEXT PRIMARY KEY NOT NULL CHECK (length(challenge_id) = 22 AND challenge_id NOT GLOB '*[^A-Za-z0-9_-]*'),
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  hostname_ascii TEXT NOT NULL CHECK (
    hostname_ascii = lower(hostname_ascii) AND length(hostname_ascii) BETWEEN 4 AND 229
    AND hostname_ascii NOT GLOB '*[^A-Za-z0-9.-]*'
    AND instr(hostname_ascii, '..') = 0
    AND instr(hostname_ascii, '*') = 0
    AND instr(hostname_ascii, '/') = 0
    AND instr(hostname_ascii, ':') = 0
  ),
  token_sha256 TEXT NOT NULL CHECK (length(token_sha256) = 64 AND token_sha256 NOT GLOB '*[^0-9a-f]*'),
  issued_at_ms INTEGER NOT NULL CHECK (issued_at_ms > 0),
  expires_at_ms INTEGER NOT NULL CHECK (expires_at_ms > issued_at_ms AND expires_at_ms <= issued_at_ms + 900000),
  verification_attempts INTEGER NOT NULL DEFAULT 0 CHECK (verification_attempts BETWEEN 0 AND 5),
  last_attempt_at_ms INTEGER,
  consumed_at_ms INTEGER,
  UNIQUE (tenant_id, challenge_id, hostname_ascii),
  CHECK (last_attempt_at_ms IS NULL OR last_attempt_at_ms >= issued_at_ms),
  CHECK (consumed_at_ms IS NULL OR (consumed_at_ms >= issued_at_ms AND consumed_at_ms <= expires_at_ms))
);

CREATE INDEX IF NOT EXISTS domain_challenges_tenant_host_time
  ON domain_challenges (tenant_id, hostname_ascii, issued_at_ms);

CREATE TRIGGER IF NOT EXISTS domain_challenge_material_immutable
BEFORE UPDATE OF tenant_id, hostname_ascii, token_sha256, issued_at_ms, expires_at_ms
ON domain_challenges
BEGIN
  SELECT RAISE(ABORT, 'domain challenge material is immutable');
END;

CREATE TRIGGER IF NOT EXISTS domain_challenge_single_consume
BEFORE UPDATE OF consumed_at_ms ON domain_challenges
WHEN OLD.consumed_at_ms IS NOT NULL OR NEW.consumed_at_ms IS NULL
BEGIN
  SELECT RAISE(ABORT, 'domain challenge may be consumed once');
END;

CREATE TABLE IF NOT EXISTS verified_origins (
  origin_id TEXT PRIMARY KEY NOT NULL CHECK (length(origin_id) = 22 AND origin_id NOT GLOB '*[^A-Za-z0-9_-]*'),
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  hostname_ascii TEXT NOT NULL,
  origin TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  verified_at_ms INTEGER NOT NULL CHECK (verified_at_ms > 0),
  expires_at_ms INTEGER NOT NULL CHECK (expires_at_ms > verified_at_ms AND expires_at_ms <= verified_at_ms + 86400000),
  revoked_at_ms INTEGER,
  UNIQUE (tenant_id, hostname_ascii),
  UNIQUE (tenant_id, challenge_id),
  FOREIGN KEY (tenant_id, challenge_id, hostname_ascii)
    REFERENCES domain_challenges (tenant_id, challenge_id, hostname_ascii),
  CHECK (origin = 'https://' || hostname_ascii),
  CHECK (revoked_at_ms IS NULL OR revoked_at_ms >= verified_at_ms)
);

CREATE INDEX IF NOT EXISTS verified_origins_tenant_expiry
  ON verified_origins (tenant_id, expires_at_ms, revoked_at_ms);

CREATE TRIGGER IF NOT EXISTS verified_origin_identity_immutable
BEFORE UPDATE OF origin_id, tenant_id, hostname_ascii, origin ON verified_origins
BEGIN
  SELECT RAISE(ABORT, 'verified origin identity is immutable');
END;

CREATE TRIGGER IF NOT EXISTS verified_origin_requires_consumed_challenge_insert
BEFORE INSERT ON verified_origins
WHEN NOT EXISTS (
  SELECT 1 FROM domain_challenges c
  WHERE c.tenant_id = NEW.tenant_id AND c.challenge_id = NEW.challenge_id
    AND c.hostname_ascii = NEW.hostname_ascii AND c.consumed_at_ms = NEW.verified_at_ms
    AND c.expires_at_ms >= NEW.verified_at_ms
)
BEGIN
  SELECT RAISE(ABORT, 'fresh consumed DNS challenge required');
END;

CREATE TRIGGER IF NOT EXISTS verified_origin_requires_consumed_challenge_update
BEFORE UPDATE OF challenge_id, verified_at_ms, expires_at_ms ON verified_origins
WHEN NOT EXISTS (
  SELECT 1 FROM domain_challenges c
  WHERE c.tenant_id = NEW.tenant_id AND c.challenge_id = NEW.challenge_id
    AND c.hostname_ascii = NEW.hostname_ascii AND c.consumed_at_ms = NEW.verified_at_ms
    AND c.expires_at_ms >= NEW.verified_at_ms
)
BEGIN
  SELECT RAISE(ABORT, 'fresh consumed DNS challenge required');
END;
