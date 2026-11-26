-- Add reversible photo trash metadata without touching stored objects.
-- All existing photos remain active; a trash operation only changes D1 metadata.
ALTER TABLE archive_photos ADD COLUMN deleted_at TEXT;
ALTER TABLE archive_photos ADD COLUMN deleted_by_citizen_id TEXT;
CREATE INDEX archive_photos_deleted_at_idx ON archive_photos (deleted_at);
