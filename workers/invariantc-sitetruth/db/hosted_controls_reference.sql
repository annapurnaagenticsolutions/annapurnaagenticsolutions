-- REFERENCE ONLY: not loaded by the current Worker and not a hosted deployment.
-- SQLite/D1-oriented metadata model for a future hosted collector. The service
-- must still perform DNS verification, authenticated tenant checks, DO quota
-- reservations, egress enforcement, R2 deletion and audit handling.
PRAGMA foreign_keys = ON;

CREATE TABLE hosted_tenant_policies (
  tenant_id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  requests_per_minute INTEGER NOT NULL CHECK (requests_per_minute > 0),
  scans_per_day INTEGER NOT NULL CHECK (scans_per_day > 0),
  concurrent_scans INTEGER NOT NULL CHECK (concurrent_scans > 0),
  max_pages_per_scan INTEGER NOT NULL CHECK (max_pages_per_scan > 0),
  max_run_seconds INTEGER NOT NULL CHECK (max_run_seconds > 0),
  artifact_retention_days INTEGER NOT NULL DEFAULT 7 CHECK (artifact_retention_days BETWEEN 1 AND 7)
);

CREATE TABLE hosted_domain_challenges (
  challenge_id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES hosted_tenant_policies(tenant_id) ON DELETE CASCADE,
  hostname_ascii TEXT NOT NULL,
  challenge_sha256 TEXT NOT NULL CHECK (length(challenge_sha256)=64 AND challenge_sha256 NOT GLOB '*[^0-9a-f]*'),
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  UNIQUE (tenant_id, challenge_id, hostname_ascii),
  CHECK (hostname_ascii=lower(hostname_ascii) AND length(hostname_ascii) BETWEEN 4 AND 253
    AND instr(hostname_ascii,'*')=0 AND instr(hostname_ascii,'/')=0 AND instr(hostname_ascii,':')=0),
  CHECK (julianday(expires_at)>julianday(issued_at)
    AND julianday(expires_at)<=julianday(issued_at,'+15 minutes')),
  CHECK (consumed_at IS NULL OR (julianday(consumed_at)>=julianday(issued_at)
    AND julianday(consumed_at)<=julianday(expires_at)))
);

CREATE TRIGGER hosted_challenge_material_immutable
BEFORE UPDATE OF tenant_id,hostname_ascii,challenge_sha256,issued_at,expires_at ON hosted_domain_challenges
BEGIN
  SELECT RAISE(ABORT,'ownership challenge material is immutable');
END;

CREATE TRIGGER hosted_challenge_single_consume
BEFORE UPDATE OF consumed_at ON hosted_domain_challenges
WHEN OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL
BEGIN
  SELECT RAISE(ABORT,'ownership challenge may be consumed once');
END;

CREATE TABLE hosted_verified_origins (
  origin_id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES hosted_tenant_policies(tenant_id) ON DELETE CASCADE,
  hostname_ascii TEXT NOT NULL,
  origin TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  verification_expires_at TEXT NOT NULL,
  revoked_at TEXT,
  UNIQUE (origin_id, tenant_id),
  UNIQUE (tenant_id, origin),
  UNIQUE (tenant_id, challenge_id),
  FOREIGN KEY (tenant_id, challenge_id, hostname_ascii)
    REFERENCES hosted_domain_challenges(tenant_id, challenge_id, hostname_ascii),
  CHECK (origin='https://' || hostname_ascii),
  CHECK (julianday(verification_expires_at)>julianday(verified_at)
    AND julianday(verification_expires_at)<=julianday(verified_at,'+24 hours'))
);

CREATE TRIGGER hosted_origin_identity_immutable
BEFORE UPDATE OF origin_id,tenant_id,hostname_ascii,origin ON hosted_verified_origins
BEGIN
  SELECT RAISE(ABORT,'verified origin identity is immutable');
END;

CREATE TRIGGER hosted_origin_requires_consumed_challenge_insert
BEFORE INSERT ON hosted_verified_origins
WHEN NOT EXISTS (
  SELECT 1 FROM hosted_domain_challenges c
  WHERE c.tenant_id=NEW.tenant_id AND c.challenge_id=NEW.challenge_id
    AND c.hostname_ascii=NEW.hostname_ascii AND c.consumed_at=NEW.verified_at
    AND julianday(c.expires_at)>=julianday(NEW.verified_at)
)
BEGIN
  SELECT RAISE(ABORT,'fresh consumed DNS ownership challenge required');
END;

CREATE TRIGGER hosted_origin_requires_consumed_challenge_update
BEFORE UPDATE OF challenge_id,verified_at,verification_expires_at ON hosted_verified_origins
WHEN NOT EXISTS (
  SELECT 1 FROM hosted_domain_challenges c
  WHERE c.tenant_id=NEW.tenant_id AND c.challenge_id=NEW.challenge_id
    AND c.hostname_ascii=NEW.hostname_ascii AND c.consumed_at=NEW.verified_at
    AND julianday(c.expires_at)>=julianday(NEW.verified_at)
)
BEGIN
  SELECT RAISE(ABORT,'fresh consumed DNS ownership challenge required');
END;

CREATE TRIGGER hosted_origin_reactivation_requires_fresh_challenge
BEFORE UPDATE OF revoked_at ON hosted_verified_origins
WHEN OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS NULL
  AND (NEW.challenge_id=OLD.challenge_id OR julianday(NEW.verified_at)<=julianday(OLD.verified_at))
BEGIN
  SELECT RAISE(ABORT,'reactivation requires a fresh consumed DNS challenge');
END;

CREATE TABLE hosted_scan_jobs (
  scan_id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES hosted_tenant_policies(tenant_id) ON DELETE CASCADE,
  origin_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  capture_spec_sha256 TEXT NOT NULL CHECK (length(capture_spec_sha256)=64 AND capture_spec_sha256 NOT GLOB '*[^0-9a-f]*'),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  created_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  expires_at TEXT NOT NULL,
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (scan_id, tenant_id),
  FOREIGN KEY (origin_id, tenant_id) REFERENCES hosted_verified_origins(origin_id, tenant_id),
  CHECK (julianday(expires_at)>julianday(created_at))
);

CREATE INDEX hosted_scan_jobs_by_tenant_status ON hosted_scan_jobs(tenant_id,status,created_at);
CREATE INDEX hosted_scan_jobs_by_expiry ON hosted_scan_jobs(expires_at);

CREATE TRIGGER hosted_scan_metadata_immutable
BEFORE UPDATE OF tenant_id,origin_id,idempotency_key,capture_spec_sha256,created_at,expires_at ON hosted_scan_jobs
BEGIN
  SELECT RAISE(ABORT,'scan job metadata is immutable');
END;

CREATE TRIGGER hosted_scan_insert_guard
BEFORE INSERT ON hosted_scan_jobs
BEGIN
  SELECT CASE WHEN NEW.status<>'queued'
    THEN RAISE(ABORT,'scan jobs must be created queued') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM hosted_verified_origins o
    WHERE o.origin_id=NEW.origin_id AND o.tenant_id=NEW.tenant_id
      AND o.revoked_at IS NULL AND julianday(o.verification_expires_at)>julianday(NEW.created_at)
  ) THEN RAISE(ABORT,'origin ownership verification is missing, expired, or revoked') END;
  SELECT CASE WHEN julianday(NEW.expires_at)>julianday(NEW.created_at) + (
    SELECT artifact_retention_days FROM hosted_tenant_policies WHERE tenant_id=NEW.tenant_id
  ) THEN RAISE(ABORT,'scan metadata retention exceeds tenant policy') END;
  SELECT CASE WHEN (
    SELECT count(*) FROM hosted_scan_jobs j
    WHERE j.tenant_id=NEW.tenant_id AND date(j.created_at)=date(NEW.created_at)
  ) >= (SELECT scans_per_day FROM hosted_tenant_policies WHERE tenant_id=NEW.tenant_id)
    THEN RAISE(ABORT,'daily scan quota exceeded') END;
  SELECT CASE WHEN (
    SELECT count(*) FROM hosted_scan_jobs j
    WHERE j.tenant_id=NEW.tenant_id AND j.status IN ('queued','running')
  ) >= (SELECT concurrent_scans FROM hosted_tenant_policies WHERE tenant_id=NEW.tenant_id)
    THEN RAISE(ABORT,'concurrent scan quota exceeded') END;
END;

CREATE TRIGGER hosted_scan_state_transition
BEFORE UPDATE OF status ON hosted_scan_jobs
WHEN NOT (
  OLD.status=NEW.status OR
  (OLD.status='queued' AND NEW.status IN ('running','failed','cancelled')) OR
  (OLD.status='running' AND NEW.status IN ('succeeded','failed','cancelled'))
)
BEGIN
  SELECT RAISE(ABORT,'invalid scan job state transition');
END;

CREATE TABLE hosted_redacted_artifacts (
  artifact_id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  scan_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type='application/json'),
  content_sha256 TEXT NOT NULL CHECK (length(content_sha256)=64 AND content_sha256 NOT GLOB '*[^0-9a-f]*'),
  is_redacted INTEGER NOT NULL CHECK (is_redacted=1),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  UNIQUE (scan_id),
  FOREIGN KEY (scan_id,tenant_id) REFERENCES hosted_scan_jobs(scan_id,tenant_id) ON DELETE CASCADE,
  CHECK (julianday(expires_at)>julianday(created_at))
);

CREATE INDEX hosted_artifacts_by_expiry ON hosted_redacted_artifacts(expires_at);

CREATE TRIGGER hosted_artifact_immutable
BEFORE UPDATE ON hosted_redacted_artifacts
BEGIN
  SELECT RAISE(ABORT,'artifact metadata is immutable');
END;

CREATE TRIGGER hosted_artifact_retention_guard
BEFORE INSERT ON hosted_redacted_artifacts
WHEN julianday(NEW.expires_at)>julianday(NEW.created_at) + (
  SELECT p.artifact_retention_days FROM hosted_tenant_policies p WHERE p.tenant_id=NEW.tenant_id
)
BEGIN
  SELECT RAISE(ABORT,'artifact retention exceeds tenant policy');
END;

CREATE TRIGGER hosted_artifact_requires_successful_scan
BEFORE INSERT ON hosted_redacted_artifacts
WHEN NOT EXISTS (
  SELECT 1 FROM hosted_scan_jobs j
  WHERE j.scan_id=NEW.scan_id AND j.tenant_id=NEW.tenant_id AND j.status='succeeded'
)
BEGIN
  SELECT RAISE(ABORT,'artifacts may only be attached to successful scans');
END;
