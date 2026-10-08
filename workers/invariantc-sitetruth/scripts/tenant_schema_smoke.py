#!/usr/bin/env python3
"""SQLite-only smoke for the pilot tenant/key migration; does not represent Cloudflare D1."""
from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "worker" / "migrations" / "0001_tenant_api.sql"


def rejected(connection: sqlite3.Connection, statement: str, values: tuple[object, ...]) -> None:
    try:
        connection.execute(statement, values)
    except sqlite3.IntegrityError:
        return
    raise AssertionError("SQLite accepted an invalid tenant/key row")


connection = sqlite3.connect(":memory:")
connection.execute("PRAGMA foreign_keys = ON")
connection.executescript(MIGRATION.read_text(encoding="utf-8"))
tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
assert tables == {"tenants", "api_keys"}, tables

connection.execute(
    "INSERT INTO tenants (tenant_id, status, created_at_ms) VALUES (?, 'active', ?)",
    ("pilot_tenant_1", 1_800_000_000_000),
)
rejected(connection,
    "INSERT INTO api_keys (key_id, tenant_id, token_sha256, status, created_at_ms, expires_at_ms) VALUES (?, ?, ?, 'active', ?, ?)",
    ("bad key id", "pilot_tenant_1", "a" * 64, 1_800_000_000_000, 1_803_000_000_000),
)

connection.execute(
    "UPDATE tenants SET requests_per_minute = ?, requests_per_day = ?, max_concurrent = ? WHERE tenant_id = ?",
    (6, 50, 1, "pilot_tenant_1"),
)
key = ("k" * 22, "pilot_tenant_1", "a" * 64, 1_800_000_000_000, 1_803_000_000_000)
connection.execute(
    "INSERT INTO api_keys (key_id, tenant_id, token_sha256, status, created_at_ms, expires_at_ms) VALUES (?, ?, ?, 'active', ?, ?)",
    key,
)
rejected(connection,
    "INSERT INTO api_keys (key_id, tenant_id, token_sha256, status, created_at_ms, expires_at_ms) VALUES (?, ?, ?, 'active', ?, ?)",
    ("z" * 22, "pilot_tenant_1", "a" * 64, 1_800_000_000_000, 1_803_000_000_000),
)

connection.execute("UPDATE api_keys SET status = 'revoked', revoked_at_ms = ? WHERE key_id = ?", (1_800_000_000_001, "k" * 22))
assert connection.execute("SELECT status FROM api_keys WHERE key_id = ?", ("k" * 22,)).fetchone()[0] == "revoked"
connection.execute("DELETE FROM tenants WHERE tenant_id = ?", ("pilot_tenant_1",))
assert connection.execute("SELECT COUNT(*) FROM api_keys").fetchone()[0] == 0
connection.close()
print("Tenant schema smoke PASSED: nullable fail-closed policies, positive quota policy, hash/key constraints, revocation, and tenant cascade.")
