CREATE TABLE IF NOT EXISTS member_insaniquarium_saves (
  citizen_id TEXT PRIMARY KEY NOT NULL,
  state_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TEXT NOT NULL
);
