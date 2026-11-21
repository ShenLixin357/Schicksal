-- Separate ministry-only direct credential. The password is salted+hashed,
-- never stored in the GitHub tree or sent back to a client.
CREATE TABLE technology_direct_credentials (
  office_id TEXT PRIMARY KEY NOT NULL CHECK(office_id = 'technology'),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL
);
-- Source distinguishes citizen-password sessions from ministry-password sessions
-- so changing the separate office password revokes direct-login sessions.
ALTER TABLE member_sessions ADD COLUMN auth_source TEXT NOT NULL DEFAULT 'personal'
  CHECK(auth_source IN ('personal','ministry-direct'));
