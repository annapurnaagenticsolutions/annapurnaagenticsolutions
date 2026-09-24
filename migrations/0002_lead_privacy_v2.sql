-- Pramana lead/report privacy separation v2
-- Does not drop legacy `leads`; new code stops writing compliance score/grade fields.

CREATE TABLE IF NOT EXISTS report_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  report_delivery_ack INTEGER NOT NULL DEFAULT 1,
  privacy_notice_ver TEXT NOT NULL,
  source_url TEXT,
  resend_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_report_requests_email ON report_requests(email);
CREATE INDEX IF NOT EXISTS idx_report_requests_created_at ON report_requests(created_at);

CREATE TABLE IF NOT EXISTS marketing_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  organization TEXT,
  role TEXT,
  company_size TEXT,
  sector TEXT,
  budget_range TEXT,
  implementation_readiness INTEGER,
  evidence_readiness INTEGER,
  applicability_info TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  marketing_opt_in INTEGER NOT NULL DEFAULT 1,
  marketing_consent_ver TEXT NOT NULL,
  privacy_notice_ver TEXT NOT NULL,
  source_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_sector ON marketing_leads(sector);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_created_at ON marketing_leads(created_at);
