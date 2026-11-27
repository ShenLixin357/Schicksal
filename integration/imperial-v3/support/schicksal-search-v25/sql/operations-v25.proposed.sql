-- Additive preview only. Never execute against production automatically.
CREATE TABLE exploration_hint_history(egg_id TEXT NOT NULL,revision INTEGER NOT NULL CHECK(revision>0),palette TEXT NOT NULL CHECK(palette IN ('original','poetic','quiet','observant','withhold')),actor TEXT NOT NULL,term TEXT NOT NULL,reason TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(egg_id,revision));
CREATE TRIGGER exploration_hint_no_update BEFORE UPDATE ON exploration_hint_history BEGIN SELECT RAISE(ABORT,'immutable hint history'); END;
CREATE TRIGGER exploration_hint_no_delete BEFORE DELETE ON exploration_hint_history BEGIN SELECT RAISE(ABORT,'immutable hint history'); END;
CREATE TABLE operations_ack_history(id INTEGER PRIMARY KEY AUTOINCREMENT,issue_key TEXT NOT NULL,fingerprint TEXT NOT NULL,actor TEXT NOT NULL,term TEXT NOT NULL,reason TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(issue_key,fingerprint));
CREATE TRIGGER operations_ack_no_update BEFORE UPDATE ON operations_ack_history BEGIN SELECT RAISE(ABORT,'immutable acknowledgement'); END;
CREATE TRIGGER operations_ack_no_delete BEFORE DELETE ON operations_ack_history BEGIN SELECT RAISE(ABORT,'immutable acknowledgement'); END;
CREATE TABLE document_job_runs(id INTEGER PRIMARY KEY AUTOINCREMENT,source_sha TEXT NOT NULL,actor TEXT NOT NULL,outcome TEXT NOT NULL CHECK(outcome IN ('ok','failed')),created_at INTEGER NOT NULL);
CREATE INDEX document_job_recent ON document_job_runs(source_sha,created_at);
CREATE TABLE visual_index(sha256 TEXT NOT NULL,algorithm TEXT NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(sha256,algorithm));
CREATE TABLE visual_usage(day TEXT PRIMARY KEY,units INTEGER NOT NULL CHECK(units>=0));
CREATE TABLE document_job_claims(day TEXT NOT NULL,source_sha TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(day,source_sha));
CREATE TABLE operations_session_revocations(id INTEGER PRIMARY KEY AUTOINCREMENT,target TEXT NOT NULL,actor TEXT NOT NULL,term TEXT NOT NULL,reason TEXT NOT NULL,session_count INTEGER NOT NULL CHECK(session_count>=0),created_at INTEGER NOT NULL);
CREATE TRIGGER operations_revoke_sessions AFTER INSERT ON operations_session_revocations BEGIN DELETE FROM member_sessions WHERE citizen_id=NEW.target; END;
CREATE TRIGGER operations_revoke_no_update BEFORE UPDATE ON operations_session_revocations BEGIN SELECT RAISE(ABORT,'immutable revocation'); END;
CREATE TRIGGER operations_revoke_no_delete BEFORE DELETE ON operations_session_revocations BEGIN SELECT RAISE(ABORT,'immutable revocation'); END;
-- Machine descriptions are suggestions; only explicitly reviewed revisions are searchable.
CREATE TABLE visual_caption_drafts(id TEXT PRIMARY KEY,sha256 TEXT NOT NULL,model TEXT NOT NULL,payload TEXT NOT NULL,actor TEXT NOT NULL,term TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE visual_caption_history(sha256 TEXT NOT NULL,revision INTEGER NOT NULL CHECK(revision>0),draft_id TEXT,payload TEXT NOT NULL,actor TEXT NOT NULL,term TEXT NOT NULL,reason TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(sha256,revision));
CREATE TRIGGER visual_caption_history_no_update BEFORE UPDATE ON visual_caption_history BEGIN SELECT RAISE(ABORT,'immutable caption'); END;
CREATE TRIGGER visual_caption_history_no_delete BEFORE DELETE ON visual_caption_history BEGIN SELECT RAISE(ABORT,'immutable caption'); END;
CREATE TRIGGER visual_caption_draft_no_update BEFORE UPDATE ON visual_caption_drafts BEGIN SELECT RAISE(ABORT,'immutable suggestion'); END;
CREATE TRIGGER visual_caption_draft_no_delete BEFORE DELETE ON visual_caption_drafts BEGIN SELECT RAISE(ABORT,'immutable suggestion'); END;
CREATE TABLE visual_caption_usage(day TEXT PRIMARY KEY,units INTEGER NOT NULL CHECK(units>=0));
