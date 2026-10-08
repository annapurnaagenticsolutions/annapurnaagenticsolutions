#!/usr/bin/env python3
"""Structural smoke for the Worker staging config; this is not Wrangler validation."""
from pathlib import Path
import json
import re
import tomllib


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "worker" / "wrangler.toml"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"Worker config smoke FAILED: {message}")


with CONFIG_PATH.open("rb") as stream:
    config = tomllib.load(stream)

require(config.get("name", "").endswith("-staging"), "worker name must identify staging")
require(config.get("workers_dev") is True, "staging workers.dev endpoint must be explicit")
require("env" not in config, "no production environment may be implied by this staging template")
require(config.get("vars", {}).get("DOMAIN_VERIFICATION_ENABLED") == "false", "domain verification must remain disabled in staging config")
require(config.get("vars", {}).get("ARTIFACT_RETENTION_ENABLED") == "false", "artifact retention must remain disabled in staging config")
require(config.get("vars", {}).get("DOMAIN_METADATA_RETENTION_ENABLED") == "false", "domain metadata retention must remain disabled in staging config")
require(config.get("vars", {}).get("SCAN_JOB_RETENTION_ENABLED") == "false", "scan job retention must remain disabled in staging config")
require(config.get("vars", {}).get("SCAN_JOB_RECOVERY_ENABLED") == "false", "scan job recovery must remain disabled in staging config")
require(config.get("vars", {}).get("SCAN_INTAKE_ENABLED") == "false", "scan intake must remain disabled in staging config")
require(config.get("vars", {}).get("SCAN_OUTBOX_DISPATCH_ENABLED") == "false", "scan outbox dispatch must remain disabled in staging config")
require(config.get("vars", {}).get("SCAN_EXECUTION_ENABLED") == "false", "scan execution must remain disabled in staging config")
require(config.get("vars", {}).get("SCAN_QUEUE_CONSUMER_READY") == "false", "no scan queue consumer has been approved")
require(config.get("vars", {}).get("SCAN_RUNNER_READY") == "false", "no scan runner has been approved")
require(config.get("vars", {}).get("SCAN_MAINTENANCE_READY") == "false", "no scheduled scan maintenance has been approved")
require("DOMAIN_METADATA_RETENTION_MS" not in config.get("vars", {}), "no unapproved domain metadata retention window may be configured")
require("DOMAIN_DELETION_AUDIT_RETENTION_MS" not in config.get("vars", {}), "no unapproved deletion-audit retention window may be configured")
require("SCAN_JOB_AUDIT_RETENTION_MS" not in config.get("vars", {}), "no unapproved scan-job audit retention window may be configured")
require("SCAN_QUEUED_MAX_AGE_MS" not in config.get("vars", {}), "no unapproved scan queue age may be configured")
require("SCAN_RUNNING_GRACE_MS" not in config.get("vars", {}), "no unapproved scan runtime grace window may be configured")
require("SCAN_PAYLOAD_ENCRYPTION_KEYS" not in config.get("vars", {}), "scan encryption keys must be supplied as secrets, not plaintext vars")
require("SCAN_PAYLOAD_ACTIVE_KEY_ID" not in config.get("vars", {}), "no active scan encryption key may be configured before scanner approval")
require(not config.get("r2_buckets"), "no R2 bucket may be bound before retention operations are approved")
require(not config.get("queues", {}).get("producers"), "no scan queue producer may be bound before runtime gates pass")
require(not config.get("queues", {}).get("consumers"), "no scan queue consumer may be bound before a runner is approved")
require(not config.get("triggers", {}).get("crons"), "no retention Cron Trigger may be configured before staging prerequisites are approved")

package_json = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
tldts_version = package_json.get("dependencies", {}).get("tldts", "")
require(bool(re.fullmatch(r"\d+\.\d+\.\d+", tldts_version)), "tldts with a locked PSL snapshot must be pinned to an exact version")

worker_dir = CONFIG_PATH.parent
main = worker_dir / config.get("main", "")
require(main.is_file(), "configured Worker entry point is missing")

assets = config.get("assets", {})
assets_dir = (worker_dir / assets.get("directory", "")).resolve()
require(assets.get("binding") == "ASSETS", "static asset binding must be named ASSETS")
require(assets.get("run_worker_first") is True, "Worker must handle API and health routes before asset fallback")
require((assets_dir / "index.html").is_file(), "static preview index is missing")
require((assets_dir / "app.js").is_file(), "static preview script is missing")
require((assets_dir / "style.css").is_file(), "static preview stylesheet is missing")

d1 = config.get("d1_databases", [])
require(len(d1) == 1, "exactly one staging D1 binding is expected")
database = d1[0]
require(database.get("binding") == "DB", "D1 binding must be named DB")
require(database.get("database_name") == "invariantc-sitetruth-staging", "D1 database name must be staging-only")
database_id = database.get("database_id", "")
require(bool(re.fullmatch(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", database_id)), "staging D1 ID must be a real UUID, not the local placeholder")
migrations_dir = worker_dir / database.get("migrations_dir", "")
require((migrations_dir / "0001_tenant_api.sql").is_file(), "tenant API migration is missing")
require((migrations_dir / "0002_domain_verification.sql").is_file(), "domain verification migration is missing")
require((migrations_dir / "0003_scan_retention.sql").is_file(), "scan retention migration is missing")
require((migrations_dir / "0004_domain_metadata_retention.sql").is_file(), "domain metadata retention migration is missing")
require((migrations_dir / "0005_scan_job_deletion_audit.sql").is_file(), "scan-job deletion audit migration is missing")
require((migrations_dir / "0006_scan_job_recovery_reason.sql").is_file(), "scan-job recovery reason migration is missing")
require((migrations_dir / "0007_cancel_scans_on_access_revocation.sql").is_file(), "scan cancellation on ownership revocation migration is missing")
require((migrations_dir / "0008_scan_job_dispatch_outbox.sql").is_file(), "encrypted scan dispatch outbox migration is missing")
require((worker_dir / "src" / "domain-retention.mjs").is_file(), "domain metadata retention core is missing")
require((worker_dir / "src" / "scan-job-retention.mjs").is_file(), "scan-job retention core is missing")
require((worker_dir / "src" / "scan-job-recovery.mjs").is_file(), "scan-job recovery core is missing")
require((worker_dir / "src" / "scan-job-authorization.mjs").is_file(), "scan-job authorization boundary is missing")
require((worker_dir / "src" / "tenant-suspension.mjs").is_file(), "atomic tenant suspension helper is missing")
require((worker_dir / "src" / "scan-job-recovery-scheduler.mjs").is_file(), "scan-job recovery scheduler is missing")
require((worker_dir / "src" / "scan-intake.mjs").is_file(), "feature-gated tenant scan intake is missing")
require((worker_dir / "src" / "scan-outbox.mjs").is_file(), "durable scan queue outbox is missing")
require((worker_dir / "src" / "scan-outbox-scheduler.mjs").is_file(), "bounded scan outbox dispatcher is missing")
require((worker_dir / "src" / "scan-payload-crypto.mjs").is_file(), "scan payload encryption helper is missing")
require((worker_dir / "src" / "scheduled.mjs").is_file(), "scheduled maintenance orchestration module is missing")
require((worker_dir / "src" / "public-suffix.mjs").is_file(), "Public Suffix List adapter is missing")

bindings = config.get("durable_objects", {}).get("bindings", [])
require(any(binding.get("name") == "TENANT_QUOTA" and binding.get("class_name") == "TenantQuota" for binding in bindings), "tenant quota DO binding is missing")
require(config.get("exports", {}).get("TenantQuota") == {"type": "durable-object", "storage": "sqlite"}, "TenantQuota must be declared as a SQLite-backed exported class")
require("export class TenantQuota" in (worker_dir / "src" / "tenant-quota-do.mjs").read_text(encoding="utf-8"), "TenantQuota class export is missing")

print("Worker config structural smoke PASSED: staging-only bindings, disabled scan intake/dispatch/execution/recovery/retention, no scan key material or Queue/R2/Cron, pinned PSL dependency, assets, D1 UUID/migrations, and SQLite TenantQuota export.")
print("This does not validate Wrangler schema, D1, Workerd behavior, bundle size, or deployment readiness.")
