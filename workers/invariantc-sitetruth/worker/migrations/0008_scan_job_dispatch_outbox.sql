-- Encrypted request payloads are held only for queue dispatch/execution. The
-- intake route remains disabled until the key, queue, runtime, and short-TTL
-- policy are configured and reviewed.
ALTER TABLE scan_jobs ADD COLUMN request_payload_sha256 TEXT
  CHECK (request_payload_sha256 IS NULL OR
    (length(request_payload_sha256) = 64 AND request_payload_sha256 NOT GLOB '*[^0-9a-f]*'));

CREATE TRIGGER scan_job_request_payload_hash_immutable
BEFORE UPDATE OF request_payload_sha256 ON scan_jobs
BEGIN
  SELECT RAISE(ABORT, 'scan request payload hash is immutable');
END;

CREATE TABLE scan_job_dispatch_outbox (
  scan_id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  request_payload_sha256 TEXT NOT NULL CHECK (
    length(request_payload_sha256) = 64 AND request_payload_sha256 NOT GLOB '*[^0-9a-f]*'
  ),
  payload_key_id TEXT NOT NULL CHECK (
    length(payload_key_id) BETWEEN 1 AND 32 AND payload_key_id NOT GLOB '*[^A-Za-z0-9_-]*'
  ),
  payload_nonce_b64url TEXT NOT NULL CHECK (
    length(payload_nonce_b64url) = 16 AND payload_nonce_b64url NOT GLOB '*[^A-Za-z0-9_-]*'
  ),
  encrypted_payload_b64url TEXT NOT NULL CHECK (
    length(encrypted_payload_b64url) BETWEEN 1 AND 66000
    AND encrypted_payload_b64url NOT GLOB '*[^A-Za-z0-9_-]*'
  ),
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms > 0),
  expires_at_ms INTEGER NOT NULL CHECK (
    expires_at_ms > created_at_ms AND expires_at_ms <= created_at_ms + 86400000
  ),
  dispatch_attempts INTEGER NOT NULL DEFAULT 0 CHECK (dispatch_attempts >= 0),
  last_attempt_at_ms INTEGER,
  dispatched_at_ms INTEGER,
  last_error_code TEXT CHECK (last_error_code IS NULL OR last_error_code = 'queue_send_failed'),
  FOREIGN KEY (scan_id, tenant_id) REFERENCES scan_jobs (scan_id, tenant_id) ON DELETE RESTRICT,
  CHECK (last_attempt_at_ms IS NULL OR last_attempt_at_ms >= created_at_ms),
  CHECK (dispatched_at_ms IS NULL OR dispatched_at_ms >= created_at_ms)
);

CREATE INDEX scan_job_dispatch_pending
  ON scan_job_dispatch_outbox (dispatched_at_ms, expires_at_ms, scan_id);

CREATE TABLE scan_payload_deletion_audit (
  scan_id TEXT PRIMARY KEY NOT NULL CHECK (length(scan_id) = 22 AND scan_id NOT GLOB '*[^A-Za-z0-9_-]*'),
  tenant_id TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 80 AND tenant_id NOT GLOB '*[^A-Za-z0-9_-]*'),
  deleted_at_ms INTEGER NOT NULL CHECK (deleted_at_ms > 0),
  reason TEXT NOT NULL CHECK (reason = 'job_terminal')
);

CREATE INDEX scan_payload_deletion_audit_time
  ON scan_payload_deletion_audit (deleted_at_ms, scan_id);

CREATE TRIGGER scan_payload_deletion_audit_immutable
BEFORE UPDATE ON scan_payload_deletion_audit
BEGIN
  SELECT RAISE(ABORT, 'scan payload deletion audit is immutable');
END;

CREATE TRIGGER scan_job_dispatch_outbox_insert_guard
BEFORE INSERT ON scan_job_dispatch_outbox
BEGIN
  SELECT RAISE(ABORT, 'matching queued scan job required for dispatch payload')
   WHERE NOT EXISTS (
    SELECT 1 FROM scan_jobs j
    JOIN scan_policies p ON p.tenant_id = j.tenant_id
    WHERE j.scan_id = NEW.scan_id AND j.tenant_id = NEW.tenant_id
      AND j.status = 'queued'
      AND j.request_payload_sha256 = NEW.request_payload_sha256
      AND j.created_at_ms = NEW.created_at_ms
      AND NEW.expires_at_ms <= j.expires_at_ms
      AND NEW.expires_at_ms <= NEW.created_at_ms + p.artifact_retention_days * 86400000
  );
END;

CREATE TRIGGER scan_job_dispatch_outbox_immutable
BEFORE UPDATE OF scan_id, tenant_id, request_payload_sha256, payload_key_id, payload_nonce_b64url,
                 encrypted_payload_b64url, created_at_ms, expires_at_ms
ON scan_job_dispatch_outbox
BEGIN
  SELECT RAISE(ABORT, 'scan dispatch payload is immutable');
END;

CREATE TRIGGER scan_job_dispatch_outbox_delete_requires_audit
BEFORE DELETE ON scan_job_dispatch_outbox
WHEN NOT EXISTS (
  SELECT 1 FROM scan_payload_deletion_audit a
   WHERE a.scan_id = OLD.scan_id AND a.tenant_id = OLD.tenant_id
     AND a.deleted_at_ms >= OLD.created_at_ms
)
BEGIN
  SELECT RAISE(ABORT, 'scan payload deletion audit required');
END;

CREATE TRIGGER scan_job_terminal_deletes_encrypted_payload
AFTER UPDATE OF status ON scan_jobs
WHEN NEW.status IN ('succeeded', 'failed', 'cancelled')
 AND OLD.status IN ('queued', 'running')
BEGIN
  INSERT INTO scan_payload_deletion_audit (scan_id, tenant_id, deleted_at_ms, reason)
  SELECT NEW.scan_id, NEW.tenant_id, MAX(NEW.finished_at_ms, NEW.created_at_ms), 'job_terminal'
   WHERE EXISTS (
     SELECT 1 FROM scan_job_dispatch_outbox o
      WHERE o.scan_id = NEW.scan_id AND o.tenant_id = NEW.tenant_id
   )
  ON CONFLICT (scan_id) DO NOTHING;
  DELETE FROM scan_job_dispatch_outbox WHERE scan_id = NEW.scan_id;
END;
