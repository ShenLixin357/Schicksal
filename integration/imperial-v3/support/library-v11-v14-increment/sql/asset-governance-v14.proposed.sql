-- Additive proposal, after gallery, digital, large uploads. No production migration.
CREATE TABLE asset_links(
 id TEXT PRIMARY KEY, source_type TEXT NOT NULL CHECK(source_type IN ('card','room','animation','book','site','project','other')),
 source_id TEXT NOT NULL, source_revision TEXT NOT NULL,
 gallery_version_id TEXT REFERENCES gallery_versions(id), digital_version_id TEXT REFERENCES digital_versions(id),
 created_by TEXT NOT NULL, created_at TEXT NOT NULL, removed_by TEXT, removed_at TEXT,
 CHECK((gallery_version_id IS NOT NULL)<>(digital_version_id IS NOT NULL)), CHECK((removed_by IS NULL)=(removed_at IS NULL))
);
CREATE INDEX asset_link_gallery ON asset_links(gallery_version_id,removed_at);
CREATE INDEX asset_link_digital ON asset_links(digital_version_id,removed_at);
CREATE TRIGGER asset_link_insert_guard BEFORE INSERT ON asset_links WHEN
 (NEW.gallery_version_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM gallery_versions v JOIN gallery_works w ON w.id=v.work_id WHERE v.id=NEW.gallery_version_id AND w.trashed_at IS NULL)) OR
 (NEW.digital_version_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM digital_versions v JOIN digital_objects o ON o.id=v.object_id WHERE v.id=NEW.digital_version_id AND o.trashed_at IS NULL))
 BEGIN SELECT RAISE(ABORT,'invalid asset target'); END;
CREATE TRIGGER asset_link_immutable BEFORE UPDATE ON asset_links WHEN NEW.id<>OLD.id OR NEW.source_type<>OLD.source_type OR NEW.source_id<>OLD.source_id OR NEW.source_revision<>OLD.source_revision OR NEW.gallery_version_id IS NOT OLD.gallery_version_id OR NEW.digital_version_id IS NOT OLD.digital_version_id OR NEW.created_by<>OLD.created_by OR NEW.created_at<>OLD.created_at OR OLD.removed_at IS NOT NULL OR NEW.removed_at IS NULL
 BEGIN SELECT RAISE(ABORT,'immutable asset link'); END;
CREATE TRIGGER asset_link_no_delete BEFORE DELETE ON asset_links BEGIN SELECT RAISE(ABORT,'retain link history'); END;
CREATE TRIGGER asset_gallery_trash_guard BEFORE UPDATE OF trashed_at ON gallery_works WHEN NEW.trashed_at IS NOT NULL AND EXISTS(SELECT 1 FROM asset_links l JOIN gallery_versions v ON v.id=l.gallery_version_id WHERE v.work_id=NEW.id AND l.removed_at IS NULL) BEGIN SELECT RAISE(ABORT,'referenced gallery version'); END;
CREATE TRIGGER asset_digital_trash_guard BEFORE UPDATE OF trashed_at ON digital_objects WHEN NEW.trashed_at IS NOT NULL AND EXISTS(SELECT 1 FROM asset_links l JOIN digital_versions v ON v.id=l.digital_version_id WHERE v.object_id=NEW.id AND l.removed_at IS NULL) BEGIN SELECT RAISE(ABORT,'referenced digital version'); END;
-- Inventory reports actual known stored bytes and references; historical versions count as references.
CREATE VIEW asset_canonical_inventory AS
 SELECT 'gallery' namespace,b.sha256,b.byte_size bytes,b.storage_key,b.state,
 (SELECT COUNT(*) FROM gallery_versions v WHERE v.original_sha=b.sha256)+(SELECT COUNT(*) FROM gallery_variants v WHERE v.sha256=b.sha256) version_refs
 FROM gallery_blobs b UNION ALL
 SELECT 'digital',b.sha256,b.bytes,b.storage_key,b.state,(SELECT COUNT(*) FROM digital_versions v WHERE v.sha256=b.sha256) FROM digital_blobs b;
CREATE VIEW asset_physical_inventory AS
 SELECT namespace,sha256,bytes,storage_key,state FROM asset_canonical_inventory WHERE storage_key NOT LIKE 'digital/segments/%'
 UNION ALL SELECT 'digital',sha256,MAX(bytes),storage_key,CASE WHEN SUM(CASE WHEN state='pending' THEN 1 ELSE 0 END)>0 THEN 'pending' ELSE 'ready' END FROM digital_upload_parts GROUP BY sha256,storage_key;
