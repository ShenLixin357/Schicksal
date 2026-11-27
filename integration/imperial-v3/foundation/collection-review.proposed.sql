
-- Install only in a dedicated preview after the canonical V2.5 tables.
-- The ledger references canonical immutable versions. It does not store files.
CREATE TABLE imperial_review_items(
 kind TEXT NOT NULL CHECK(kind IN ('book','gallery','digital')),
 entity TEXT NOT NULL, version TEXT NOT NULL, author TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN ('完成作品','概念设计','设计草稿','未采用方案','艺术素材','参考资料','制作教程','工程文件','书籍')),
 submitted_at INTEGER NOT NULL, initial_state TEXT NOT NULL CHECK(initial_state IN ('pending','approved')), initial_term TEXT, CHECK((initial_state='approved')=(initial_term IS NOT NULL)),
 PRIMARY KEY(kind,entity,version), UNIQUE(kind,version),
 CHECK((kind='book')=(category='书籍'))
);
CREATE TABLE imperial_review_history(
 kind TEXT NOT NULL, entity TEXT NOT NULL, version TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>0),
 state TEXT NOT NULL CHECK(state IN ('pending','approved','rejected')),
 actor TEXT NOT NULL, term TEXT, reason TEXT NOT NULL CHECK(length(reason) BETWEEN 1 AND 500),
 at INTEGER NOT NULL,
 PRIMARY KEY(kind,entity,version,revision),
 FOREIGN KEY(kind,entity,version) REFERENCES imperial_review_items(kind,entity,version)
);
CREATE TRIGGER imperial_review_initial AFTER INSERT ON imperial_review_items BEGIN
 INSERT INTO imperial_review_history(kind,entity,version,revision,state,actor,term,reason,at) VALUES(NEW.kind,NEW.entity,NEW.version,1,NEW.initial_state,NEW.author,NEW.initial_term,CASE WHEN NEW.initial_state='approved' THEN '现任科技部长直接发布' ELSE '公民提交，待审核' END,NEW.submitted_at);
END;
CREATE VIEW imperial_review_current AS SELECT h.* FROM imperial_review_history h WHERE h.revision=(SELECT MAX(x.revision) FROM imperial_review_history x WHERE x.kind=h.kind AND x.entity=h.entity AND x.version=h.version);
CREATE INDEX imperial_review_state ON imperial_review_history(state,at);
CREATE TRIGGER imperial_review_sequence BEFORE INSERT ON imperial_review_history BEGIN
 SELECT CASE WHEN NEW.revision<>COALESCE((SELECT MAX(revision) FROM imperial_review_history WHERE kind=NEW.kind AND entity=NEW.entity AND version=NEW.version),0)+1 THEN RAISE(ABORT,'stale review') END;
END;
CREATE TRIGGER imperial_review_item_immutable BEFORE UPDATE ON imperial_review_items BEGIN SELECT RAISE(ABORT,'immutable review item'); END;
CREATE TRIGGER imperial_review_history_immutable BEFORE UPDATE ON imperial_review_history BEGIN SELECT RAISE(ABORT,'immutable review'); END;
CREATE TRIGGER imperial_review_history_no_delete BEFORE DELETE ON imperial_review_history BEGIN SELECT RAISE(ABORT,'immutable review'); END;
CREATE TRIGGER imperial_review_item_no_delete BEFORE DELETE ON imperial_review_items BEGIN SELECT RAISE(ABORT,'immutable review item'); END;
-- Fail closed: unregistered new versions are NOT public. Explicit audited backfill
-- is required for the previously approved collection before enabling these views.
CREATE VIEW imperial_visible_gallery_versions AS SELECT v.* FROM gallery_versions v JOIN imperial_review_current r ON r.kind='gallery' AND r.entity=v.work_id AND r.version=v.id AND r.state IN ('approved','pending');
CREATE VIEW imperial_visible_digital_versions AS SELECT v.* FROM digital_versions v JOIN imperial_review_current r ON r.kind='digital' AND r.entity=v.object_id AND r.version=v.id AND r.state IN ('approved','pending');
CREATE VIEW imperial_visible_library_revisions AS SELECT v.* FROM library_revisions v WHERE v.state='published' AND (v.kind='animation' OR EXISTS(SELECT 1 FROM imperial_review_current r WHERE r.kind='book' AND r.entity=v.entity_id AND r.version=v.revision AND r.state IN ('approved','pending')));
-- Slot identities and ownership immutable here; binding is a separate history.
CREATE TABLE imperial_book_slots(id TEXT PRIMARY KEY, owner TEXT, profile TEXT NOT NULL, CHECK(id<>'AVS' OR (owner IS NOT NULL AND owner='amberina')));
INSERT INTO imperial_book_slots VALUES('A',NULL,'A'),('L1',NULL,'L1'),('L2',NULL,'L2'),('L3',NULL,'L3'),('L4',NULL,'L4'),('R1',NULL,'R1'),('R2',NULL,'R2'),('R3',NULL,'R3'),('R4',NULL,'R4'),('LT',NULL,'LT'),('AVS','amberina','AVS');
CREATE TRIGGER imperial_book_slot_no_update BEFORE UPDATE ON imperial_book_slots BEGIN SELECT RAISE(ABORT,'immutable slot identity'); END;
CREATE TRIGGER imperial_book_slot_no_delete BEFORE DELETE ON imperial_book_slots BEGIN SELECT RAISE(ABORT,'immutable slot identity'); END;
CREATE TABLE imperial_book_bindings(
 book TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>0), slot TEXT REFERENCES imperial_book_slots(id),
 author TEXT NOT NULL, actor TEXT NOT NULL, term TEXT NOT NULL, at INTEGER NOT NULL,
 PRIMARY KEY(book,revision)
);
CREATE VIEW imperial_book_binding_current AS SELECT b.* FROM imperial_book_bindings b WHERE b.revision=(SELECT MAX(x.revision) FROM imperial_book_bindings x WHERE x.book=b.book);
CREATE TRIGGER imperial_binding_guard BEFORE INSERT ON imperial_book_bindings BEGIN
 SELECT CASE WHEN NEW.revision<>COALESCE((SELECT MAX(revision) FROM imperial_book_bindings WHERE book=NEW.book),0)+1 THEN RAISE(ABORT,'stale binding') END;
 SELECT CASE WHEN NEW.slot IS NOT NULL AND NOT EXISTS(SELECT 1 FROM imperial_book_slots s WHERE s.id=NEW.slot AND (s.owner IS NULL OR s.owner=NEW.author)) THEN RAISE(ABORT,'exclusive slot') END;
 SELECT CASE WHEN NEW.book='AVS' AND (NEW.slot IS NOT 'AVS' OR NEW.author<>'amberina') THEN RAISE(ABORT,'protected AVS') END;
END;
CREATE TABLE imperial_slot_displays(slot TEXT NOT NULL REFERENCES imperial_book_slots(id),revision INTEGER NOT NULL CHECK(revision>0),book TEXT NOT NULL,actor TEXT NOT NULL,term TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(slot,revision));
CREATE VIEW imperial_slot_display_current AS SELECT d.* FROM imperial_slot_displays d JOIN imperial_book_binding_current b ON b.book=d.book AND b.slot=d.slot WHERE d.revision=(SELECT MAX(x.revision) FROM imperial_slot_displays x WHERE x.slot=d.slot);
CREATE TRIGGER imperial_display_guard BEFORE INSERT ON imperial_slot_displays BEGIN
 SELECT CASE WHEN NEW.revision<>COALESCE((SELECT MAX(revision) FROM imperial_slot_displays WHERE slot=NEW.slot),0)+1 THEN RAISE(ABORT,'stale display') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM imperial_book_binding_current b WHERE b.book=NEW.book AND b.slot=NEW.slot) THEN RAISE(ABORT,'not bound') END;
END;
CREATE TRIGGER imperial_binding_no_update BEFORE UPDATE ON imperial_book_bindings BEGIN SELECT RAISE(ABORT,'immutable binding'); END;
CREATE TRIGGER imperial_binding_no_delete BEFORE DELETE ON imperial_book_bindings BEGIN SELECT RAISE(ABORT,'immutable binding'); END;
CREATE TRIGGER imperial_display_no_update BEFORE UPDATE ON imperial_slot_displays BEGIN SELECT RAISE(ABORT,'immutable display'); END;
CREATE TRIGGER imperial_display_no_delete BEFORE DELETE ON imperial_slot_displays BEGIN SELECT RAISE(ABORT,'immutable display'); END;
