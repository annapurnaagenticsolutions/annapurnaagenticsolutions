#!/usr/bin/env python3
"""SQLite smoke for disabled scan quotas, job state, and artifact-retention schema."""
from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "worker" / "migrations"
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
for migration in ("0001_tenant_api.sql", "0002_domain_verification.sql", "0003_scan_retention.sql", "0004_domain_metadata_retention.sql", "0005_scan_job_deletion_audit.sql", "0006_scan_job_recovery_reason.sql", "0007_cancel_scans_on_access_revocation.sql", "0008_scan_job_dispatch_outbox.sql"):
    db.executescript((MIGRATIONS / migration).read_text(encoding="utf-8"))

now = 1_800_000_000_000
hash_a = "a" * 64
hash_b = "b" * 64


def must_reject(label: str, sql: str, values: tuple = ()) -> None:
    try:
        db.execute(sql, values)
    except sqlite3.IntegrityError:
        return
    raise SystemExit(f"Scan retention schema smoke FAILED: accepted {label}")


def add_tenant(tenant_id: str) -> None:
    db.execute(
        """INSERT INTO tenants
           (tenant_id,status,requests_per_minute,requests_per_day,max_concurrent,created_at_ms)
           VALUES (?,'active',10,100,2,?)""",
        (tenant_id, now),
    )


def add_policy(tenant_id: str, *, requests_per_minute: int = 10, scans_per_day: int = 3,
               concurrent: int = 1, pages: int = 5, seconds: int = 120,
               report_bytes: int = 262144, retention_days: int = 7) -> None:
    db.execute(
        """INSERT INTO scan_policies
           (tenant_id,scan_requests_per_minute,scans_per_day,max_concurrent_scans,
            max_pages_per_scan,max_run_seconds,max_report_bytes,artifact_retention_days,updated_at_ms)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (tenant_id, requests_per_minute, scans_per_day, concurrent, pages, seconds,
         report_bytes, retention_days, now),
    )


def add_origin(tenant_id: str, hostname: str, origin_id: str, challenge_id: str,
               issued_at_ms: int = now, lifetime_ms: int = 86_400_000) -> None:
    verified_at = issued_at_ms + 1
    db.execute(
        """INSERT INTO domain_challenges
           (challenge_id,tenant_id,hostname_ascii,token_sha256,issued_at_ms,expires_at_ms,consumed_at_ms)
           VALUES (?,?,?,?,?,?,?)""",
        (challenge_id, tenant_id, hostname, hash_a, issued_at_ms, issued_at_ms + 900_000, verified_at),
    )
    db.execute(
        """INSERT INTO verified_origins
           (origin_id,tenant_id,hostname_ascii,origin,challenge_id,verified_at_ms,expires_at_ms)
           VALUES (?,?,?,?,?,?,?)""",
        (origin_id, tenant_id, hostname, f"https://{hostname}", challenge_id,
         verified_at, verified_at + lifetime_ms),
    )


def add_scan(scan_id: str, tenant_id: str, origin_id: str, idem: str, created: int,
             *, pages: int = 2, seconds: int = 60, expiry: int | None = None) -> None:
    db.execute(
        """INSERT INTO scan_jobs
           (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,page_limit,
            run_budget_seconds,status,created_at_ms,expires_at_ms)
           VALUES (?,?,?,?,?,?,?,'queued',?,?)""",
        (scan_id, tenant_id, origin_id, idem, hash_b, pages, seconds, created,
         expiry if expiry is not None else created + 7 * 86_400_000),
    )


add_tenant("tenant_a")
add_policy("tenant_a")
add_origin("tenant_a", "owned.example.com", "o" * 22, "c" * 22, now - 10)
add_scan("s" * 22, "tenant_a", "o" * 22, "idem-0000000000001", now)
must_reject(
    "concurrent scan limit",
    """INSERT INTO scan_jobs
       (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,page_limit,
        run_budget_seconds,status,created_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,2,60,'queued',?,?)""",
    ("t" * 22, "tenant_a", "o" * 22, "idem-0000000000002", hash_b, now + 1, now + 7 * 86_400_000),
)
db.execute("UPDATE scan_jobs SET status='running',started_at_ms=? WHERE scan_id=?", (now + 1, "s" * 22))
db.execute("UPDATE scan_jobs SET status='succeeded',finished_at_ms=? WHERE scan_id=?", (now + 2, "s" * 22))
add_scan("t" * 22, "tenant_a", "o" * 22, "idem-0000000000002", now + 1000)
must_reject(
    "duplicate idempotency key",
    """INSERT INTO scan_jobs
       (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,page_limit,
        run_budget_seconds,status,created_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,2,60,'queued',?,?)""",
    ("u" * 22, "tenant_a", "o" * 22, "idem-0000000000002", hash_b, now + 1100, now + 7 * 86_400_000),
)
must_reject(
    "page limit above policy",
    """INSERT INTO scan_jobs
       (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,page_limit,
        run_budget_seconds,status,created_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,6,60,'queued',?,?)""",
    ("u" * 22, "tenant_a", "o" * 22, "idem-0000000000003", hash_b, now + 1200, now + 7 * 86_400_000),
)
must_reject("invalid status transition", "UPDATE scan_jobs SET status='succeeded',finished_at_ms=? WHERE scan_id=?", (now + 1200, "t" * 22))
db.execute("UPDATE scan_jobs SET status='failed',finished_at_ms=? WHERE scan_id=?", (now + 1500, "t" * 22))
add_scan("u" * 22, "tenant_a", "o" * 22, "idem-0000000000003", now + 2000)
must_reject(
    "daily scan quota",
    """INSERT INTO scan_jobs
       (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,page_limit,
        run_budget_seconds,status,created_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,2,60,'queued',?,?)""",
    ("v" * 22, "tenant_a", "o" * 22, "idem-0000000000004", hash_b, now + 3000, now + 7 * 86_400_000),
)

add_tenant("tenant_b")
add_policy("tenant_b", requests_per_minute=1, scans_per_day=10, concurrent=3)
add_origin("tenant_b", "fresh.example.net", "p" * 22, "d" * 22)
add_scan("w" * 22, "tenant_b", "p" * 22, "idem-tenant-b00001", now)
must_reject(
    "per-minute scan request rate",
    """INSERT INTO scan_jobs
       (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,page_limit,
        run_budget_seconds,status,created_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,2,60,'queued',?,?)""",
    ("x" * 22, "tenant_b", "p" * 22, "idem-tenant-b00002", hash_b, now + 30_000, now + 7 * 86_400_000),
)
db.execute("UPDATE scan_policies SET scan_requests_per_minute=10 WHERE tenant_id='tenant_b'")

add_origin("tenant_b", "short.example.net", "q" * 22, "e" * 22, now, lifetime_ms=1000)
must_reject(
    "expired origin at scan enqueue",
    """INSERT INTO scan_jobs
       (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,page_limit,
        run_budget_seconds,status,created_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,2,60,'queued',?,?)""",
    ("y" * 22, "tenant_b", "q" * 22, "idem-short-000001", hash_b, now + 1002, now + 7 * 86_400_000),
)

add_origin("tenant_b", "revoke.example.net", "r" * 22, "f" * 22, now + 2000)
add_scan("z" * 22, "tenant_b", "r" * 22, "idem-revoke-00001", now + 3000)
db.execute("UPDATE verified_origins SET revoked_at_ms=? WHERE origin_id=?", (now + 4000, "r" * 22))
state = db.execute("SELECT status,finished_at_ms FROM scan_jobs WHERE scan_id=?", ("z" * 22,)).fetchone()
assert state == ("cancelled", now + 4000)
must_reject("cancelled scan restart", "UPDATE scan_jobs SET status='running',started_at_ms=? WHERE scan_id=?", (now + 5000, "z" * 22))

add_origin("tenant_b", "expires-after-queue.example.net", "a" * 22, "g" * 22, now + 5000, lifetime_ms=10_000)
add_scan("b" * 22, "tenant_b", "a" * 22, "idem-expiry-00001", now + 6000)
must_reject("origin expiry before scan start", "UPDATE scan_jobs SET status='running',started_at_ms=? WHERE scan_id=?", (now + 15_002, "b" * 22))

add_tenant("tenant_revoke")
add_policy("tenant_revoke", concurrent=2)
add_origin("tenant_revoke", "running-revocation.example.com", "1" * 22, "2" * 22)
add_scan("3" * 22, "tenant_revoke", "1" * 22, "idem-revoke-queued1", now + 100)
add_scan("4" * 22, "tenant_revoke", "1" * 22, "idem-revoke-running1", now + 110)
db.execute("UPDATE scan_jobs SET status='running',started_at_ms=? WHERE scan_id=?", (now + 111, "4" * 22))
db.execute("UPDATE verified_origins SET revoked_at_ms=? WHERE origin_id=?", (now + 105, "1" * 22))
revoked_states = db.execute(
    "SELECT scan_id,status,finished_at_ms FROM scan_jobs WHERE scan_id IN (?,?) ORDER BY scan_id",
    ("3" * 22, "4" * 22),
).fetchall()
assert revoked_states == [("3" * 22, "cancelled", now + 105), ("4" * 22, "cancelled", now + 111)]

artifact_id = "m" * 22
scan_id = "s" * 22
artifact_created = now + 3
artifact_expires = artifact_created + 7 * 86_400_000
object_key = f"tenant_a/{scan_id}/{artifact_id}.json"
insert_artifact = """INSERT INTO scan_artifacts
    (artifact_id,tenant_id,scan_id,object_key,media_type,content_sha256,byte_length,is_redacted,created_at_ms,expires_at_ms)
    VALUES (?,?,?,?,?,?,?,?,?,?)"""
db.execute(insert_artifact, (artifact_id, "tenant_a", scan_id, object_key, "application/json", hash_a,
                              2048, 1, artifact_created, artifact_expires))
must_reject("unredacted artifact", insert_artifact,
            ("n" * 22, "tenant_a", scan_id, f"tenant_a/{scan_id}/{'n' * 22}.json", "application/json",
             hash_a, 2048, 0, artifact_created, artifact_expires))
must_reject("report larger than policy", insert_artifact,
            ("l" * 22, "tenant_a", scan_id, f"tenant_a/{scan_id}/{'l' * 22}.json", "application/json",
             hash_a, 262145, 1, artifact_created, artifact_expires))
must_reject("artifact deletion without audit", "DELETE FROM scan_artifacts WHERE artifact_id=?", (artifact_id,))
must_reject("job deletion while artifact pointer exists", "DELETE FROM scan_jobs WHERE scan_id=?", (scan_id,))

db.execute("UPDATE scan_artifacts SET deletion_attempts=2,last_delete_attempt_ms=? WHERE artifact_id=?", (artifact_expires, artifact_id))
must_reject(
    "deletion audit before artifact expiry",
    "INSERT INTO scan_artifact_deletion_audit (artifact_id,tenant_id,deleted_at_ms,attempts) VALUES (?,?,?,?)",
    (artifact_id, "tenant_a", artifact_expires - 1, 2),
)
db.execute(
    "INSERT INTO scan_artifact_deletion_audit (artifact_id,tenant_id,deleted_at_ms,attempts) VALUES (?,?,?,?)",
    (artifact_id, "tenant_a", artifact_expires, 2),
)
db.execute("DELETE FROM scan_artifacts WHERE artifact_id=?", (artifact_id,))
audit_columns = {row[1] for row in db.execute("PRAGMA table_info(scan_artifact_deletion_audit)")}
assert audit_columns == {"artifact_id", "tenant_id", "deleted_at_ms", "attempts"}
must_reject("scan job deletion without audit", "DELETE FROM scan_jobs WHERE scan_id=?", (scan_id,))
db.execute(
    "INSERT INTO scan_job_deletion_audit (scan_id,tenant_id,deleted_at_ms) VALUES (?,?,?)",
    (scan_id, "tenant_a", now + 7 * 86_400_000 - 1),
)
must_reject("scan job deletion audit before expiry", "DELETE FROM scan_jobs WHERE scan_id=?", (scan_id,))
db.execute("DELETE FROM scan_job_deletion_audit WHERE scan_id=?", (scan_id,))
db.execute(
    "INSERT INTO scan_job_deletion_audit (scan_id,tenant_id,deleted_at_ms) VALUES (?,?,?)",
    (scan_id, "tenant_a", now + 8 * 86_400_000),
)
db.execute("DELETE FROM scan_jobs WHERE scan_id=?", (scan_id,))
job_audit_columns = {row[1] for row in db.execute("PRAGMA table_info(scan_job_deletion_audit)")}
assert job_audit_columns == {"scan_id", "tenant_id", "deleted_at_ms"}
must_reject(
    "scan job deletion audit mutation",
    "UPDATE scan_job_deletion_audit SET deleted_at_ms=deleted_at_ms+1 WHERE scan_id=?",
    (scan_id,),
)

# A job with an intentionally short expiry may already be expired while its
# creation timestamp is still inside the daily quota window. Its audit must
# not authorize deletion until the full quota history period has elapsed.
add_tenant("tenant_c")
add_policy("tenant_c")
recent_created = now - 12 * 60 * 60 * 1000
add_origin("tenant_c", "quota-history.example.org", "j" * 22, "k" * 22,
           recent_created - 10, lifetime_ms=86_000_000)
add_scan("l" * 22, "tenant_c", "j" * 22, "idem-quota-window1", recent_created,
         expiry=recent_created + 60 * 60 * 1000)
db.execute("UPDATE scan_jobs SET status='failed',finished_at_ms=? WHERE scan_id=?", (recent_created + 10, "l" * 22))
db.execute(
    "INSERT INTO scan_job_deletion_audit (scan_id,tenant_id,deleted_at_ms) VALUES (?,?,?)",
    ("l" * 22, "tenant_c", now),
)
must_reject("scan job deletion inside daily quota history window", "DELETE FROM scan_jobs WHERE scan_id=?", ("l" * 22,))
db.execute("DELETE FROM scan_job_deletion_audit WHERE scan_id=?", ("l" * 22,))
db.execute(
    "INSERT INTO scan_job_deletion_audit (scan_id,tenant_id,deleted_at_ms) VALUES (?,?,?)",
    ("l" * 22, "tenant_c", recent_created + 86_400_000),
)
db.execute("DELETE FROM scan_jobs WHERE scan_id=?", ("l" * 22,))

add_scan("m" * 22, "tenant_c", "j" * 22, "idem-rec-queue01", now + 20_000)
db.execute(
    "UPDATE scan_jobs SET status='failed',finished_at_ms=?,terminal_reason='queue_timeout' WHERE scan_id=?",
    (now + 20_001, "m" * 22),
)
add_scan("n" * 22, "tenant_c", "j" * 22, "idem-rec-run0001", now + 30_000)
db.execute(
    "UPDATE scan_jobs SET status='running',started_at_ms=? WHERE scan_id=?",
    (now + 30_001, "n" * 22),
)
must_reject(
    "recovery reason mismatched to running job",
    "UPDATE scan_jobs SET status='failed',finished_at_ms=?,terminal_reason='queue_timeout' WHERE scan_id=?",
    (now + 30_002, "n" * 22),
)
db.execute(
    "UPDATE scan_jobs SET status='failed',finished_at_ms=?,terminal_reason='run_budget_exceeded' WHERE scan_id=?",
    (now + 30_002, "n" * 22),
)
assert db.execute("SELECT terminal_reason FROM scan_jobs WHERE scan_id=?", ("m" * 22,)).fetchone() == ("queue_timeout",)
assert db.execute("SELECT terminal_reason FROM scan_jobs WHERE scan_id=?", ("n" * 22,)).fetchone() == ("run_budget_exceeded",)
must_reject(
    "scan-job recovery reason mutation",
    "UPDATE scan_jobs SET terminal_reason=NULL WHERE scan_id=?",
    ("m" * 22,),
)

# Encrypted request payloads are tenant-bound, immutable, short-lived, and
# deleted with compact audit evidence when their job becomes terminal.
add_tenant("tenant_outbox")
add_policy("tenant_outbox", concurrent=2, retention_days=1)
add_origin("tenant_outbox", "outbox.example.net", "5" * 22, "6" * 22)
outbox_hash = "d" * 64
db.execute(
    """INSERT INTO scan_jobs
       (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,page_limit,
        run_budget_seconds,status,created_at_ms,expires_at_ms,request_payload_sha256)
       VALUES (?,?,?, ?, ?,1,60,'queued',?,?,?)""",
    ("7" * 22, "tenant_outbox", "5" * 22, "idem-outbox-000001", hash_b,
     now, now + 86_400_000, outbox_hash),
)
db.execute(
    """INSERT INTO scan_job_dispatch_outbox
       (scan_id,tenant_id,request_payload_sha256,payload_key_id,payload_nonce_b64url,
        encrypted_payload_b64url,created_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,?,?,?)""",
    ("7" * 22, "tenant_outbox", outbox_hash, "key_v1", "A" * 16, "B" * 32, now, now + 60_000),
)
must_reject(
    "mutation of encrypted outbox payload",
    "UPDATE scan_job_dispatch_outbox SET encrypted_payload_b64url=? WHERE scan_id=?",
    ("C" * 32, "7" * 22),
)
must_reject("outbox deletion without audit", "DELETE FROM scan_job_dispatch_outbox WHERE scan_id=?", ("7" * 22,))
db.execute(
    """INSERT INTO scan_jobs
       (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,page_limit,
        run_budget_seconds,status,created_at_ms,expires_at_ms,request_payload_sha256)
       VALUES (?,?,?, ?, ?,1,60,'queued',?,?,?)""",
    ("8" * 22, "tenant_outbox", "5" * 22, "idem-outbox-000002", hash_b,
     now + 1, now + 86_400_001, "e" * 64),
)
must_reject(
    "outbox expiry beyond the job retention policy",
    """INSERT INTO scan_job_dispatch_outbox
       (scan_id,tenant_id,request_payload_sha256,payload_key_id,payload_nonce_b64url,
        encrypted_payload_b64url,created_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,?,?,?)""",
    ("8" * 22, "tenant_outbox", "e" * 64, "key_v1", "D" * 16, "E" * 32,
     now + 1, now + 86_400_002),
)
db.execute(
    "UPDATE scan_jobs SET status='failed',finished_at_ms=?,terminal_reason='queue_timeout' WHERE scan_id=?",
    (now + 1, "7" * 22),
)
assert db.execute("SELECT COUNT(*) FROM scan_job_dispatch_outbox WHERE scan_id=?", ("7" * 22,)).fetchone() == (0,)
assert db.execute("SELECT reason FROM scan_payload_deletion_audit WHERE scan_id=?", ("7" * 22,)).fetchone() == ("job_terminal",)

for table in ("scan_policies", "scan_jobs", "scan_artifacts"):
    columns = {row[1] for row in db.execute(f"PRAGMA table_info({table})")}
    assert not ({"cookies", "observations", "raw_url", "request_body", "screenshot", "dom"} & columns)

print("Scan retention schema smoke PASSED: request/day/concurrency limits, idempotency, origin freshness/revocation, queued/running job cancellation on ownership revocation, job states and recovery reasons, encrypted outbox immutability/TTL, terminal-payload deletion audit, redacted artifact bounds, and audited artifact/job delete constraints.")
print("Scope: local SQLite schema only; intake/dispatch/recovery/retention flags remain disabled in staging; no browser egress, D1 runtime, R2 binding, queue binding, consumer, or Cron Trigger is active.")
