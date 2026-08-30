-- Pramana Lead Gate — D1 Schema
-- Run via: npx wrangler d1 execute pramana-leads --file=./migrations/0001_leads.sql

CREATE TABLE IF NOT EXISTS leads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    UNIQUE NOT NULL,
  name          TEXT    NOT NULL,
  organization  TEXT,
  role          TEXT,
  company_size  TEXT,
  sector        TEXT,
  budget_range  TEXT,
  score         INTEGER,
  grade         TEXT,
  traffic_light TEXT,
  passed        INTEGER,
  failed        INTEGER,
  warnings      INTEGER,
  total         INTEGER,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  consent       INTEGER NOT NULL DEFAULT 1,
  consent_ver   TEXT    NOT NULL DEFAULT 'v1',
  source_url    TEXT,
  resend_at     TEXT,   -- last time OTP/results email was re-sent (for 24h dedup logic)
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_email       ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at  ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_sector      ON leads(sector);
