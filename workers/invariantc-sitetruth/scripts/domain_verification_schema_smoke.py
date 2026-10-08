#!/usr/bin/env python3
"""SQLite structural smoke for the disabled-by-default D1 domain-proof migration."""
from pathlib import Path
import sqlite3
import time


ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "worker" / "migrations"
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
db.executescript((MIGRATIONS / "0001_tenant_api.sql").read_text(encoding="utf-8"))
db.executescript((MIGRATIONS / "0002_domain_verification.sql").read_text(encoding="utf-8"))
db.executescript((MIGRATIONS / "0004_domain_metadata_retention.sql").read_text(encoding="utf-8"))


def must_reject(label: str, sql: str, parameters: tuple = ()) -> None:
    try:
        db.execute(sql, parameters)
    except sqlite3.IntegrityError:
        return
    raise SystemExit(f"Domain verification migration smoke FAILED: accepted {label}")


now = int(time.time() * 1000)
db.execute(
    """INSERT INTO tenants
       (tenant_id,status,requests_per_minute,requests_per_day,max_concurrent,created_at_ms)
       VALUES ('tenant_a','active',10,100,2,?)""",
    (now,),
)
db.execute(
    """INSERT INTO tenants
       (tenant_id,status,requests_per_minute,requests_per_day,max_concurrent,created_at_ms)
       VALUES ('tenant_b','active',10,100,2,?)""",
    (now,),
)

challenge_id = "c" * 22
challenge_hash = "a" * 64
hostname = "example.com"
issued_at = now
expires_at = now + 900_000
db.execute(
    """INSERT INTO domain_challenges
       (challenge_id,tenant_id,hostname_ascii,token_sha256,issued_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,?)""",
    (challenge_id, "tenant_a", hostname, challenge_hash, issued_at, expires_at),
)

columns = {row[1] for row in db.execute("PRAGMA table_info(domain_challenges)")}
if "token" in columns or "token_plaintext" in columns or "secret" in columns:
    raise SystemExit("Domain verification migration smoke FAILED: challenge secret column is present")

must_reject(
    "origin insertion before a consumed proof",
    """INSERT INTO verified_origins
       (origin_id,tenant_id,hostname_ascii,origin,challenge_id,verified_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,?,?)""",
    ("o" * 22, "tenant_a", hostname, f"https://{hostname}", challenge_id, issued_at + 1, issued_at + 86400000),
)
must_reject(
    "challenge lifetime over fifteen minutes",
    """INSERT INTO domain_challenges
       (challenge_id,tenant_id,hostname_ascii,token_sha256,issued_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,?)""",
    ("d" * 22, "tenant_a", "other.example.com", challenge_hash, now, now + 900001),
)
must_reject(
    "invalid hostname syntax",
    """INSERT INTO domain_challenges
       (challenge_id,tenant_id,hostname_ascii,token_sha256,issued_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,?)""",
    ("e" * 22, "tenant_a", "bad/host.example", challenge_hash, now, now + 900000),
)

verified_at = issued_at + 1000
db.execute(
    "UPDATE domain_challenges SET consumed_at_ms=? WHERE tenant_id=? AND challenge_id=?",
    (verified_at, "tenant_a", challenge_id),
)
origin_id = "o" * 22
db.execute(
    """INSERT INTO verified_origins
       (origin_id,tenant_id,hostname_ascii,origin,challenge_id,verified_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,?,?)""",
    (origin_id, "tenant_a", hostname, f"https://{hostname}", challenge_id, verified_at, verified_at + 86_400_000),
)
must_reject(
    "challenge replay",
    "UPDATE domain_challenges SET consumed_at_ms=? WHERE tenant_id=? AND challenge_id=?",
    (verified_at + 1, "tenant_a", challenge_id),
)
must_reject(
    "verified-origin hostname mutation",
    "UPDATE verified_origins SET hostname_ascii='other.example.com' WHERE origin_id=?",
    (origin_id,),
)
must_reject(
    "cross-tenant origin proof reuse",
    """INSERT INTO verified_origins
       (origin_id,tenant_id,hostname_ascii,origin,challenge_id,verified_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,?,?)""",
    ("x" * 22, "tenant_b", hostname, f"https://{hostname}", challenge_id, verified_at, verified_at + 86_400_000),
)

second_id = "f" * 22
second_verified_at = verified_at + 2000
db.execute(
    """INSERT INTO domain_challenges
       (challenge_id,tenant_id,hostname_ascii,token_sha256,issued_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,?)""",
    (second_id, "tenant_a", hostname, challenge_hash, second_verified_at - 1, second_verified_at + 899_999),
)
db.execute(
    "UPDATE domain_challenges SET consumed_at_ms=? WHERE tenant_id=? AND challenge_id=?",
    (second_verified_at, "tenant_a", second_id),
)
db.execute(
    """INSERT INTO verified_origins
       (origin_id,tenant_id,hostname_ascii,origin,challenge_id,verified_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT (tenant_id,hostname_ascii) DO UPDATE SET
         challenge_id=excluded.challenge_id,
         verified_at_ms=excluded.verified_at_ms,
         expires_at_ms=excluded.expires_at_ms,
         revoked_at_ms=NULL""",
    ("z" * 22, "tenant_a", hostname, f"https://{hostname}", second_id, second_verified_at, second_verified_at + 86_400_000),
)
row = db.execute(
    "SELECT origin_id,challenge_id,verified_at_ms FROM verified_origins WHERE tenant_id='tenant_a' AND hostname_ascii=?",
    (hostname,),
).fetchone()
if row != (origin_id, second_id, second_verified_at):
    raise SystemExit("Domain verification migration smoke FAILED: fresh proof did not renew the exact origin")

must_reject(
    "verified-origin deletion without audit evidence",
    "DELETE FROM verified_origins WHERE tenant_id=? AND origin_id=?",
    ("tenant_a", origin_id),
)
db.execute(
    """INSERT INTO domain_metadata_deletion_audit (record_type,record_id,tenant_id,deleted_at_ms)
       VALUES ('origin',?,?,?)""",
    (origin_id, "tenant_a", second_verified_at + 90_000_000),
)
db.execute("DELETE FROM verified_origins WHERE tenant_id=? AND origin_id=?", ("tenant_a", origin_id))
must_reject(
    "challenge deletion without audit evidence",
    "DELETE FROM domain_challenges WHERE tenant_id=? AND challenge_id=?",
    ("tenant_a", second_id),
)
db.execute(
    """INSERT INTO domain_metadata_deletion_audit (record_type,record_id,tenant_id,deleted_at_ms)
       VALUES ('challenge',?,?,?)""",
    (second_id, "tenant_a", second_verified_at + 90_000_000),
)
db.execute("DELETE FROM domain_challenges WHERE tenant_id=? AND challenge_id=?", ("tenant_a", second_id))
must_reject(
    "domain metadata deletion audit mutation",
    "UPDATE domain_metadata_deletion_audit SET deleted_at_ms=deleted_at_ms+1 WHERE record_type='origin' AND record_id=?",
    (origin_id,),
)

# Tenant cascades remain possible and do not erase the independent minimal audit.
db.execute(
    """INSERT INTO domain_challenges
       (challenge_id,tenant_id,hostname_ascii,token_sha256,issued_at_ms,expires_at_ms)
       VALUES (?,?,?,?,?,?)""",
    ("k" * 22, "tenant_b", "tenant-b.example.com", challenge_hash, now, now + 900_000),
)
db.execute("DELETE FROM tenants WHERE tenant_id='tenant_b'")
if db.execute("SELECT COUNT(*) FROM domain_challenges WHERE tenant_id='tenant_b'").fetchone()[0] != 0:
    raise SystemExit("Domain verification migration smoke FAILED: tenant cascade retained challenge rows")
if db.execute("SELECT COUNT(*) FROM domain_metadata_deletion_audit WHERE record_id=?", (origin_id,)).fetchone()[0] != 1:
    raise SystemExit("Domain verification migration smoke FAILED: tenant-independent deletion audit was lost")

print("Domain verification and retention migrations smoke PASSED: hashed challenge storage, tenant binding, single use, exact-host linkage, revocation, audited deletion, immutable minimal audit, and tenant cascade.")
print("Scope: SQLite schema and trigger behavior only; PSL behavior is covered by JavaScript tests, but no live resolver, Worker D1 transaction, or browser-egress behavior is verified.")
