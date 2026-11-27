-- Isolated proposal only. No production migration, bucket or binding is created.
CREATE TABLE gallery_blobs (
 sha256 TEXT PRIMARY KEY CHECK(length(sha256)=64), mime TEXT NOT NULL,
 byte_size INTEGER NOT NULL CHECK(byte_size>0), storage_key TEXT NOT NULL UNIQUE,
 state TEXT NOT NULL CHECK(state IN ('pending','ready')), created_at TEXT NOT NULL
);
CREATE TABLE gallery_works (
 id TEXT PRIMARY KEY,title TEXT NOT NULL,collection TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL,
 trashed_at TEXT
);
CREATE TABLE gallery_versions (
 id TEXT PRIMARY KEY,work_id TEXT NOT NULL REFERENCES gallery_works(id),parent_id TEXT REFERENCES gallery_versions(id),
 ordinal INTEGER NOT NULL CHECK(ordinal>0),original_sha TEXT NOT NULL REFERENCES gallery_blobs(sha256),
 original_name TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL, UNIQUE(work_id,ordinal)
);
CREATE TABLE gallery_variants (
 version_id TEXT NOT NULL REFERENCES gallery_versions(id), role TEXT NOT NULL CHECK(role IN ('preview','thumbnail')),
 sha256 TEXT NOT NULL REFERENCES gallery_blobs(sha256), PRIMARY KEY(version_id,role)
);
CREATE TABLE gallery_refs (
 work_id TEXT NOT NULL REFERENCES gallery_works(id), source TEXT NOT NULL,PRIMARY KEY(work_id,source)
);
CREATE INDEX gallery_work_versions ON gallery_versions(work_id,ordinal DESC);
CREATE INDEX gallery_collection ON gallery_works(collection,trashed_at);
CREATE TRIGGER gallery_versions_no_update BEFORE UPDATE ON gallery_versions BEGIN SELECT RAISE(ABORT,'immutable gallery version'); END;
CREATE TRIGGER gallery_versions_no_delete BEFORE DELETE ON gallery_versions BEGIN SELECT RAISE(ABORT,'immutable gallery version'); END;
CREATE TRIGGER gallery_protect_trash BEFORE UPDATE OF trashed_at ON gallery_works WHEN NEW.trashed_at IS NOT NULL AND EXISTS(SELECT 1 FROM gallery_refs WHERE work_id=NEW.id) BEGIN SELECT RAISE(ABORT,'referenced work'); END;
CREATE TRIGGER gallery_protect_ref BEFORE INSERT ON gallery_refs WHEN EXISTS(SELECT 1 FROM gallery_works WHERE id=NEW.work_id AND trashed_at IS NOT NULL) BEGIN SELECT RAISE(ABORT,'trashed work'); END;
-- Unapplied proposal: metadata edits do not mutate artwork versions.
CREATE TABLE gallery_metadata (
 work_id TEXT PRIMARY KEY REFERENCES gallery_works(id), revision INTEGER NOT NULL CHECK(revision>0),
 tags_json TEXT NOT NULL CHECK(json_valid(tags_json) AND json_type(tags_json)='array'),
 updated_by TEXT NOT NULL, updated_at TEXT NOT NULL
);
