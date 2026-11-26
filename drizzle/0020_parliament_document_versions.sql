CREATE TABLE parliament_document_versions (
  item_id TEXT NOT NULL REFERENCES parliament_items(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version >= 1),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('baseline', 'revision')),
  PRIMARY KEY (item_id, version)
);

-- A baseline records only the text still available at migration time.
INSERT INTO parliament_document_versions (item_id, version, title, summary, body, recorded_at, source)
SELECT id, version, title, summary, body, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'baseline'
FROM parliament_items;

CREATE TRIGGER parliament_document_version_on_insert
AFTER INSERT ON parliament_items
BEGIN
  INSERT INTO parliament_document_versions (item_id, version, title, summary, body, recorded_at, source)
  VALUES (NEW.id, NEW.version, NEW.title, NEW.summary, NEW.body, NEW.created_at, 'revision');
END;

CREATE TRIGGER parliament_document_version_guard
BEFORE UPDATE OF title, summary, body, version ON parliament_items
WHEN (
  NEW.title IS NOT OLD.title OR NEW.summary IS NOT OLD.summary
  OR NEW.body IS NOT OLD.body OR NEW.version IS NOT OLD.version
) AND NEW.version <> OLD.version + 1
BEGIN
  SELECT RAISE(ABORT, 'Parliament text changes require the next document version');
END;

CREATE TRIGGER parliament_document_version_on_update
AFTER UPDATE OF version ON parliament_items
WHEN NEW.version <> OLD.version
BEGIN
  INSERT INTO parliament_document_versions (item_id, version, title, summary, body, recorded_at, source)
  VALUES (NEW.id, NEW.version, NEW.title, NEW.summary, NEW.body, NEW.updated_at, 'revision');
END;
