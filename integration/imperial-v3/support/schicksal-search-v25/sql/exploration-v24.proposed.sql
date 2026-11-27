-- Independent preview only. Cosmetic discovery, never points/cards/authorization.
CREATE TABLE IF NOT EXISTS exploration_discoveries (
 citizen_id TEXT NOT NULL, egg_id TEXT NOT NULL, first_seen_at INTEGER NOT NULL CHECK(first_seen_at>0),
 PRIMARY KEY(citizen_id,egg_id)
);
CREATE TRIGGER IF NOT EXISTS exploration_discovery_immutable_update BEFORE UPDATE ON exploration_discoveries BEGIN SELECT RAISE(ABORT,'discovery history immutable'); END;
CREATE TRIGGER IF NOT EXISTS exploration_discovery_immutable_delete BEFORE DELETE ON exploration_discoveries BEGIN SELECT RAISE(ABORT,'discovery history immutable'); END;
