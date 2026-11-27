import sqlite3
from pathlib import Path
import unittest
SQL=Path(__file__).with_name("preview-limited-exploration.sql").read_text()
class Limited(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript(SQL)
    def event(self,id="a",rev=1,opens=100,closes=200,at=10,state="scheduled",items='["visit:home","visit:calendar"]'):
        self.db.execute("INSERT INTO imperial_limited_event_history VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",(id,rev,"Activity",opens,closes,1,state,items,"minister","term","reason",at))
    def find(self,id="a",rev=1,item="visit:home",at=100,citizen="one"):
        self.db.execute("INSERT INTO imperial_limited_discoveries VALUES(?,?,?,?,?) ON CONFLICT(citizen_id,event_id,item_id) DO NOTHING",(citizen,id,rev,item,at))
    def count(self):
        return self.db.execute("SELECT COUNT(*) FROM imperial_limited_discoveries").fetchone()[0]
    def test_window_and_duplicates(self):
        self.event()
        for at in (99,200):
            with self.assertRaises(sqlite3.IntegrityError): self.find(at=at)
        self.find(at=100); self.find(at=199)
        self.assertEqual(self.count(),1)
        self.find(item="visit:calendar",at=199)
        self.assertEqual(self.count(),2)
    def test_independent_activities_and_members(self):
        self.event(); self.event(id="b")
        self.find(); self.find(id="b"); self.find(citizen="two")
        self.assertEqual(self.count(),3)
    def test_revision_freeze(self):
        self.event(); self.event(rev=2,opens=120,closes=220,at=20)
        with self.assertRaises(sqlite3.IntegrityError): self.find(rev=1,at=150)
        self.find(rev=2,at=150)
        with self.assertRaises(sqlite3.IntegrityError): self.event(rev=3,opens=300,closes=400,at=121)
        with self.assertRaises(sqlite3.IntegrityError): self.db.execute("DELETE FROM imperial_limited_event_history")
    def test_cancel_and_unknown(self):
        self.event(); self.event(rev=2,state="cancelled")
        with self.assertRaises(sqlite3.IntegrityError): self.find(rev=2)
        self.event(id="b")
        with self.assertRaises(sqlite3.IntegrityError): self.find(id="b",item="visit:secret")
        self.assertEqual(self.count(),0)
    def test_reapply(self):
        self.event(); self.find(); self.db.executescript(SQL); self.assertEqual(self.count(),1)
if __name__=="__main__": unittest.main()
