-- Isolated preview only; all clocks are UTC milliseconds.
CREATE TABLE IF NOT EXISTS imperial_limited_event_history(
 event_id TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>0),
 title TEXT NOT NULL, opens_at INTEGER NOT NULL, closes_at INTEGER NOT NULL CHECK(closes_at>opens_at),
 public_before INTEGER NOT NULL CHECK(public_before IN (0,1)), state TEXT NOT NULL CHECK(state IN ('scheduled','cancelled')),
 items_json TEXT NOT NULL CHECK(json_valid(items_json) AND json_type(items_json)='array' AND json_array_length(items_json) BETWEEN 1 AND 6),
 actor TEXT NOT NULL, term TEXT NOT NULL, reason TEXT NOT NULL, at INTEGER NOT NULL,
 PRIMARY KEY(event_id,revision)
);
CREATE VIEW IF NOT EXISTS imperial_limited_event_current AS
 SELECT h.* FROM imperial_limited_event_history h WHERE NOT EXISTS(
 SELECT 1 FROM imperial_limited_event_history n WHERE n.event_id=h.event_id AND n.revision>h.revision);
CREATE TRIGGER IF NOT EXISTS imperial_limited_event_no_update BEFORE UPDATE ON imperial_limited_event_history BEGIN SELECT RAISE(ABORT,'immutable event history'); END;
CREATE TRIGGER IF NOT EXISTS imperial_limited_event_no_delete BEFORE DELETE ON imperial_limited_event_history BEGIN SELECT RAISE(ABORT,'immutable event history'); END;
CREATE TRIGGER IF NOT EXISTS imperial_limited_event_revision BEFORE INSERT ON imperial_limited_event_history
 WHEN NEW.opens_at<=NEW.at OR NEW.revision<>COALESCE((SELECT MAX(revision) FROM imperial_limited_event_history WHERE event_id=NEW.event_id),0)+1
 OR EXISTS(SELECT 1 FROM imperial_limited_event_current WHERE event_id=NEW.event_id AND opens_at<=NEW.at)
 BEGIN SELECT RAISE(ABORT,'event revision invalid or window already opened'); END;
CREATE TABLE IF NOT EXISTS imperial_limited_discoveries(
 citizen_id TEXT NOT NULL,event_id TEXT NOT NULL,event_revision INTEGER NOT NULL,item_id TEXT NOT NULL, first_seen_at INTEGER NOT NULL,
 PRIMARY KEY(citizen_id,event_id,item_id),
 FOREIGN KEY(event_id,event_revision) REFERENCES imperial_limited_event_history(event_id,revision)
);
CREATE TRIGGER IF NOT EXISTS imperial_limited_discovery_window BEFORE INSERT ON imperial_limited_discoveries
 WHEN NOT EXISTS(SELECT 1 FROM imperial_limited_event_current e,json_each(e.items_json) i
 WHERE e.event_id=NEW.event_id AND e.revision=NEW.event_revision AND e.state='scheduled'
 AND NEW.first_seen_at>=e.opens_at AND NEW.first_seen_at<e.closes_at AND i.value=NEW.item_id)
 BEGIN SELECT RAISE(ABORT,'event item or window invalid'); END;
CREATE TRIGGER IF NOT EXISTS imperial_limited_discovery_no_update BEFORE UPDATE ON imperial_limited_discoveries BEGIN SELECT RAISE(ABORT,'immutable event discovery'); END;
CREATE TRIGGER IF NOT EXISTS imperial_limited_discovery_no_delete BEFORE DELETE ON imperial_limited_discoveries BEGIN SELECT RAISE(ABORT,'immutable event discovery'); END;
