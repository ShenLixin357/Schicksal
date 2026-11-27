-- PROPOSED ONLY: isolated local/preview migration. No automatic seed or activation.
-- One budget shared by both image and digital R2 ports, including retained staging.
CREATE TABLE IF NOT EXISTS gallery_r2_budget (
  id INTEGER PRIMARY KEY CHECK(id=1),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  billing_month TEXT NOT NULL,
  verified_until_ms INTEGER NOT NULL,
  external_bytes INTEGER NOT NULL CHECK(external_bytes>=0),
  reserved_bytes INTEGER NOT NULL CHECK(reserved_bytes>=0),
  class_a INTEGER NOT NULL CHECK(class_a>=0),
  class_b INTEGER NOT NULL CHECK(class_b>=0),
  day TEXT NOT NULL,
  day_a INTEGER NOT NULL CHECK(day_a>=0),
  day_b INTEGER NOT NULL CHECK(day_b>=0)
);
-- Deliberately no INSERT. An authorized operator must reconcile ACCOUNT-WIDE usage,
-- including existing objects/other buckets and current-month operations, before enabling.
