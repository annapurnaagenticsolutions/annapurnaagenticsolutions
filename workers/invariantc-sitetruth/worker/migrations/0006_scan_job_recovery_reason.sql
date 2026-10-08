-- Persist a bounded reason when an operator-configured recovery rule fails an
-- abandoned queue item or an execution that exceeded its stored run budget.
-- Recovery stays disabled until queue-age and runtime-grace policies are approved.
ALTER TABLE scan_jobs ADD COLUMN terminal_reason TEXT
  CHECK (terminal_reason IS NULL OR terminal_reason IN ('queue_timeout', 'run_budget_exceeded'));

CREATE INDEX scan_jobs_recovery_queue
  ON scan_jobs (created_at_ms, scan_id)
  WHERE status = 'queued';

CREATE INDEX scan_jobs_recovery_running
  ON scan_jobs (started_at_ms, scan_id, run_budget_seconds)
  WHERE status = 'running';

CREATE TRIGGER scan_job_recovery_reason_guard
BEFORE UPDATE OF status, terminal_reason ON scan_jobs
WHEN NEW.terminal_reason IS NOT NULL
 AND NOT (
   (OLD.status = 'queued' AND NEW.status = 'failed' AND NEW.terminal_reason = 'queue_timeout')
   OR
   (OLD.status = 'running' AND NEW.status = 'failed' AND NEW.terminal_reason = 'run_budget_exceeded')
 )
BEGIN
  SELECT RAISE(ABORT, 'scan-job recovery reason does not match its failed transition');
END;

CREATE TRIGGER scan_job_recovery_reason_immutable
BEFORE UPDATE OF terminal_reason ON scan_jobs
WHEN OLD.terminal_reason IS NOT NULL AND NEW.terminal_reason IS NOT OLD.terminal_reason
BEGIN
  SELECT RAISE(ABORT, 'scan-job recovery reason is immutable');
END;
