-- Room No.02 private music corner; identities always come from member_sessions.
CREATE TABLE IF NOT EXISTS emerald_music_editors (
 citizen_id TEXT PRIMARY KEY CHECK(citizen_id IN ('truth')),
 granted_by TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS emerald_music_scores (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, composer TEXT NOT NULL DEFAULT '',
 content TEXT NOT NULL DEFAULT '', private_note TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1, write_token TEXT NOT NULL,
 created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS emerald_music_assets (
 id TEXT PRIMARY KEY, score_id TEXT NOT NULL REFERENCES emerald_music_scores(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('image','audio')), object_key TEXT NOT NULL UNIQUE,
 original_name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL,
 created_at TEXT NOT NULL, deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS emerald_music_assets_score ON emerald_music_assets(score_id,deleted_at);
CREATE TABLE IF NOT EXISTS emerald_music_melodies (
 id TEXT PRIMARY KEY, creator_id TEXT NOT NULL CHECK(creator_id IN ('amberina','zxy','truth')),
 client_id TEXT NOT NULL, notes_json TEXT NOT NULL, tempo INTEGER NOT NULL,
 message TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL,
 UNIQUE(creator_id, client_id)
);
CREATE INDEX IF NOT EXISTS emerald_music_melodies_time ON emerald_music_melodies(created_at DESC,id DESC);
