-- Optional product and Play updates subscription.
-- Rows are written only after the email address is verified with a one-time code.
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  interest TEXT,
  marketing_opt_in INTEGER NOT NULL DEFAULT 1,
  consent_ver TEXT NOT NULL,
  privacy_notice_ver TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  unsubscribed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_source ON subscriptions(source);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at);
