-- Proposal only. Do not add to production migration manifest yet.
CREATE TABLE imperial_events (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('book.published','collection.changed','permission.changed','exploration.discovered','system.health_changed')),
  resource TEXT NOT NULL CHECK(length(resource) BETWEEN 1 AND 100),
  revision INTEGER NOT NULL CHECK(revision >= 1),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(kind, resource, revision)
);
CREATE TABLE imperial_deliveries (
  event_id TEXT NOT NULL REFERENCES imperial_events(id),
  consumer TEXT NOT NULL CHECK(consumer IN ('search','observatory','exploration')),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','leased','done','dead')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
  available_at INTEGER NOT NULL DEFAULT (unixepoch()),
  lease_token TEXT,
  lease_until INTEGER,
  last_error TEXT CHECK(last_error IN ('temporary','unavailable','invalid','lease_expired')),
  PRIMARY KEY(event_id, consumer),
  CHECK((state='leased' AND lease_token IS NOT NULL AND lease_until IS NOT NULL) OR (state<>'leased' AND lease_token IS NULL AND lease_until IS NULL))
);
CREATE INDEX imperial_delivery_queue ON imperial_deliveries(consumer,state,available_at,lease_until);
CREATE TRIGGER imperial_event_immutable_update BEFORE UPDATE ON imperial_events BEGIN SELECT RAISE(ABORT,'immutable event'); END;
CREATE TRIGGER imperial_event_immutable_delete BEFORE DELETE ON imperial_events BEGIN SELECT RAISE(ABORT,'immutable event'); END;
CREATE TRIGGER imperial_fanout AFTER INSERT ON imperial_events BEGIN
  INSERT INTO imperial_deliveries(event_id,consumer,available_at) VALUES(NEW.id,'observatory',NEW.created_at);
  INSERT INTO imperial_deliveries(event_id,consumer,available_at) SELECT NEW.id,'search',NEW.created_at WHERE NEW.kind IN ('book.published','collection.changed','permission.changed');
  INSERT INTO imperial_deliveries(event_id,consumer,available_at) SELECT NEW.id,'exploration',NEW.created_at WHERE NEW.kind='exploration.discovered';
END;
