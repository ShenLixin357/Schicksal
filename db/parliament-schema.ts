import { env } from "cloudflare:workers";
import { assertSchema } from "./schema-check.ts";
// Compatibility name; HTTP requests only validate readiness.
export function ensureParliamentSchema() {
 return assertSchema(env.DB, [
  ["parliament_items", "classification,routing,proposer_age_band,recusal_requested,stage_reason,voting_version,deadline"],
  ["parliament_comments", "quote_text,parent_id"], ["parliament_votes", "document_version"],
  ["parliament_amendments", "status"], ["parliament_audit_events", "metadata_json"],
  ["parliament_meeting_sessions", "speaker_status"],
 ]);
}
