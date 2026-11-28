#!/usr/bin/env python3
"""Generate preview-only SQL from the exact approved static library sources.
No network, credentials, DB access, production migrations or remote writes.
Use a new output path; generated SQL uses bounded statements for D1.
"""
import argparse
import hashlib
import json
from pathlib import Path

IDS=("A","L1","L2","L3","L4","R1","R2","R3","R4","LT","AVS")
LESSONS=("lesson-1","lesson-2-a","lesson-2-b","lesson-3","lesson-4","lesson-5","lesson-6")
def digest(b): return hashlib.sha256(b).hexdigest()
def quote(s): return "'"+s.replace("'","''")+"'"
def chunks(s, size=10000):
    # Chunk encoded bytes at valid UTF-8 boundaries (not Python code point count).
    result=[]; buf=bytearray()
    for c in s:
        b=c.encode("utf-8")
        if len(buf)+len(b)>size: result.append(bytes(buf)); buf=bytearray()
        buf.extend(b)
    if buf: result.append(bytes(buf))
    return result
def generate(root):
    library=root/"public/library/data/nation-building.json"
    nation=json.loads(library.read_text(encoding="utf-8"))
    assert nation["id"]=="AVS" and tuple(c["id"] for c in nation["chapters"])==LESSONS, "Unexpected archive structure"
    for c in nation["chapters"]:
        expected=f"/archives/how-to-build-a-state-{c['id']}.md"
        assert c["source"]==expected, "Unexpected original path"
        original=(root/"public"/expected.lstrip("/")).read_bytes()
        assert digest(original)==c["sha256"], "Original hash mismatch: "+c["id"]
        c["markdown"]=original.decode("utf-8")
        assert c["blocks"] and len({b["id"] for b in c["blocks"]})==len(c["blocks"])
    nation.update(author="AvS",status="bound",coverAssetId="cover-AVS")
    schema=json.loads((root/"server/library/animation-schema.json").read_text())
    assert set(schema)==set(IDS)
    records=[]
    for id in IDS:
        book=nation if id=="AVS" else {"id":id,"title":id,"author":"","status":"placeholder","coverAssetId":"cover-"+id,"chapters":[{"id":id+"-placeholder","title":"内容占位符","lesson":"","note":"","version":"","markdown":"占位符 · 本书正文尚未收录。","blocks":[{"id":id+"-placeholder-p1","html":"<p>占位符 · 本书正文尚未收录。</p>"}]}]}
        records.append(("book",id,"amberina" if id=="AVS" else "system:library-seed",book))
        records.append(("animation",id,"system:library-seed",{"id":id,"parameters":schema[id]["defaults"],"engineRevision":"handoff-2026-11-27"}))
    proposal=(root/"integration/imperial-v3/support/library-v11-v14-increment/sql/library-v11.proposed.sql").read_text()
    import re
    proposal=re.sub(r"^CREATE (TABLE|INDEX|TRIGGER) (?!IF NOT EXISTS)",r"CREATE \1 IF NOT EXISTS ",proposal,flags=re.M)
    out=[proposal,"CREATE TABLE IF NOT EXISTS imperial_preview_seed_chunks(seed TEXT NOT NULL,idx INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(seed,idx));"]
    for kind,id,actor,payload in records:
        body=json.dumps(payload,ensure_ascii=False,separators=(",",":"))
        assert len(body.encode("utf-8"))<1500000, "Seed payload too large"
        revision="seed-"+digest(body.encode("utf-8"))[:48]
        out.append(f"DELETE FROM imperial_preview_seed_chunks WHERE seed={quote(revision)};")
        for i,b in enumerate(chunks(body)):
            out.append(f"INSERT INTO imperial_preview_seed_chunks VALUES({quote(revision)},{i},CAST(X'{b.hex()}' AS TEXT));")
        # Never overwrite or resurrect an existing published head.
        out.append(f"INSERT INTO library_revisions(revision,kind,entity_id,state,base_revision,actor,created_at,payload) SELECT {quote(revision)},{quote(kind)},{quote(id)},'published',NULL,{quote(actor)},'2026-11-27T00:00:00Z',(SELECT group_concat(payload,'') FROM (SELECT payload FROM imperial_preview_seed_chunks WHERE seed={quote(revision)} ORDER BY idx)) WHERE NOT EXISTS(SELECT 1 FROM library_revisions WHERE kind={quote(kind)} AND entity_id={quote(id)});")
        out.append(f"DELETE FROM imperial_preview_seed_chunks WHERE seed={quote(revision)};")
    return "\n".join(out)+"\n"
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--root",type=Path,default=Path(__file__).resolve().parents[3]);p.add_argument("--output",type=Path,required=True);a=p.parse_args()
    data=generate(a.root)
    with a.output.open("x",encoding="utf-8") as f:f.write(data)
    print("Generated isolated preview SQL; 11 book/11 animation seeds, no database writes")
