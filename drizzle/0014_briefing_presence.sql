-- Move request-time DDL for authenticated Briefing and member presence to
-- reviewed, additive migrations. Existing rows, archived personal tasks and
-- presence heartbeat timestamps must survive unchanged.
CREATE TABLE IF NOT EXISTS briefing_archives (
  citizen_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  archived_at TEXT NOT NULL,
  PRIMARY KEY (citizen_id, task_id)
);
CREATE TABLE IF NOT EXISTS member_presence (
  session_hash TEXT PRIMARY KEY NOT NULL,
  citizen_id TEXT NOT NULL,
  last_seen_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS member_presence_recent_idx ON member_presence (last_seen_ms);
