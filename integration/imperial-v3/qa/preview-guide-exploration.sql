-- Preview-only additive schema, derived from the reviewed ministry/guide/exploration proposals.
-- Never put into production drizzle migrations. Re-execution retains existing history.
-- Proposal only. Apply to a dedicated preview DB, not production.
CREATE TABLE IF NOT EXISTS ministry_changes (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 kind TEXT NOT NULL CHECK(kind IN ('profile','account','permission','feature')),
 target TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0),
 payload TEXT NOT NULL CHECK(json_valid(payload)),
 actor TEXT NOT NULL,
 term TEXT NOT NULL,
 reason TEXT NOT NULL CHECK(length(reason) BETWEEN 1 AND 500),
 created_at INTEGER NOT NULL,
 UNIQUE(kind,target,revision)
);
CREATE INDEX IF NOT EXISTS ministry_changes_lookup ON ministry_changes(kind,target,revision DESC);
CREATE VIEW IF NOT EXISTS ministry_current AS SELECT a.* FROM ministry_changes a WHERE NOT EXISTS(SELECT 1 FROM ministry_changes b WHERE b.kind=a.kind AND b.target=a.target AND b.revision>a.revision);
CREATE TRIGGER IF NOT EXISTS ministry_no_update BEFORE UPDATE ON ministry_changes BEGIN SELECT RAISE(ABORT,'immutable ministry history'); END;
CREATE TRIGGER IF NOT EXISTS ministry_no_delete BEFORE DELETE ON ministry_changes BEGIN SELECT RAISE(ABORT,'immutable ministry history'); END;
CREATE TRIGGER IF NOT EXISTS ministry_freeze_incumbent BEFORE INSERT ON ministry_changes WHEN NEW.kind='account' AND json_extract(NEW.payload,'$.frozen')=1 AND EXISTS(SELECT 1 FROM current_office_holders WHERE office_id='technology' AND citizen_id=NEW.target) BEGIN SELECT RAISE(ABORT,'incumbent cannot be frozen'); END;
CREATE TRIGGER IF NOT EXISTS ministry_freeze_sessions AFTER INSERT ON ministry_changes WHEN NEW.kind='account' AND json_extract(NEW.payload,'$.frozen')=1 BEGIN DELETE FROM member_sessions WHERE citizen_id=NEW.target; END;
-- Prevent a concurrent password verification from creating a new session after freeze.
CREATE TRIGGER IF NOT EXISTS ministry_no_frozen_session BEFORE INSERT ON member_sessions WHEN EXISTS(SELECT 1 FROM ministry_current WHERE kind='account' AND target=NEW.citizen_id AND json_extract(payload,'$.frozen')=1) BEGIN SELECT RAISE(ABORT,'frozen account'); END;

CREATE TABLE IF NOT EXISTS guide_copy_history (
 target TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>0), payload TEXT NOT NULL CHECK(json_valid(payload)), actor TEXT NOT NULL, term TEXT NOT NULL, reason TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(target,revision)
);
CREATE TRIGGER IF NOT EXISTS guide_history_no_update BEFORE UPDATE ON guide_copy_history BEGIN SELECT RAISE(ABORT,'immutable guide history'); END;
CREATE TRIGGER IF NOT EXISTS guide_history_no_delete BEFORE DELETE ON guide_copy_history BEGIN SELECT RAISE(ABORT,'immutable guide history'); END;

-- Independent preview only. Cosmetic discovery, never points/cards/authorization.
CREATE TABLE IF NOT EXISTS exploration_discoveries (
 citizen_id TEXT NOT NULL, egg_id TEXT NOT NULL, first_seen_at INTEGER NOT NULL CHECK(first_seen_at>0),
 PRIMARY KEY(citizen_id,egg_id)
);
CREATE TRIGGER IF NOT EXISTS exploration_discovery_immutable_update BEFORE UPDATE ON exploration_discoveries BEGIN SELECT RAISE(ABORT,'discovery history immutable'); END;
CREATE TRIGGER IF NOT EXISTS exploration_discovery_immutable_delete BEFORE DELETE ON exploration_discoveries BEGIN SELECT RAISE(ABORT,'discovery history immutable'); END;
