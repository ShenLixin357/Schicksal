import { env } from "cloudflare:workers";

/** Additive, preview-safe tables. Deliberately does not change existing parliament
 * migrations or production D1 bindings. A future mainline migration can adopt
 * these exact tables after preview validation.
 */
export async function ensureBriefingInboxSchema() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS briefing_archives (
      citizen_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      archived_at TEXT NOT NULL,
      PRIMARY KEY (citizen_id, task_id)
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS member_presence (
      session_hash TEXT PRIMARY KEY NOT NULL,
      citizen_id TEXT NOT NULL,
      last_seen_ms INTEGER NOT NULL
    )`),

  ]);
  // Prepare the index only AFTER the table exists. SQLite-backed tests
  // compile statements at prepare time; D1 can do the same.
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS member_presence_recent_idx ON member_presence (last_seen_ms)").run();
}
