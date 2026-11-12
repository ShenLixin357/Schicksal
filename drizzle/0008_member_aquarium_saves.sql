CREATE TABLE IF NOT EXISTS member_aquarium_saves (
  citizen_id TEXT NOT NULL,
  slot_id TEXT NOT NULL DEFAULT 'main',
  state_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (citizen_id, slot_id)
);
CREATE INDEX IF NOT EXISTS member_aquarium_saves_updated_idx ON member_aquarium_saves(updated_at);
