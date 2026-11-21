-- Additive privileged-role login separation. Old sessions remain ordinary citizen sessions.
ALTER TABLE member_sessions ADD COLUMN account_mode TEXT NOT NULL DEFAULT 'citizen' CHECK(account_mode IN ('citizen','technology'));
ALTER TABLE member_sessions ADD COLUMN minister_grant_expires_at INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS technology_credentials (
  citizen_id TEXT PRIMARY KEY NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL
);
