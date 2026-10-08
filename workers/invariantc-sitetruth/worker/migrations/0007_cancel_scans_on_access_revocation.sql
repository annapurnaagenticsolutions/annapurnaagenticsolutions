-- Stop active scan jobs when the proof or tenant authority is revoked.
-- A running executor must still reload authorization immediately before
-- navigation; this migration only makes revocation visible to its state check.
DROP TRIGGER IF EXISTS verified_origin_cancel_queued_scans;

CREATE TRIGGER IF NOT EXISTS verified_origin_cancel_active_scans
AFTER UPDATE OF revoked_at_ms ON verified_origins
WHEN OLD.revoked_at_ms IS NULL AND NEW.revoked_at_ms IS NOT NULL
BEGIN
  UPDATE scan_jobs
     SET status = 'cancelled',
         finished_at_ms = MAX(NEW.revoked_at_ms, COALESCE(started_at_ms, created_at_ms))
   WHERE tenant_id = NEW.tenant_id
     AND origin_id = NEW.origin_id
     AND status IN ('queued', 'running');
END;

-- Tenant suspension must cancel active work in the same transaction. The
-- internal suspension helper performs that ordered D1 batch; this guard keeps
-- direct status updates from stranding queued/running scans.
CREATE TRIGGER IF NOT EXISTS tenant_suspension_requires_scan_cancellation
BEFORE UPDATE OF status ON tenants
WHEN OLD.status = 'active'
 AND NEW.status = 'suspended'
 AND EXISTS (
   SELECT 1 FROM scan_jobs
    WHERE tenant_id = OLD.tenant_id AND status IN ('queued', 'running')
 )
BEGIN
  SELECT RAISE(ABORT, 'cancel active scan jobs before tenant suspension');
END;
