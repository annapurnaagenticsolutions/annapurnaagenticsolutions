-- Minimal proof that terminal, expired scan-job metadata was removed.
-- No job-retention audit duration is chosen or enabled in staging here.
CREATE TABLE IF NOT EXISTS scan_job_deletion_audit (
  scan_id TEXT PRIMARY KEY NOT NULL CHECK (length(scan_id) = 22 AND scan_id NOT GLOB '*[^A-Za-z0-9_-]*'),
  tenant_id TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 80 AND tenant_id NOT GLOB '*[^A-Za-z0-9_-]*'),
  deleted_at_ms INTEGER NOT NULL CHECK (deleted_at_ms > 0)
);

CREATE INDEX IF NOT EXISTS scan_job_deletion_audit_time
  ON scan_job_deletion_audit (deleted_at_ms, scan_id);

CREATE TRIGGER IF NOT EXISTS scan_job_deletion_audit_immutable
BEFORE UPDATE ON scan_job_deletion_audit
BEGIN
  SELECT RAISE(ABORT, 'scan job deletion audit is immutable');
END;

CREATE TRIGGER IF NOT EXISTS scan_job_delete_requires_audit
BEFORE DELETE ON scan_jobs
WHEN OLD.status NOT IN ('succeeded', 'failed', 'cancelled')
 OR NOT EXISTS (
   SELECT 1 FROM scan_job_deletion_audit a
    WHERE a.scan_id = OLD.scan_id AND a.tenant_id = OLD.tenant_id
      AND a.deleted_at_ms >= OLD.expires_at_ms
      AND a.deleted_at_ms >= OLD.created_at_ms + 86400000
 )
BEGIN
  SELECT RAISE(ABORT, 'terminal expired scan job deletion audit required');
END;
