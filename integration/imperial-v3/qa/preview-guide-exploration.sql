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

-- Authoritative card action journal. No public endpoint accepts these events.
-- Each committed draw/use (including non-rare cards) must be appended by its
-- server-owned producer in the SAME D1 transaction as the actual card action.
CREATE TABLE IF NOT EXISTS imperial_card_actions (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 source_id TEXT NOT NULL UNIQUE,
 citizen_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('draw','use')),
 card_id TEXT NOT NULL,
 at INTEGER NOT NULL CHECK(at>0)
);
CREATE INDEX IF NOT EXISTS imperial_card_actions_stream ON imperial_card_actions(citizen_id,action,seq DESC);
CREATE TABLE IF NOT EXISTS imperial_achievement_history (
 citizen_id TEXT NOT NULL, achievement_id TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>0),
 state TEXT NOT NULL CHECK(state IN ('granted','revoked')),
 source_seq INTEGER REFERENCES imperial_card_actions(seq),
 actor TEXT NOT NULL, reason TEXT NOT NULL, at INTEGER NOT NULL CHECK(at>0),
 PRIMARY KEY(citizen_id,achievement_id,revision)
);
CREATE VIEW IF NOT EXISTS imperial_achievement_current AS
 SELECT h.* FROM imperial_achievement_history h
 WHERE NOT EXISTS(SELECT 1 FROM imperial_achievement_history n WHERE n.citizen_id=h.citizen_id AND n.achievement_id=h.achievement_id AND n.revision>h.revision);
CREATE TRIGGER IF NOT EXISTS imperial_card_actions_no_update BEFORE UPDATE ON imperial_card_actions BEGIN SELECT RAISE(ABORT,'immutable card action'); END;
CREATE TRIGGER IF NOT EXISTS imperial_card_actions_no_delete BEFORE DELETE ON imperial_card_actions BEGIN SELECT RAISE(ABORT,'immutable card action'); END;
CREATE TRIGGER IF NOT EXISTS imperial_achievement_no_update BEFORE UPDATE ON imperial_achievement_history BEGIN SELECT RAISE(ABORT,'immutable achievement history'); END;
CREATE TRIGGER IF NOT EXISTS imperial_achievement_no_delete BEFORE DELETE ON imperial_achievement_history BEGIN SELECT RAISE(ABORT,'immutable achievement history'); END;
-- One award only, within one action stream. Other cards break the sequence;
-- a draw and a use cannot combine. Revocation does not silently re-award.
CREATE TRIGGER IF NOT EXISTS imperial_dateline_award AFTER INSERT ON imperial_card_actions
 WHEN NEW.card_id IN ('witch-perihelion','solstice-dendrite')
 BEGIN
 INSERT INTO imperial_achievement_history(citizen_id,achievement_id,revision,state,source_seq,actor,reason,at)
 SELECT NEW.citizen_id,'international-date-line',1,'granted',NEW.seq,'system:card-actions','consecutive authoritative rare card actions',NEW.at
 WHERE (SELECT card_id FROM imperial_card_actions
        WHERE citizen_id=NEW.citizen_id AND action=NEW.action AND seq<NEW.seq ORDER BY seq DESC LIMIT 1)
       = CASE NEW.card_id WHEN 'witch-perihelion' THEN 'solstice-dendrite' ELSE 'witch-perihelion' END
 ON CONFLICT(citizen_id,achievement_id,revision) DO NOTHING;
 END;
