-- Scan control metadata and redacted-artifact retention. This migration does not
-- add a scan route, browser binding, queue, or R2 binding.
CREATE TABLE IF NOT EXISTS scan_policies (
  tenant_id TEXT PRIMARY KEY NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  scan_requests_per_minute INTEGER NOT NULL CHECK (typeof(scan_requests_per_minute) = 'integer' AND scan_requests_per_minute > 0),
  scans_per_day INTEGER NOT NULL CHECK (typeof(scans_per_day) = 'integer' AND scans_per_day > 0),
  max_concurrent_scans INTEGER NOT NULL CHECK (typeof(max_concurrent_scans) = 'integer' AND max_concurrent_scans > 0),
  max_pages_per_scan INTEGER NOT NULL CHECK (typeof(max_pages_per_scan) = 'integer' AND max_pages_per_scan > 0),
  max_run_seconds INTEGER NOT NULL CHECK (typeof(max_run_seconds) = 'integer' AND max_run_seconds > 0),
  max_report_bytes INTEGER NOT NULL CHECK (typeof(max_report_bytes) = 'integer' AND max_report_bytes > 0),
  artifact_retention_days INTEGER NOT NULL CHECK (artifact_retention_days BETWEEN 1 AND 7),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS verified_origins_tenant_origin_id
  ON verified_origins (tenant_id, origin_id);

CREATE TABLE IF NOT EXISTS scan_jobs (
  scan_id TEXT PRIMARY KEY NOT NULL CHECK (length(scan_id) = 22 AND scan_id NOT GLOB '*[^A-Za-z0-9_-]*'),
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  origin_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL CHECK (
    length(idempotency_key) BETWEEN 16 AND 128 AND idempotency_key NOT GLOB '*[^A-Za-z0-9_.-]*'
  ),
  capture_spec_sha256 TEXT NOT NULL CHECK (length(capture_spec_sha256) = 64 AND capture_spec_sha256 NOT GLOB '*[^0-9a-f]*'),
  page_limit INTEGER NOT NULL CHECK (typeof(page_limit) = 'integer' AND page_limit > 0),
  run_budget_seconds INTEGER NOT NULL CHECK (typeof(run_budget_seconds) = 'integer' AND run_budget_seconds > 0),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms > 0),
  started_at_ms INTEGER,
  finished_at_ms INTEGER,
  expires_at_ms INTEGER NOT NULL CHECK (expires_at_ms > created_at_ms),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (scan_id, tenant_id),
  FOREIGN KEY (tenant_id, origin_id) REFERENCES verified_origins (tenant_id, origin_id),
  CHECK (started_at_ms IS NULL OR started_at_ms >= created_at_ms),
  CHECK (finished_at_ms IS NULL OR finished_at_ms >= COALESCE(started_at_ms, created_at_ms))
);

CREATE INDEX IF NOT EXISTS scan_jobs_tenant_status_created
  ON scan_jobs (tenant_id, status, created_at_ms);
CREATE INDEX IF NOT EXISTS scan_jobs_expiry
  ON scan_jobs (expires_at_ms);

CREATE TRIGGER IF NOT EXISTS scan_job_insert_guard
BEFORE INSERT ON scan_jobs
BEGIN
  SELECT RAISE(ABORT, 'scan jobs must be created queued')
   WHERE NEW.status <> 'queued' OR NEW.started_at_ms IS NOT NULL OR NEW.finished_at_ms IS NOT NULL;
  SELECT RAISE(ABORT, 'active tenant, scan policy, and fresh verified origin required')
   WHERE NOT EXISTS (
    SELECT 1 FROM tenants t
    JOIN scan_policies p ON p.tenant_id = t.tenant_id
    JOIN verified_origins o ON o.tenant_id = t.tenant_id
    WHERE t.tenant_id = NEW.tenant_id AND t.status = 'active'
      AND o.origin_id = NEW.origin_id AND o.revoked_at_ms IS NULL
      AND o.expires_at_ms > NEW.created_at_ms
      AND NEW.page_limit <= p.max_pages_per_scan
      AND NEW.run_budget_seconds <= p.max_run_seconds
      AND NEW.expires_at_ms <= NEW.created_at_ms + p.artifact_retention_days * 86400000
  );
  SELECT RAISE(ABORT, 'scan request rate limit exceeded')
   WHERE (
    SELECT COUNT(*) FROM scan_jobs j
    WHERE j.tenant_id = NEW.tenant_id AND j.created_at_ms > NEW.created_at_ms - 60000
  ) >= (SELECT scan_requests_per_minute FROM scan_policies WHERE tenant_id = NEW.tenant_id);
  SELECT RAISE(ABORT, 'daily scan quota exceeded')
   WHERE (
    SELECT COUNT(*) FROM scan_jobs j
    WHERE j.tenant_id = NEW.tenant_id AND j.created_at_ms > NEW.created_at_ms - 86400000
  ) >= (SELECT scans_per_day FROM scan_policies WHERE tenant_id = NEW.tenant_id);
  SELECT RAISE(ABORT, 'concurrent scan quota exceeded')
   WHERE (
    SELECT COUNT(*) FROM scan_jobs j
    WHERE j.tenant_id = NEW.tenant_id AND j.status IN ('queued', 'running')
  ) >= (SELECT max_concurrent_scans FROM scan_policies WHERE tenant_id = NEW.tenant_id);
END;

CREATE TRIGGER IF NOT EXISTS scan_job_metadata_immutable
BEFORE UPDATE OF tenant_id, origin_id, idempotency_key, capture_spec_sha256, page_limit, run_budget_seconds, created_at_ms, expires_at_ms
ON scan_jobs
BEGIN
  SELECT RAISE(ABORT, 'scan job metadata is immutable');
END;

CREATE TRIGGER IF NOT EXISTS scan_job_state_transition
BEFORE UPDATE OF status ON scan_jobs
WHEN NOT (
  OLD.status = NEW.status OR
  (OLD.status = 'queued' AND NEW.status IN ('running', 'failed', 'cancelled')) OR
  (OLD.status = 'running' AND NEW.status IN ('succeeded', 'failed', 'cancelled'))
)
BEGIN
  SELECT RAISE(ABORT, 'invalid scan job state transition');
END;

CREATE TRIGGER IF NOT EXISTS scan_job_transition_time_guard
BEFORE UPDATE OF status ON scan_jobs
BEGIN
  SELECT RAISE(ABORT, 'scan start timestamp required')
   WHERE NEW.status = 'running' AND (
    NEW.started_at_ms IS NULL OR NEW.started_at_ms < NEW.created_at_ms OR NEW.finished_at_ms IS NOT NULL
  );
  SELECT RAISE(ABORT, 'terminal scan timestamp required')
   WHERE NEW.status IN ('succeeded', 'failed', 'cancelled') AND (
    NEW.finished_at_ms IS NULL OR NEW.finished_at_ms < COALESCE(NEW.started_at_ms, NEW.created_at_ms)
  );
END;

CREATE TRIGGER IF NOT EXISTS scan_job_start_guard
BEFORE UPDATE OF status ON scan_jobs
WHEN NEW.status = 'running'
BEGIN
  SELECT RAISE(ABORT, 'origin verification must remain active when scan starts')
   WHERE NOT EXISTS (
    SELECT 1 FROM tenants t
    JOIN verified_origins o ON o.tenant_id = t.tenant_id
    WHERE t.tenant_id = NEW.tenant_id AND t.status = 'active'
      AND o.origin_id = NEW.origin_id AND o.revoked_at_ms IS NULL
      AND o.expires_at_ms > NEW.started_at_ms
  );
END;

CREATE TRIGGER IF NOT EXISTS verified_origin_cancel_queued_scans
AFTER UPDATE OF revoked_at_ms ON verified_origins
WHEN OLD.revoked_at_ms IS NULL AND NEW.revoked_at_ms IS NOT NULL
BEGIN
  UPDATE scan_jobs SET status = 'cancelled', finished_at_ms = NEW.revoked_at_ms
  WHERE tenant_id = NEW.tenant_id AND origin_id = NEW.origin_id AND status = 'queued';
END;

CREATE TABLE IF NOT EXISTS scan_artifacts (
  artifact_id TEXT PRIMARY KEY NOT NULL CHECK (length(artifact_id) = 22 AND artifact_id NOT GLOB '*[^A-Za-z0-9_-]*'),
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  scan_id TEXT NOT NULL UNIQUE,
  object_key TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type = 'application/json'),
  content_sha256 TEXT NOT NULL CHECK (length(content_sha256) = 64 AND content_sha256 NOT GLOB '*[^0-9a-f]*'),
  byte_length INTEGER NOT NULL CHECK (typeof(byte_length) = 'integer' AND byte_length > 0),
  is_redacted INTEGER NOT NULL CHECK (is_redacted = 1),
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms > 0),
  expires_at_ms INTEGER NOT NULL CHECK (expires_at_ms > created_at_ms),
  deletion_attempts INTEGER NOT NULL DEFAULT 0 CHECK (deletion_attempts >= 0),
  last_delete_attempt_ms INTEGER,
  last_delete_error_code TEXT CHECK (last_delete_error_code IS NULL OR last_delete_error_code IN ('invalid_object_key', 'r2_delete_failed', 'db_finalize_failed')),
  FOREIGN KEY (scan_id, tenant_id) REFERENCES scan_jobs (scan_id, tenant_id),
  CHECK (object_key = tenant_id || '/' || scan_id || '/' || artifact_id || '.json'),
  CHECK (last_delete_attempt_ms IS NULL OR last_delete_attempt_ms >= created_at_ms)
);

CREATE INDEX IF NOT EXISTS scan_artifacts_expiry
  ON scan_artifacts (expires_at_ms, deletion_attempts);

CREATE TABLE IF NOT EXISTS scan_artifact_deletion_audit (
  artifact_id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  deleted_at_ms INTEGER NOT NULL CHECK (deleted_at_ms > 0),
  attempts INTEGER NOT NULL CHECK (attempts > 0)
);

CREATE TRIGGER IF NOT EXISTS scan_artifact_audit_requires_expired_pointer
BEFORE INSERT ON scan_artifact_deletion_audit
WHEN NOT EXISTS (
  SELECT 1 FROM scan_artifacts a
  WHERE a.artifact_id = NEW.artifact_id AND a.tenant_id = NEW.tenant_id
    AND a.expires_at_ms <= NEW.deleted_at_ms AND a.deletion_attempts = NEW.attempts
)
BEGIN
  SELECT RAISE(ABORT, 'expired artifact deletion attempt required');
END;

CREATE TRIGGER IF NOT EXISTS scan_artifact_immutable
BEFORE UPDATE OF artifact_id, tenant_id, scan_id, object_key, media_type, content_sha256, byte_length, is_redacted, created_at_ms, expires_at_ms
ON scan_artifacts
BEGIN
  SELECT RAISE(ABORT, 'scan artifact metadata is immutable');
END;

CREATE TRIGGER IF NOT EXISTS scan_artifact_insert_guard
BEFORE INSERT ON scan_artifacts
BEGIN
  SELECT RAISE(ABORT, 'redacted artifact policy or successful scan required')
   WHERE NOT EXISTS (
    SELECT 1 FROM scan_jobs j
    JOIN scan_policies p ON p.tenant_id = j.tenant_id
    WHERE j.scan_id = NEW.scan_id AND j.tenant_id = NEW.tenant_id
      AND j.status = 'succeeded' AND NEW.created_at_ms >= j.created_at_ms
      AND NEW.byte_length <= p.max_report_bytes
      AND NEW.expires_at_ms <= NEW.created_at_ms + p.artifact_retention_days * 86400000
  );
END;

CREATE TRIGGER IF NOT EXISTS scan_artifact_delete_requires_audit
BEFORE DELETE ON scan_artifacts
WHEN NOT EXISTS (
  SELECT 1 FROM scan_artifact_deletion_audit d
  WHERE d.artifact_id = OLD.artifact_id AND d.tenant_id = OLD.tenant_id
    AND d.deleted_at_ms >= OLD.expires_at_ms AND d.attempts = OLD.deletion_attempts
)
BEGIN
  SELECT RAISE(ABORT, 'artifact deletion audit required');
END;

CREATE TRIGGER IF NOT EXISTS scan_artifact_audit_immutable
BEFORE UPDATE ON scan_artifact_deletion_audit
BEGIN
  SELECT RAISE(ABORT, 'artifact deletion audit is immutable');
END;
