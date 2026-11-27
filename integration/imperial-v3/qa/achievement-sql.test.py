import sqlite3
from pathlib import Path
import unittest

SQL=Path(__file__).with_name("preview-guide-exploration.sql").read_text()
class CardAchievements(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(":memory:")
        self.db.executescript("CREATE TABLE member_sessions(citizen_id TEXT); CREATE TABLE current_office_holders(office_id TEXT,citizen_id TEXT);")
        self.db.executescript(SQL)
    def event(self,key,actor,kind,card):
        self.db.execute("INSERT INTO imperial_card_actions(source_id,citizen_id,action,card_id,at) VALUES(?,?,?,?,?) ON CONFLICT(source_id) DO NOTHING",(key,actor,kind,card,1))
    def count(self):
        return self.db.execute("SELECT COUNT(*) FROM imperial_achievement_current WHERE state='granted'").fetchone()[0]
    def test_both_orders_and_streams(self):
        for actor,kind,first,last in [('a','draw','witch-perihelion','solstice-dendrite'),('b','use','solstice-dendrite','witch-perihelion')]:
            self.event(actor+'1',actor,kind,first)
            self.event(actor+'2',actor,kind,last)
        self.assertEqual(self.count(),2)
    def test_interruption_mixed_stream_and_duplicate(self):
        self.event('1','a','draw','witch-perihelion')
        self.event('2','a','draw','ordinary')
        self.event('3','a','draw','solstice-dendrite')
        self.event('4','b','draw','witch-perihelion')
        self.event('5','b','use','solstice-dendrite')
        self.assertEqual(self.count(),0)
        self.event('6','a','draw','witch-perihelion')
        self.event('6','a','draw','witch-perihelion')
        self.assertEqual(self.count(),1)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM imperial_card_actions").fetchone()[0],6)
        self.event('7','a','draw','solstice-dendrite')
        self.assertEqual(self.count(),1)
    def test_atomic_rollback_and_immutability(self):
        self.event('1','a','draw','witch-perihelion')
        self.db.commit()
        self.event('2','a','draw','solstice-dendrite')
        self.assertEqual(self.count(),1)
        self.db.rollback()
        self.assertEqual(self.count(),0)
        self.event('3','a','draw','solstice-dendrite')
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("DELETE FROM imperial_achievement_history")
        self.assertEqual(self.count(),1)
    def test_schema_reapply_keeps_history(self):
        self.event('1','a','draw','witch-perihelion')
        self.event('2','a','draw','solstice-dendrite')
        self.db.executescript(SQL)
        self.assertEqual(self.count(),1)

if __name__=="__main__": unittest.main()
