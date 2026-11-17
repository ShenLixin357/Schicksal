-- Additive only: preserve the existing room, its selected vase and all old records.
CREATE TABLE IF NOT EXISTS committee_vase_history (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  citizen_id TEXT NOT NULL,
  vase_selection TEXT NOT NULL,
  created_at TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('manual', 'random'))
);
