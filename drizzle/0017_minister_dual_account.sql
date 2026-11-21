-- Draft-only additive migration: one citizen password, two session modes;
-- verified current office assignments are the sole source for office authority.
ALTER TABLE member_sessions ADD COLUMN account_mode TEXT NOT NULL DEFAULT 'citizen' CHECK(account_mode IN ('citizen','technology'));
ALTER TABLE member_sessions ADD COLUMN minister_grant_expires_at INTEGER NOT NULL DEFAULT 0;
CREATE TABLE current_office_holders (
  office_id TEXT NOT NULL,
  citizen_id TEXT NOT NULL,
  term_id TEXT NOT NULL DEFAULT 'founding-2026',
  updated_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (office_id, citizen_id)
);
CREATE INDEX current_office_holders_citizen_idx ON current_office_holders(citizen_id);
INSERT INTO current_office_holders(office_id,citizen_id) VALUES
  ('president','amberina'),
  ('committee','amberina'),('committee','zxy'),('committee','truth'),
  ('technology','amberina'),('puzzles','amberina'),('culture','amberina');
