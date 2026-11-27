-- Isolated preview, not a numbered production migration.
CREATE TABLE IF NOT EXISTS imperial_notice_reads(
 citizen_id TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('citizen','technology')),
 scope TEXT NOT NULL, kind TEXT NOT NULL, entity TEXT NOT NULL, version TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0), read_at INTEGER NOT NULL CHECK(read_at>0),
 PRIMARY KEY(citizen_id,mode,scope,kind,entity,version,revision)
);
CREATE TRIGGER IF NOT EXISTS imperial_notice_read_no_update BEFORE UPDATE ON imperial_notice_reads BEGIN SELECT RAISE(ABORT,'immutable notice receipt'); END;
CREATE TRIGGER IF NOT EXISTS imperial_notice_read_no_delete BEFORE DELETE ON imperial_notice_reads BEGIN SELECT RAISE(ABORT,'immutable notice receipt'); END;
