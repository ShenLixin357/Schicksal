"""Real SQLite integration against exact V2.5 proposals. Run only on local fixtures."""
import os,sqlite3,pathlib,unittest
HERE=pathlib.Path(__file__).resolve().parent
base=pathlib.Path(os.environ.get('IMPERIAL_V25_PACKAGES',str(HERE.parent/'support')))
lib=base/'library-v11-v14-increment/sql';search=base/'schicksal-search-v25/sql'
class Domain(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:'); self.db.execute('PRAGMA foreign_keys=ON'); self.db.executescript('CREATE TABLE current_office_holders(office_id TEXT,citizen_id TEXT,term_id TEXT); CREATE TABLE member_sessions(token_hash TEXT,citizen_id TEXT,expires_at INTEGER,account_mode TEXT,minister_grant_expires_at INTEGER);')
  for path in [lib/'library-v11.proposed.sql',lib/'gallery-v12.proposed.sql',lib/'digital-v13.proposed.sql',base/'schicksal-ministry-v2/proposals/ministry-v2.sql',search/'exploration-v24.proposed.sql',search/'operations-v25.proposed.sql',HERE/'events/outbox.sql',HERE/'operations.sql',HERE/'domain-events.proposed.sql']: self.db.executescript(path.read_text())
 def events(self): return self.db.execute('SELECT kind,resource,revision FROM imperial_events ORDER BY revision').fetchall()
 def count(self):return len(self.events())
 def book(self,state,revision='a',kind='book'):
  self.db.execute('INSERT INTO library_revisions(revision,kind,entity_id,state,actor,created_at,payload) VALUES(?,?,?,?,?,?,?)',(revision,kind,'book-1',state,'a','2026-11-27','{}'))
 def gallery(self):
  self.db.execute("INSERT INTO gallery_works(id,title,collection,created_by,created_at) VALUES('w','title','art','a','date')")
  self.db.execute("INSERT INTO gallery_blobs VALUES(?, 'image/png', 4, 'key','ready','date')",('a'*64,))
  self.db.execute("INSERT INTO gallery_versions VALUES('v','w',NULL,1,?,'name','a','date')",('a'*64,))
 def digital(self):
  self.db.execute("INSERT INTO digital_objects VALUES('o','title','collection','a',NULL)")
  self.db.execute("INSERT INTO digital_blobs VALUES(?,4,'key','ready')",('b'*64,))
  self.db.execute("INSERT INTO digital_versions VALUES('v','o',NULL,1,?,'name','pdf','a','date')",('b'*64,))
 def test_draft_publish_and_rollback(self):
  self.book('draft');self.assertEqual(self.count(),0);self.db.commit();self.book('published','b');self.assertEqual(self.events()[0][0],'book.published');self.db.rollback();self.assertEqual(self.count(),0);self.book('published','b');self.assertEqual(self.count(),1)
 def test_failed_and_idempotent(self):
  self.book('published');self.assertEqual(self.count(),1)
  with self.assertRaises(sqlite3.IntegrityError):self.book('published')
  self.db.execute("INSERT OR IGNORE INTO library_revisions(revision,kind,entity_id,state,actor,created_at,payload) VALUES('a','book','book-1','published','a','date','{}')");self.assertEqual(self.count(),1)
 def test_animation(self):
  self.book('published',kind='animation');self.assertEqual(self.events()[0][0],'collection.changed')
 def test_gallery_versions_tags_trash_restore(self):
  self.gallery();self.db.execute("INSERT INTO gallery_metadata VALUES('w',1,'[]','a','date')");self.db.execute("UPDATE gallery_metadata SET revision=2 WHERE work_id='w'");self.db.execute("UPDATE gallery_works SET trashed_at='date' WHERE id='w'");self.db.execute("UPDATE gallery_works SET trashed_at='date' WHERE id='w'");self.db.execute("UPDATE gallery_works SET trashed_at=NULL WHERE id='w'");self.assertEqual(self.count(),5)
 def test_referenced_trash_rejected(self):
  self.gallery();self.db.execute("INSERT INTO gallery_refs VALUES('w','reference')")
  with self.assertRaises(sqlite3.IntegrityError):self.db.execute("UPDATE gallery_works SET trashed_at='date' WHERE id='w'")
  self.assertEqual(self.count(),1)
 def test_digital(self):
  self.digital();self.db.execute("UPDATE digital_objects SET trashed_at='date' WHERE id='o'");self.db.execute("UPDATE digital_objects SET trashed_at=NULL WHERE id='o'");self.assertEqual(self.count(),3)
 def test_permission_no_profile_event(self):
  self.db.execute("INSERT INTO ministry_changes(kind,target,revision,payload,actor,term,reason,created_at) VALUES('profile','a',1,'{}','a','t','why',1)")
  self.db.execute("INSERT INTO ministry_changes(kind,target,revision,payload,actor,term,reason,created_at) VALUES('permission','a:library',1,'{}','a','t','why',1)")
  self.assertEqual(self.count(),1);self.assertEqual(self.events()[0][0],'permission.changed')
 def test_caption_and_verified_not_cosmetic(self):
  self.db.execute("INSERT INTO visual_caption_history VALUES(?,1,NULL,'{}','a','t','why',1)",('a'*64,));self.db.execute("INSERT INTO exploration_discoveries VALUES('a','egg',1)");self.assertEqual(self.count(),1)
  self.db.execute("INSERT INTO imperial_exploration_completions VALUES('a','secret',100)");self.assertEqual(self.count(),2);self.assertEqual(self.events()[1][0],'exploration.discovered');self.assertEqual(self.db.execute("SELECT count(*) FROM imperial_deliveries WHERE consumer='exploration'").fetchone()[0],1)
 def test_no_sensitive_payload_in_outbox(self):
  self.book('published');r=self.events()[0];self.assertEqual(r[1],'source-1');self.assertEqual(r[2],1);self.assertEqual(self.db.execute('SELECT count(*) FROM imperial_deliveries').fetchone()[0],2)
 def test_source_history_immutable(self):
  self.book('published')
  with self.assertRaises(sqlite3.IntegrityError):self.db.execute("UPDATE imperial_source_changes SET entity_id='different'")
  with self.assertRaises(sqlite3.IntegrityError):self.db.execute('DELETE FROM imperial_source_changes')
 def test_advanced_policy_event(self):
  self.db.execute("INSERT INTO imperial_policy_sets(id,revision,actor,term,reason,created_at,rules,assignments) VALUES('global',1,'a','t','why',100,'[]','{}')")
  self.assertEqual(self.count(),1);self.assertEqual(self.events()[0][0],'permission.changed')
if __name__=='__main__':unittest.main(verbosity=2)
