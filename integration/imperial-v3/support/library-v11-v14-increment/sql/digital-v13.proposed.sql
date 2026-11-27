-- Independent local proposal. No live migration or storage binding.
CREATE TABLE digital_blobs(
 sha256 TEXT PRIMARY KEY CHECK(length(sha256)=64), bytes INTEGER NOT NULL CHECK(bytes>0),
 storage_key TEXT NOT NULL UNIQUE, state TEXT NOT NULL CHECK(state IN ('pending','ready'))
);
CREATE TABLE digital_objects(
 id TEXT PRIMARY KEY, title TEXT NOT NULL, collection TEXT NOT NULL, created_by TEXT NOT NULL, trashed_at TEXT
);
CREATE TABLE digital_versions(
 id TEXT PRIMARY KEY, object_id TEXT NOT NULL REFERENCES digital_objects(id), parent_id TEXT REFERENCES digital_versions(id),
 ordinal INTEGER NOT NULL CHECK(ordinal>0), sha256 TEXT NOT NULL REFERENCES digital_blobs(sha256),
 filename TEXT NOT NULL, kind TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL,
 UNIQUE(object_id,ordinal)
);
CREATE TABLE digital_refs(
 version_id TEXT NOT NULL REFERENCES digital_versions(id), source TEXT NOT NULL, PRIMARY KEY(version_id,source)
);
CREATE TRIGGER digital_version_update BEFORE UPDATE ON digital_versions BEGIN SELECT RAISE(ABORT,'immutable digital version'); END;
CREATE TRIGGER digital_version_delete BEFORE DELETE ON digital_versions BEGIN SELECT RAISE(ABORT,'immutable digital version'); END;
CREATE TRIGGER digital_trash_guard BEFORE UPDATE OF trashed_at ON digital_objects WHEN NEW.trashed_at IS NOT NULL AND EXISTS(SELECT 1 FROM digital_refs r JOIN digital_versions v ON v.id=r.version_id WHERE v.object_id=NEW.id) BEGIN SELECT RAISE(ABORT,'referenced object'); END;
CREATE TRIGGER digital_ref_guard BEFORE INSERT ON digital_refs WHEN EXISTS(SELECT 1 FROM digital_versions v JOIN digital_objects o ON o.id=v.object_id WHERE v.id=NEW.version_id AND o.trashed_at IS NOT NULL) BEGIN SELECT RAISE(ABORT,'trashed object'); END;
