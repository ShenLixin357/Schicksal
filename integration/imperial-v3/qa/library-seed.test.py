import importlib.util,json,sqlite3,tempfile,unittest,hashlib
from pathlib import Path
spec=importlib.util.spec_from_file_location("seed",Path(__file__).with_name("prepare-library-seed.py"))
seed=importlib.util.module_from_spec(spec);spec.loader.exec_module(seed)
class SeedTest(unittest.TestCase):
    def test_actual_repository_seed(self):
        root=Path(__file__).resolve().parents[3]
        sql=seed.generate(root)
        self.assertLess(max(map(len,sql.splitlines())),100000)
        db=sqlite3.connect(":memory:");db.executescript(sql)
        self.assertEqual(db.execute("SELECT count(*) FROM library_revisions").fetchone()[0],22)
        book=json.loads(db.execute("SELECT payload FROM library_revisions WHERE entity_id='AVS' AND kind='book'").fetchone()[0])
        source=json.loads((root/"public/library/data/nation-building.json").read_text())
        for a,b in zip(book["chapters"],source["chapters"]):
            self.assertEqual(a["blocks"],b["blocks"])
            self.assertEqual(hashlib.sha256(a["markdown"].encode()).hexdigest(),b["sha256"])
        db.executescript(sql)
        self.assertEqual(db.execute("SELECT count(*) FROM library_revisions").fetchone()[0],22)
        self.assertEqual(db.execute("SELECT count(*) FROM imperial_preview_seed_chunks").fetchone()[0],0)
    def test_utf8(self):
        sample="甲𐀀😀'a"*4000
        parts=seed.chunks(sample)
        self.assertEqual(b"".join(parts).decode(),sample)
        self.assertTrue(all(len(p)<=10000 and p.decode() for p in parts))
if __name__=="__main__":unittest.main()
