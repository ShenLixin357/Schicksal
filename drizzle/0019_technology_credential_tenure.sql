-- Tie independent office password to an individual elected term.
-- A former minister's known office password must never authenticate their successor.
ALTER TABLE technology_direct_credentials ADD COLUMN citizen_id TEXT NOT NULL DEFAULT '';
ALTER TABLE technology_direct_credentials ADD COLUMN term_id TEXT NOT NULL DEFAULT '';
