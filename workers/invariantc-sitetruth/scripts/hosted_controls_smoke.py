#!/usr/bin/env python3
"""SQLite structural smoke for the future hosted-controls schema; no services or network."""
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "db" / "hosted_controls_reference.sql"
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
db.executescript(SCHEMA.read_text(encoding="utf-8"))

now = "2026-10-08T12:00:00Z"
later = "2026-10-08T12:05:00Z"
valid_until = "2026-10-09T11:59:59Z"
hash_a = "a" * 64
hash_b = "b" * 64

def must_reject(label, sql, values=()):
    try:
        db.execute(sql, values)
    except sqlite3.IntegrityError:
        return
    raise AssertionError(f"expected schema to reject {label}")

db.execute(
    """INSERT INTO hosted_tenant_policies
       (tenant_id,created_at,requests_per_minute,scans_per_day,concurrent_scans,
        max_pages_per_scan,max_run_seconds,artifact_retention_days)
       VALUES (?,?,?,?,?,?,?,?)""",
    ("tenant-a", now, 30, 3, 2, 10, 120, 7),
)

# A verified origin cannot be created from an unconsumed or expired challenge.
db.execute(
    """INSERT INTO hosted_domain_challenges
       (challenge_id,tenant_id,hostname_ascii,challenge_sha256,issued_at,expires_at)
       VALUES (?,?,?,?,?,?)""",
    ("challenge-bad", "tenant-a", "owned.example", hash_a, now, later),
)
must_reject(
    "unconsumed ownership challenge",
    """INSERT INTO hosted_verified_origins
       (origin_id,tenant_id,hostname_ascii,origin,challenge_id,verified_at,verification_expires_at)
       VALUES (?,?,?,?,?,?,?)""",
    ("origin-bad", "tenant-a", "owned.example", "https://owned.example", "challenge-bad", now, valid_until),
)

db.execute(
    """INSERT INTO hosted_domain_challenges
       (challenge_id,tenant_id,hostname_ascii,challenge_sha256,issued_at,expires_at,consumed_at)
       VALUES (?,?,?,?,?,?,?)""",
    ("challenge-a", "tenant-a", "owned.example", hash_a, now, later, now),
)
db.execute(
    """INSERT INTO hosted_verified_origins
       (origin_id,tenant_id,hostname_ascii,origin,challenge_id,verified_at,verification_expires_at)
       VALUES (?,?,?,?,?,?,?)""",
    ("origin-a", "tenant-a", "owned.example", "https://owned.example", "challenge-a", now, valid_until),
)
must_reject("ownership challenge replay", """INSERT INTO hosted_verified_origins
    (origin_id,tenant_id,hostname_ascii,origin,challenge_id,verified_at,verification_expires_at)
    VALUES ('origin-replay','tenant-a','owned.example','https://owned.example','challenge-a',?,'2026-10-09T11:59:59Z')""", (now,))
must_reject("ownership challenge reuse", "UPDATE hosted_domain_challenges SET consumed_at=NULL WHERE challenge_id='challenge-a'")

def add_scan(scan_id, idempotency_key, created=now, expires="2026-10-15T12:00:00Z"):
    db.execute(
        """INSERT INTO hosted_scan_jobs
           (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,status,created_at,expires_at)
           VALUES (?,?,?,?,?,'queued',?,?)""",
        (scan_id, "tenant-a", "origin-a", idempotency_key, hash_b, created, expires),
    )

add_scan("scan-1", "idem-1")
add_scan("scan-2", "idem-2")
must_reject("scan metadata extension", "UPDATE hosted_scan_jobs SET expires_at='2026-10-20T12:00:00Z' WHERE scan_id='scan-1'")
must_reject("concurrency above tenant policy", """INSERT INTO hosted_scan_jobs
    (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,status,created_at,expires_at)
    VALUES ('scan-3','tenant-a','origin-a','idem-3',?,'queued',?,?)""", (hash_b, now, "2026-10-15T12:00:00Z"))
db.execute("UPDATE hosted_scan_jobs SET status='running',started_at=? WHERE scan_id='scan-1'", (now,))
db.execute("UPDATE hosted_scan_jobs SET status='succeeded',finished_at=? WHERE scan_id='scan-1'", (later,))
add_scan("scan-3", "idem-3")
must_reject("daily quota above tenant policy", """INSERT INTO hosted_scan_jobs
    (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,status,created_at,expires_at)
    VALUES ('scan-4','tenant-a','origin-a','idem-4',?,'queued',?,?)""", (hash_b, now, "2026-10-15T12:00:00Z"))

db.execute("UPDATE hosted_scan_jobs SET status='running' WHERE scan_id='scan-2'")
db.execute("UPDATE hosted_scan_jobs SET status='succeeded' WHERE scan_id='scan-2'")
db.execute("UPDATE hosted_scan_jobs SET status='running' WHERE scan_id='scan-3'")
db.execute("UPDATE hosted_scan_jobs SET status='succeeded' WHERE scan_id='scan-3'")
db.execute(
    """INSERT INTO hosted_redacted_artifacts
       (artifact_id,tenant_id,scan_id,object_key,media_type,content_sha256,is_redacted,created_at,expires_at)
       VALUES (?,?,?,?,?,?,?,?,?)""",
    ("artifact-1", "tenant-a", "scan-1", "tenant-a/9f3d/report.json", "application/json", hash_a, 1, later, "2026-10-15T12:05:00Z"),
)
must_reject("artifact retention extension", "UPDATE hosted_redacted_artifacts SET expires_at='2026-10-20T12:05:00Z' WHERE artifact_id='artifact-1'")
must_reject("unredacted artifact", """INSERT INTO hosted_redacted_artifacts
    (artifact_id,tenant_id,scan_id,object_key,media_type,content_sha256,is_redacted,created_at,expires_at)
    VALUES ('artifact-2','tenant-a','scan-2','tenant-a/9f3e/raw.json','application/json',?,0,?,?)""", (hash_a, later, "2026-10-15T12:05:00Z"))
must_reject("artifact expiry beyond tenant maximum", """INSERT INTO hosted_redacted_artifacts
    (artifact_id,tenant_id,scan_id,object_key,media_type,content_sha256,is_redacted,created_at,expires_at)
    VALUES ('artifact-3','tenant-a','scan-2','tenant-a/9f3f/report.json','application/json',?,1,?,?)""", (hash_a, later, "2026-10-16T12:05:00Z"))

origin_columns = {row[1] for row in db.execute("PRAGMA table_info(hosted_verified_origins)")}
job_columns = {row[1] for row in db.execute("PRAGMA table_info(hosted_scan_jobs)")}
artifact_columns = {row[1] for row in db.execute("PRAGMA table_info(hosted_redacted_artifacts)")}
assert not ({"cookie", "cookies", "observations", "raw_url", "request_body"} & (origin_columns | job_columns | artifact_columns))
expired = db.execute(
    "SELECT artifact_id FROM hosted_redacted_artifacts WHERE expires_at<=?", ("2026-10-16T00:00:00Z",)
).fetchall()
assert expired == [("artifact-1",)]
parent_expiring = db.execute(
    """SELECT a.artifact_id FROM hosted_redacted_artifacts a
       JOIN hosted_scan_jobs j ON j.scan_id=a.scan_id AND j.tenant_id=a.tenant_id
       WHERE a.expires_at<=? OR j.expires_at<=?""",
    ("2026-10-15T12:01:00Z", "2026-10-15T12:01:00Z"),
).fetchall()
assert parent_expiring == [("artifact-1",)]

# Freshness and revocation checks are independent of the first tenant's exhausted quota.
db.execute(
    """INSERT INTO hosted_tenant_policies
       (tenant_id,created_at,requests_per_minute,scans_per_day,concurrent_scans,
        max_pages_per_scan,max_run_seconds,artifact_retention_days)
       VALUES (?,?,?,?,?,?,?,?)""",
    ("tenant-b", now, 10, 5, 1, 5, 60, 7),
)
db.execute(
    """INSERT INTO hosted_domain_challenges
       (challenge_id,tenant_id,hostname_ascii,challenge_sha256,issued_at,expires_at,consumed_at)
       VALUES (?,?,?,?,?,?,?)""",
    ("challenge-expiring", "tenant-b", "fresh.example", hash_a, now, later, now),
)
db.execute(
    """INSERT INTO hosted_verified_origins
       (origin_id,tenant_id,hostname_ascii,origin,challenge_id,verified_at,verification_expires_at)
       VALUES (?,?,?,?,?,?,?)""",
    ("origin-expiring", "tenant-b", "fresh.example", "https://fresh.example", "challenge-expiring", now, "2026-10-08T12:00:10Z"),
)
must_reject("expired ownership verification", """INSERT INTO hosted_scan_jobs
    (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,status,created_at,expires_at)
    VALUES ('scan-expired','tenant-b','origin-expiring','idem-expired',?,'queued','2026-10-08T12:00:11Z','2026-10-15T12:00:11Z')""", (hash_b,))

db.execute(
    """INSERT INTO hosted_domain_challenges
       (challenge_id,tenant_id,hostname_ascii,challenge_sha256,issued_at,expires_at,consumed_at)
       VALUES (?,?,?,?,?,?,?)""",
    ("challenge-revoked", "tenant-b", "revoked.example", hash_b, now, later, now),
)
db.execute(
    """INSERT INTO hosted_verified_origins
       (origin_id,tenant_id,hostname_ascii,origin,challenge_id,verified_at,verification_expires_at)
       VALUES (?,?,?,?,?,?,?)""",
    ("origin-revoked", "tenant-b", "revoked.example", "https://revoked.example", "challenge-revoked", now, valid_until),
)
db.execute("UPDATE hosted_verified_origins SET revoked_at=? WHERE origin_id='origin-revoked'", (later,))
must_reject("revoked origin", """INSERT INTO hosted_scan_jobs
    (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,status,created_at,expires_at)
    VALUES ('scan-revoked','tenant-b','origin-revoked','idem-revoked',?,'queued',?,'2026-10-15T12:00:00Z')""", (hash_b, now))
must_reject("reactivation without a new proof", "UPDATE hosted_verified_origins SET revoked_at=NULL WHERE origin_id='origin-revoked'")
db.execute(
    """INSERT INTO hosted_domain_challenges
       (challenge_id,tenant_id,hostname_ascii,challenge_sha256,issued_at,expires_at,consumed_at)
       VALUES (?,?,?,?,?,?,?)""",
    ("challenge-reverify", "tenant-b", "revoked.example", hash_a, "2026-10-08T12:06:00Z", "2026-10-08T12:11:00Z", "2026-10-08T12:06:00Z"),
)
db.execute(
    """UPDATE hosted_verified_origins
       SET challenge_id='challenge-reverify',verified_at='2026-10-08T12:06:00Z',
           verification_expires_at='2026-10-09T12:05:59Z',revoked_at=NULL
       WHERE origin_id='origin-revoked'"""
)
db.execute("""INSERT INTO hosted_scan_jobs
    (scan_id,tenant_id,origin_id,idempotency_key,capture_spec_sha256,status,created_at,expires_at)
    VALUES ('scan-reverified','tenant-b','origin-revoked','idem-reverified',?,'queued','2026-10-08T12:06:01Z','2026-10-15T12:06:01Z')""", (hash_b,))

print("Hosted-controls reference schema PASSED: ownership challenge linkage, verified-origin gate, daily/concurrent quotas, scan state, redaction, and retention bound.")
print("Scope: local SQLite structure only; DNS, tenant auth, Durable Object coordination, egress isolation, D1/R2 behavior and deletion service are not exercised.")
