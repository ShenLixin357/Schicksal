-- Proposal only. Do not apply to any remote D1. Assign a migration number after integration review.
CREATE TABLE library_revisions (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 revision TEXT NOT NULL UNIQUE,
 kind TEXT NOT NULL CHECK(kind IN ('book','animation')),
 entity_id TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('draft','published')),
 base_revision TEXT,
 origin_draft TEXT UNIQUE REFERENCES library_revisions(revision),
 actor TEXT NOT NULL,
 created_at TEXT NOT NULL,
 payload TEXT NOT NULL CHECK(json_valid(payload)),
 CHECK((state='draft' AND origin_draft IS NULL) OR state='published')
);
CREATE INDEX library_revisions_lookup ON library_revisions(kind,entity_id,state,seq DESC);
CREATE TRIGGER library_revisions_immutable_update BEFORE UPDATE ON library_revisions BEGIN SELECT RAISE(ABORT,'immutable library revision'); END;
CREATE TRIGGER library_revisions_immutable_delete BEFORE DELETE ON library_revisions BEGIN SELECT RAISE(ABORT,'immutable library revision'); END;
