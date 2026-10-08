-- Minimal deletion evidence and audited cleanup for domain-proof metadata.
-- The cleanup window is deliberately an operator-supplied runtime value; no
-- retention duration is selected by this migration or enabled in staging.
CREATE TABLE IF NOT EXISTS domain_metadata_deletion_audit (
  record_type TEXT NOT NULL CHECK (record_type IN ('challenge', 'origin')),
  record_id TEXT NOT NULL CHECK (length(record_id) = 22 AND record_id NOT GLOB '*[^A-Za-z0-9_-]*'),
  tenant_id TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 80 AND tenant_id NOT GLOB '*[^A-Za-z0-9_-]*'),
  deleted_at_ms INTEGER NOT NULL CHECK (deleted_at_ms > 0),
  PRIMARY KEY (record_type, record_id)
);

CREATE INDEX IF NOT EXISTS domain_metadata_deletion_audit_time
  ON domain_metadata_deletion_audit (deleted_at_ms, record_type);

-- Keep the compact audit immutable. It has no tenant foreign key so that
-- tenant removal does not erase evidence that owned metadata was deleted.
CREATE TRIGGER IF NOT EXISTS domain_metadata_deletion_audit_immutable
BEFORE UPDATE ON domain_metadata_deletion_audit
BEGIN
  SELECT RAISE(ABORT, 'domain metadata deletion audit is immutable');
END;

CREATE TRIGGER IF NOT EXISTS domain_origin_delete_requires_audit
BEFORE DELETE ON verified_origins
WHEN EXISTS (SELECT 1 FROM tenants WHERE tenant_id = OLD.tenant_id)
 AND NOT EXISTS (
   SELECT 1 FROM domain_metadata_deletion_audit a
    WHERE a.record_type = 'origin' AND a.record_id = OLD.origin_id
      AND a.tenant_id = OLD.tenant_id
 )
BEGIN
  SELECT RAISE(ABORT, 'domain origin deletion audit required');
END;

CREATE TRIGGER IF NOT EXISTS domain_challenge_delete_requires_audit
BEFORE DELETE ON domain_challenges
WHEN EXISTS (SELECT 1 FROM tenants WHERE tenant_id = OLD.tenant_id)
 AND NOT EXISTS (
   SELECT 1 FROM domain_metadata_deletion_audit a
    WHERE a.record_type = 'challenge' AND a.record_id = OLD.challenge_id
      AND a.tenant_id = OLD.tenant_id
 )
BEGIN
  SELECT RAISE(ABORT, 'domain challenge deletion audit required');
END;
