-- Proposal only: dedicated preview database. No credentials or query logs.
CREATE TABLE search_embeddings (
 model TEXT NOT NULL, digest TEXT NOT NULL CHECK(length(digest)=64),
 vector TEXT NOT NULL CHECK(json_valid(vector) AND length(vector)<=65536),
 created_at INTEGER NOT NULL, PRIMARY KEY(model,digest)
);
CREATE TABLE search_usage (
 day TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('embedding','rerank','generation')),
 units INTEGER NOT NULL CHECK(units>=0), PRIMARY KEY(day,kind)
);
CREATE TABLE search_index_runs (
 id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, started_at INTEGER NOT NULL,
 completed_at INTEGER NOT NULL, attempted INTEGER NOT NULL, indexed INTEGER NOT NULL,
 outcome TEXT NOT NULL CHECK(outcome IN ('ok','disabled','failed'))
);
CREATE TABLE search_settings_history (
 revision INTEGER PRIMARY KEY CHECK(revision>0), payload TEXT NOT NULL CHECK(json_valid(payload)),
 actor TEXT NOT NULL, term TEXT NOT NULL, reason TEXT NOT NULL CHECK(length(reason) BETWEEN 1 AND 500), created_at INTEGER NOT NULL
);
CREATE TRIGGER search_settings_no_update BEFORE UPDATE ON search_settings_history BEGIN SELECT RAISE(ABORT,'immutable search settings'); END;
CREATE TRIGGER search_settings_no_delete BEFORE DELETE ON search_settings_history BEGIN SELECT RAISE(ABORT,'immutable search settings'); END;
-- V2.2 aggregate counters, no query text, citizen identity, IP or evidence.
CREATE TABLE search_daily_metrics (
 day TEXT NOT NULL, scope TEXT NOT NULL CHECK(scope IN ('books','all')),
 outcome TEXT NOT NULL CHECK(outcome IN ('keyword','ready','partial','unavailable','conflict','failure')),
 requests INTEGER NOT NULL CHECK(requests>=0), empty_results INTEGER NOT NULL CHECK(empty_results>=0),
 elapsed_ms INTEGER NOT NULL CHECK(elapsed_ms>=0), max_ms INTEGER NOT NULL CHECK(max_ms>=0),
 PRIMARY KEY(day,scope,outcome)
);
