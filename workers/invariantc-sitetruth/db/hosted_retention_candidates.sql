-- REFERENCE ONLY: first enumerate expired R2 objects, delete them idempotently,
-- then delete their D1 rows and expired scan metadata in one D1 batch.
-- Do not delete D1 pointers before every corresponding R2 deletion succeeds.
SELECT artifact_id,object_key
FROM hosted_redacted_artifacts a
JOIN hosted_scan_jobs j ON j.scan_id=a.scan_id AND j.tenant_id=a.tenant_id
WHERE a.expires_at <= ? OR j.expires_at <= ?
ORDER BY min(a.expires_at,j.expires_at);

-- Execute only after R2 deletion succeeded for all returned object keys.
DELETE FROM hosted_redacted_artifacts
WHERE expires_at <= ? OR scan_id IN (
  SELECT scan_id FROM hosted_scan_jobs WHERE expires_at <= ?
);
DELETE FROM hosted_scan_jobs
WHERE expires_at <= ?;
