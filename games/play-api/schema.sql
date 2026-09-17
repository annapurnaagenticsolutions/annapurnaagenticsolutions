CREATE TABLE IF NOT EXISTS game_progress (
  game_id TEXT NOT NULL,
  player_key_hash TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (game_id, player_key_hash)
);

CREATE INDEX IF NOT EXISTS idx_game_progress_updated_at
  ON game_progress (updated_at);
