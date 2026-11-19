import { env } from "cloudflare:workers";
import { ensureParliamentSchema } from "../../../db/parliament-schema";
import { currentMember } from "../../member-session";
import { sameOrigin } from "../../member-session-core";
import { ensureBriefingInboxSchema } from "../../briefing/inbox-schema";
import { foundingNews, latestNews, orderedBriefingTasks, type BriefingTask } from "../../briefing/briefing-data";
import { verifiedReleaseNews } from "../../briefing/feature-news";
import {
  parliamentAuditNews, parliamentAffairsTasks,
  type ParliamentItemForBriefing, type VoteForBriefing, type AuditForBriefing,
  type SpeakerMeetingForBriefing, type SpeakerCandidateForBriefing, type SpeakerVoteForBriefing,
} from "../../briefing/briefing-feed";
import { buildInboxViews, type ArchiveRow } from "../../briefing/affairs-history";

const headers = { "Cache-Control": "private, no-store" };

async function loadBriefing(citizenId: string) {
  await ensureParliamentSchema();
  await ensureBriefingInboxSchema();
  const [itemRows, voteRows, meetingRows, candidateRows, speakerVoteRows, archiveRows, eventRows] = await Promise.all([
    env.DB.prepare(`SELECT id, serial_code AS serialCode, kind, outcome, title, summary, stage,
        voting_version AS votingVersion, version, deadline, created_at AS createdAt,
        updated_at AS updatedAt FROM parliament_items`).all<ParliamentItemForBriefing>(),
    env.DB.prepare(`SELECT item_id AS itemId, citizen_id AS citizenId,
        document_version AS documentVersion, created_at AS createdAt,
        updated_at AS updatedAt FROM parliament_votes WHERE citizen_id = ?`)
      .bind(citizenId).all<VoteForBriefing & { createdAt: string; updatedAt: string }>(),
    env.DB.prepare(`SELECT item_id AS itemId, speaker_status AS speakerStatus,
        speaker_election_deadline AS speakerElectionDeadline,
        speaker_citizen_id AS speakerCitizenId,
        debate_started_at AS debateStartedAt,
        updated_at AS updatedAt FROM parliament_meeting_sessions`).all<SpeakerMeetingForBriefing>(),
    env.DB.prepare(`SELECT item_id AS itemId, citizen_id AS citizenId,
        created_at AS createdAt FROM parliament_speaker_candidates`)
      .all<SpeakerCandidateForBriefing & { createdAt: string }>(),
    env.DB.prepare(`SELECT item_id AS itemId, voter_citizen_id AS voterCitizenId,
        created_at AS createdAt, updated_at AS updatedAt
        FROM parliament_speaker_votes WHERE voter_citizen_id = ?`)
      .bind(citizenId).all<SpeakerVoteForBriefing & { createdAt: string; updatedAt: string }>(),
    env.DB.prepare(`SELECT task_id AS taskId, archived_at AS archivedAt
        FROM briefing_archives WHERE citizen_id = ?`).bind(citizenId).all<ArchiveRow>(),
    env.DB.prepare(`SELECT id, item_id AS itemId, event_type AS eventType,
        description, metadata_json AS metadataJson,
        created_at AS createdAt FROM parliament_audit_events
        ORDER BY created_at DESC`).all<AuditForBriefing>(),
  ]);
  const items = itemRows.results;
  const ownVotes = voteRows.results;
  const meetings = meetingRows.results;
  const candidates = candidateRows.results;
  const ownSpeakerVotes = speakerVoteRows.results;
  const liveTasks = orderedBriefingTasks(parliamentAffairsTasks(items, ownVotes, citizenId,
    meetings, candidates, ownSpeakerVotes));
  const views = buildInboxViews(liveTasks, items, ownVotes, meetings, candidates,
    ownSpeakerVotes, archiveRows.results, citizenId);
  const news = latestNews([...foundingNews, ...verifiedReleaseNews,
    ...parliamentAuditNews(eventRows.results, items)]);
  return { tasks: views.pending, views, news, messageState: "not-connected" as const };
}

// Server-verified identity only: no citizenId is read from the URL or request body.
export async function GET(request: Request) {
  try {
    const citizenId = await currentMember(request);
    if (!citizenId) return Response.json({ error: "请先登录天命成员身份。" }, { status: 401, headers });
    return Response.json(await loadBriefing(citizenId), { headers });
  } catch {
    return Response.json({ error: "简报暂时无法同步，请稍后重试。" }, { status: 503, headers });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "请求来源不匹配。" }, { status: 403, headers });
  try {
    const citizenId = await currentMember(request);
    if (!citizenId) return Response.json({ error: "请先登录。" }, { status: 401, headers });
    const raw = await request.text();
    if (raw.length > 500) return Response.json({ error: "请求内容过长。" }, { status: 400, headers });
    let payload: { action?: string; taskId?: string };
    try { payload = JSON.parse(raw) as { action?: string; taskId?: string }; }
    catch { return Response.json({ error: "请求格式错误。" }, { status: 400, headers }); }
    const action = payload?.action;
    const taskId = payload?.taskId;
    if ((action !== "archive" && action !== "restore") ||
      typeof taskId !== "string" || taskId.length > 256 || !taskId.trim())
      return Response.json({ error: "无效的归档操作。" }, { status: 400, headers });

    const snapshot = await loadBriefing(citizenId);
    const candidates: BriefingTask[] = action === "archive" ? snapshot.views.pending : snapshot.views.archived;
    const task = candidates.find(entry => entry.id === taskId);
    if (!task?.cycleKey) return Response.json({ error: "这项政务已变更，请刷新后重试。" }, { status: 409, headers });
    // The parliament will eventually own the non-archiveable category flag.
    if (action === "archive" && task.priority === "important")
      return Response.json({ error: "该类别的重大政务不可归档。" }, { status: 403, headers });
    if (action === "archive") {
      await env.DB.prepare(`INSERT INTO briefing_archives (citizen_id, task_id, archived_at)
          VALUES (?, ?, ?) ON CONFLICT(citizen_id, task_id)
          DO UPDATE SET archived_at = excluded.archived_at`)
        .bind(citizenId, task.cycleKey, new Date().toISOString()).run();
    } else {
      await env.DB.prepare("DELETE FROM briefing_archives WHERE citizen_id = ? AND task_id = ?")
        .bind(citizenId, task.cycleKey).run();
    }
    return Response.json({ ok: true, action, taskId, cycleKey: task.cycleKey }, { headers });
  } catch {
    return Response.json({ error: "归档操作失败，请重试。" }, { status: 503, headers });
  }
}
