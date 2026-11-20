import { env } from "cloudflare:workers";
import { assertSchema } from "../../db/schema-check.ts";

/** Read-only, per-binding readiness check. The previously request-created
 * Briefing and presence tables belong to additive migration 0014. Never run
 * CREATE TABLE/INDEX while serving an HTTP request. Deploy schema first.
 */
export function ensureBriefingInboxSchema(): Promise<void> {
  return assertSchema(env.DB, [
    ["briefing_archives", "citizen_id, task_id, archived_at"],
    ["member_presence", "session_hash, citizen_id, last_seen_ms"],
  ]);
}
