-- Independent additive proposal. No automatic application or production migration.
-- Explicit personal saves only. No passive tracking or reading history collection.
CREATE TABLE library_personal_saves(
 actor TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('book','gallery','digital')),
 entity_id TEXT NOT NULL,revision TEXT NOT NULL,chapter TEXT NOT NULL DEFAULT '',
 title TEXT NOT NULL,subtitle TEXT NOT NULL,saved_at TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '' CHECK(length(note)<=1000), note_revision INTEGER NOT NULL DEFAULT 0 CHECK(note_revision>=0),
 CHECK(kind='book' OR chapter=''),PRIMARY KEY(actor,kind,entity_id,revision,chapter)
);
CREATE INDEX library_personal_saves_by_actor ON library_personal_saves(actor,saved_at DESC);
