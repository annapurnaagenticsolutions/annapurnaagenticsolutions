-- Local SQLite evidence index schema. No user PII or raw observations stored.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS scenarios (
  scenario_id TEXT PRIMARY KEY NOT NULL,
  contract_id TEXT NOT NULL,
  contract_sha256 TEXT NOT NULL CHECK(length(contract_sha256)=64),
  fixture_sha256 TEXT NOT NULL CHECK(length(fixture_sha256)=64),
  created_at TEXT NOT NULL,
  label TEXT NOT NULL CHECK(length(label) BETWEEN 1 AND 160)
);
CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY NOT NULL,
  scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id),
  report_sha256 TEXT NOT NULL CHECK(length(report_sha256)=64),
  observation_sha256 TEXT NOT NULL CHECK(length(observation_sha256)=64),
  outcome TEXT NOT NULL CHECK(outcome IN ('pass','fail','unknown')),
  pass_count INTEGER NOT NULL DEFAULT 0 CHECK(pass_count >= 0),
  fail_count INTEGER NOT NULL DEFAULT 0 CHECK(fail_count >= 0),
  unknown_count INTEGER NOT NULL DEFAULT 0 CHECK(unknown_count >= 0),
  created_at TEXT NOT NULL,
  UNIQUE(scenario_id, report_sha256)
);
CREATE INDEX IF NOT EXISTS runs_by_scenario ON runs(scenario_id,created_at);
CREATE TABLE IF NOT EXISTS findings (
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  assertion_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('pass','fail','unknown')),
  code TEXT NOT NULL,
  PRIMARY KEY (run_id,assertion_id)
);
-- Existing rows are update-immutable. Deletion must be restricted to an explicit retention job by the service layer.
CREATE TRIGGER IF NOT EXISTS scenarios_no_update BEFORE UPDATE ON scenarios BEGIN SELECT RAISE(ABORT,'scenario records are immutable'); END;
CREATE TRIGGER IF NOT EXISTS runs_no_update BEFORE UPDATE ON runs BEGIN SELECT RAISE(ABORT,'run records are immutable'); END;
CREATE TRIGGER IF NOT EXISTS findings_no_update BEFORE UPDATE ON findings BEGIN SELECT RAISE(ABORT,'finding records are immutable'); END;
