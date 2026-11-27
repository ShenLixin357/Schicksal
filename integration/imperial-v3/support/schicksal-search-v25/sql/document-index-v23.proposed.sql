CREATE TABLE document_text_index (
 sha256 TEXT NOT NULL CHECK(length(sha256)=64), extractor TEXT NOT NULL CHECK(extractor='text-v1'), page_count INTEGER NOT NULL CHECK(page_count BETWEEN 1 AND 200), payload TEXT NOT NULL CHECK(json_valid(payload)), created_at INTEGER NOT NULL, PRIMARY KEY(sha256,extractor)
);
CREATE TRIGGER document_text_index_no_update BEFORE UPDATE ON document_text_index BEGIN SELECT RAISE(ABORT,'immutable extracted text'); END;
CREATE TRIGGER document_text_index_no_delete BEFORE DELETE ON document_text_index BEGIN SELECT RAISE(ABORT,'immutable extracted text'); END;
