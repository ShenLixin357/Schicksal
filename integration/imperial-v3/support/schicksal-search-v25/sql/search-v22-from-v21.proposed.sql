-- Only if search-v2 V2.1 schema is already present in isolated preview.
-- V2.2 aggregate counters, no query text, citizen identity, IP or evidence.
CREATE TABLE search_daily_metrics (
 day TEXT NOT NULL, scope TEXT NOT NULL CHECK(scope IN ('books','all')),
 outcome TEXT NOT NULL CHECK(outcome IN ('keyword','ready','partial','unavailable','conflict','failure')),
 requests INTEGER NOT NULL CHECK(requests>=0), empty_results INTEGER NOT NULL CHECK(empty_results>=0),
 elapsed_ms INTEGER NOT NULL CHECK(elapsed_ms>=0), max_ms INTEGER NOT NULL CHECK(max_ms>=0),
 PRIMARY KEY(day,scope,outcome)
);
