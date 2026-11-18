import { env } from "cloudflare:workers";
import { ensureParliamentSchema } from "../../../db/parliament-schema";
import { currentMember } from "../../member-session";
import { foundingNews, latestNews, orderedBriefingTasks } from "../../briefing/briefing-data";
import { verifiedReleaseNews } from "../../briefing/feature-news";
import {
  parliamentAuditNews, parliamentAffairsTasks,
  type ParliamentItemForBriefing, type VoteForBriefing, type AuditForBriefing,
  type SpeakerMeetingForBriefing, type SpeakerCandidateForBriefing,
  type SpeakerVoteForBriefing,
} from "../../briefing/briefing-feed";

const headers = { "Cache-Control": "private, no-store" };

// Every member's inbox is resolved from the server-validated session.
// Never accept citizenId from query parameters, headers, or client JSON.
export async function GET(request: Request) {
  try {
    const citizenId = await currentMember(request);
    if (!citizenId) {
      return Response.json({ error: "请先登录天命成员身份。" }, { status: 401, headers });
    }
    await ensureParliamentSchema();
    const [itemRows, voteRows, meetingRows, candidateRows, speakerVoteRows, eventRows] = await Promise.all([
      env.DB.prepare(`SELECT id, serial_code AS serialCode, kind, outcome, title, summary, stage,
          voting_version AS votingVersion, version, deadline,
          created_at AS createdAt, updated_at AS updatedAt
        FROM parliament_items`).all<ParliamentItemForBriefing>(),
      env.DB.prepare(`SELECT item_id AS itemId, citizen_id AS citizenId,
          document_version AS documentVersion
        FROM parliament_votes WHERE citizen_id = ?`).bind(citizenId).all<VoteForBriefing>(),
      env.DB.prepare(`SELECT item_id AS itemId, speaker_status AS speakerStatus,
          speaker_election_deadline AS speakerElectionDeadline,
          speaker_citizen_id AS speakerCitizenId,
          debate_started_at AS debateStartedAt, updated_at AS updatedAt
        FROM parliament_meeting_sessions`).all<SpeakerMeetingForBriefing>(),
      env.DB.prepare(`SELECT item_id AS itemId, citizen_id AS citizenId
        FROM parliament_speaker_candidates`).all<SpeakerCandidateForBriefing>(),
      env.DB.prepare(`SELECT item_id AS itemId, voter_citizen_id AS voterCitizenId
        FROM parliament_speaker_votes WHERE voter_citizen_id = ?`).bind(citizenId).all<SpeakerVoteForBriefing>(),
      env.DB.prepare(`SELECT id, item_id AS itemId, event_type AS eventType,
          description, metadata_json AS metadataJson,
          created_at AS createdAt
        FROM parliament_audit_events ORDER BY created_at DESC`).all<AuditForBriefing>(),
    ]);
    const items = itemRows.results;
    const ownVotes = voteRows.results;
    const events = eventRows.results;
    const tasks = orderedBriefingTasks(parliamentAffairsTasks(
      items, ownVotes, citizenId, meetingRows.results, candidateRows.results, speakerVoteRows.results,
    ));
    const news = latestNews([...foundingNews, ...verifiedReleaseNews, ...parliamentAuditNews(events, items)]);
    return Response.json({ tasks, news, messageState: "not-connected" }, { headers });
  } catch {
    // Do not expose database errors or the existence of other members' records.
    return Response.json({ error: "简报暂时无法同步，请稍后重试。" }, { status: 503, headers });
  }
}
