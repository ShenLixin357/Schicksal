#!/usr/bin/env python3
"""Generate additive isolated metadata schema; no provider calls or activation."""
import argparse,re
from pathlib import Path
def generate(root):
    base=root/"integration/imperial-v3"
    proposals=base/"support/library-v11-v14-increment/sql"
    def idem(s):
        return re.sub(r"^CREATE (TABLE|INDEX|TRIGGER|VIEW) (?!IF NOT EXISTS)",r"CREATE \1 IF NOT EXISTS ",s,flags=re.M)
    raw=(base/"foundation/collection-review.proposed.sql").read_text()
    raw=raw.replace("INSERT INTO imperial_book_slots VALUES","INSERT OR IGNORE INTO imperial_book_slots VALUES")
    # The baseline is separately attested by the seed generator; no invented
    # minister approval for existing originals. A book editor is not its owner.
    raw=raw.replace("NEW.initial_state,NEW.author,NEW.initial_term","NEW.initial_state,CASE WHEN NEW.kind='book' THEN (SELECT actor FROM library_revisions WHERE revision=NEW.version) ELSE NEW.author END,NEW.initial_term")
    assert "(SELECT actor FROM library_revisions WHERE revision=NEW.version)" in raw
    raw=raw.replace("v.kind='animation' OR EXISTS","v.kind='animation' OR EXISTS(SELECT 1 FROM imperial_legacy_book_versions l WHERE l.book=v.entity_id AND l.revision=v.revision) OR EXISTS")
    assert "FROM imperial_legacy_book_versions l" in raw
    # Explicit schema-object replacement, isolated preview only. No data removed.
    return "\n".join([idem((proposals/(name+".proposed.sql")).read_text()) for name in ("gallery-v12","digital-v13","digital-v13-large")]+[
        "DROP TRIGGER IF EXISTS imperial_review_initial;",
        "DROP VIEW IF EXISTS imperial_visible_library_revisions;",
        idem(raw),
        "CREATE TABLE IF NOT EXISTS imperial_preview_review_guard(ok INTEGER CHECK(ok=1));",
        "INSERT INTO imperial_preview_review_guard SELECT CASE WHEN (SELECT COUNT(*) FROM imperial_legacy_book_versions)=11 AND NOT EXISTS(SELECT 1 FROM library_revisions v WHERE v.kind='book' AND v.state='published' AND NOT EXISTS(SELECT 1 FROM imperial_legacy_book_versions l WHERE l.book=v.entity_id AND l.revision=v.revision) AND NOT EXISTS(SELECT 1 FROM imperial_review_items i WHERE i.kind='book' AND i.entity=v.entity_id AND i.version=v.revision)) THEN 1 ELSE 0 END;",
        "DELETE FROM imperial_preview_review_guard;"])
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--root",type=Path,default=Path(__file__).resolve().parents[3]);p.add_argument("--output",type=Path,required=True);a=p.parse_args()
    with a.output.open("x",encoding="utf-8") as f:f.write(generate(a.root))
    print("Prepared isolated review metadata SQL; no storage binding or database write")
