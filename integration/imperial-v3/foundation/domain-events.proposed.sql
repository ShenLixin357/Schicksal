-- Install ONLY after the reviewed V2.5 domain schemas and V3 outbox/operations proposals.
-- Domain and event writes share the same transaction. No historical backfill or reward.
CREATE TABLE imperial_source_changes (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 kind TEXT NOT NULL CHECK(kind IN ('book.published','collection.changed','permission.changed','exploration.discovered')),
 source_type TEXT NOT NULL CHECK(source_type IN ('book','animation','gallery','digital','ministry','caption','exploration')),
 entity_id TEXT NOT NULL,
 version_id TEXT,
 operation TEXT NOT NULL CHECK(operation IN ('publish','version','trash','restore','metadata','policy','complete')),
 created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX imperial_source_entity ON imperial_source_changes(source_type,entity_id,seq DESC);
CREATE TRIGGER imperial_source_fanout AFTER INSERT ON imperial_source_changes BEGIN
 INSERT INTO imperial_events(id,kind,resource,revision,created_at)
 VALUES(NEW.kind||':source-'||NEW.seq||':'||NEW.seq,NEW.kind,'source-'||NEW.seq,NEW.seq,NEW.created_at);
END;
CREATE TRIGGER imperial_source_no_update BEFORE UPDATE ON imperial_source_changes BEGIN SELECT RAISE(ABORT,'immutable source change'); END;
CREATE TRIGGER imperial_source_no_delete BEFORE DELETE ON imperial_source_changes BEGIN SELECT RAISE(ABORT,'immutable source change'); END;
CREATE TRIGGER imperial_book_published AFTER INSERT ON library_revisions WHEN NEW.state='published' BEGIN
 INSERT INTO imperial_source_changes(kind,source_type,entity_id,version_id,operation)
 VALUES(CASE NEW.kind WHEN 'book' THEN 'book.published' ELSE 'collection.changed' END,NEW.kind,NEW.entity_id,NEW.revision,'publish');
END;
CREATE TRIGGER imperial_gallery_version AFTER INSERT ON gallery_versions BEGIN
 INSERT INTO imperial_source_changes(kind,source_type,entity_id,version_id,operation)
 VALUES('collection.changed','gallery',NEW.work_id,NEW.id,'version');
END;
CREATE TRIGGER imperial_digital_version AFTER INSERT ON digital_versions BEGIN
 INSERT INTO imperial_source_changes(kind,source_type,entity_id,version_id,operation)
 VALUES('collection.changed','digital',NEW.object_id,NEW.id,'version');
END;
CREATE TRIGGER imperial_gallery_visibility AFTER UPDATE OF trashed_at ON gallery_works WHEN OLD.trashed_at IS NOT NEW.trashed_at BEGIN
 INSERT INTO imperial_source_changes(kind,source_type,entity_id,operation)
 VALUES('collection.changed','gallery',NEW.id,CASE WHEN NEW.trashed_at IS NULL THEN 'restore' ELSE 'trash' END);
END;
CREATE TRIGGER imperial_digital_visibility AFTER UPDATE OF trashed_at ON digital_objects WHEN OLD.trashed_at IS NOT NEW.trashed_at BEGIN
 INSERT INTO imperial_source_changes(kind,source_type,entity_id,operation)
 VALUES('collection.changed','digital',NEW.id,CASE WHEN NEW.trashed_at IS NULL THEN 'restore' ELSE 'trash' END);
END;
CREATE TRIGGER imperial_gallery_tags_insert AFTER INSERT ON gallery_metadata BEGIN
 INSERT INTO imperial_source_changes(kind,source_type,entity_id,version_id,operation)
 VALUES('collection.changed','gallery',NEW.work_id,CAST(NEW.revision AS TEXT),'metadata');
END;
CREATE TRIGGER imperial_gallery_tags_update AFTER UPDATE ON gallery_metadata WHEN NEW.revision<>OLD.revision BEGIN
 INSERT INTO imperial_source_changes(kind,source_type,entity_id,version_id,operation)
 VALUES('collection.changed','gallery',NEW.work_id,CAST(NEW.revision AS TEXT),'metadata');
END;
CREATE TRIGGER imperial_permission_changed AFTER INSERT ON ministry_changes WHEN NEW.kind IN ('account','permission','feature') BEGIN
 INSERT INTO imperial_source_changes(kind,source_type,entity_id,version_id,operation)
 VALUES('permission.changed','ministry',NEW.target,CAST(NEW.id AS TEXT),'policy');
END;
CREATE TRIGGER imperial_caption_changed AFTER INSERT ON visual_caption_history BEGIN
 INSERT INTO imperial_source_changes(kind,source_type,entity_id,version_id,operation)
 VALUES('collection.changed','caption',NEW.sha256,CAST(NEW.revision AS TEXT),'metadata');
END;
-- This is the trusted multi-stage completion table, NOT cosmetic client-reported exploration_discoveries.
CREATE TRIGGER imperial_verified_discovery AFTER INSERT ON imperial_exploration_completions BEGIN
 INSERT INTO imperial_source_changes(kind,source_type,entity_id,operation)
 VALUES('exploration.discovered','exploration',NEW.secret,'complete');
END;
-- Bulk V3 rules are also authoritative, but merely enqueue reconciliation.
CREATE TRIGGER imperial_advanced_policy_changed AFTER INSERT ON imperial_policy_sets WHEN NEW.id='global' BEGIN
 INSERT INTO imperial_source_changes(kind,source_type,entity_id,version_id,operation)
 VALUES('permission.changed','ministry','v3-global',CAST(NEW.revision AS TEXT),'policy');
END;
