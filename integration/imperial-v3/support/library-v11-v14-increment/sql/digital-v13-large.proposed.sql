-- Additive proposal; apply after digital-v13. Never apply to production automatically.
CREATE TABLE digital_uploads(
 id TEXT PRIMARY KEY, object_id TEXT NOT NULL REFERENCES digital_objects(id), version_id TEXT NOT NULL UNIQUE,
 base_id TEXT REFERENCES digital_versions(id), filename TEXT NOT NULL, kind TEXT NOT NULL, actor TEXT NOT NULL,
 total_bytes INTEGER NOT NULL CHECK(total_bytes>0), part_bytes INTEGER NOT NULL CHECK(part_bytes>0),
 expected_sha TEXT NOT NULL CHECK(length(expected_sha)=64), state TEXT NOT NULL CHECK(state IN ('open','complete','cancelled')),
 created_at TEXT NOT NULL
);
CREATE TABLE digital_upload_parts(
 upload_id TEXT NOT NULL REFERENCES digital_uploads(id), idx INTEGER NOT NULL CHECK(idx>=0),
 bytes INTEGER NOT NULL CHECK(bytes>0), sha256 TEXT NOT NULL CHECK(length(sha256)=64),
 storage_key TEXT NOT NULL CHECK(storage_key='digital/parts/sha256/'||sha256), state TEXT NOT NULL CHECK(state IN ('pending','ready')),
 PRIMARY KEY(upload_id,idx)
);
CREATE INDEX digital_upload_actor ON digital_uploads(actor,state);
CREATE TRIGGER digital_part_metadata_immutable BEFORE UPDATE ON digital_upload_parts
 WHEN NEW.upload_id<>OLD.upload_id OR NEW.idx<>OLD.idx OR NEW.bytes<>OLD.bytes OR NEW.sha256<>OLD.sha256 OR NEW.storage_key<>OLD.storage_key OR (OLD.state='ready' AND NEW.state<>'ready')
 BEGIN SELECT RAISE(ABORT,'immutable part'); END;
CREATE TRIGGER digital_part_no_delete BEFORE DELETE ON digital_upload_parts BEGIN SELECT RAISE(ABORT,'retained part'); END;
CREATE TRIGGER digital_upload_metadata_immutable BEFORE UPDATE ON digital_uploads
 WHEN NEW.id<>OLD.id OR NEW.object_id<>OLD.object_id OR NEW.version_id<>OLD.version_id OR NEW.base_id IS NOT OLD.base_id OR NEW.filename<>OLD.filename OR NEW.kind<>OLD.kind OR NEW.actor<>OLD.actor OR NEW.total_bytes<>OLD.total_bytes OR NEW.part_bytes<>OLD.part_bytes OR NEW.expected_sha<>OLD.expected_sha OR (OLD.state<>'open' AND NEW.state<>OLD.state)
 BEGIN SELECT RAISE(ABORT,'immutable upload'); END;
