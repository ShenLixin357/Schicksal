CREATE TABLE guide_copy_history (
 target TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>0), payload TEXT NOT NULL CHECK(json_valid(payload)), actor TEXT NOT NULL, term TEXT NOT NULL, reason TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(target,revision)
);
CREATE TRIGGER guide_history_no_update BEFORE UPDATE ON guide_copy_history BEGIN SELECT RAISE(ABORT,'immutable guide history'); END;
CREATE TRIGGER guide_history_no_delete BEFORE DELETE ON guide_copy_history BEGIN SELECT RAISE(ABORT,'immutable guide history'); END;
