import { env } from "cloudflare:workers";

/** The preview-only inbox tables are additive and do not touch parliament
 * migrations or any production database. Cold-start requests for presence
 * and briefing can race; share a single schema-init promise per D1 binding.
 */
let ready: Promise<void> | null = null;
let boundDatabase: typeof env.DB | null = null;

export function ensureBriefingInboxSchema(): Promise<void> {
  const db = env.DB;
  if (boundDatabase !== db) {
    boundDatabase = db;
    ready = null;
  }
  if (!ready) {
    ready = db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS briefing_archives (
        citizen_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        archived_at TEXT NOT NULL,
        PRIMARY KEY (citizen_id, task_id)
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS member_presence (
        session_hash TEXT PRIMARY KEY NOT NULL,
        citizen_id TEXT NOT NULL,
        last_seen_ms INTEGER NOT NULL
      )`),
    ]).then(async () => {
      // SQLite-backed tests (and some D1 implementations) compile SQL when
      // prepare() is called, so the index must be prepared after table creation.
      await db.prepare("CREATE INDEX IF NOT EXISTS member_presence_recent_idx ON member_presence (last_seen_ms)").run();
    }).catch((error: unknown) => {
      if (boundDatabase === db) ready = null;
      throw error;
    });
  }
  return ready;
}
