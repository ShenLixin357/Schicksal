import { asc, desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { ensureParliamentSchema } from "../../../db/parliament-schema";
import { requireMember } from "../../../server/auth/member.ts";
import { readJson, apiFailure } from "../../../server/http.ts";
import { suggestedRouting } from "../../../server/parliament/policy.ts";
import {
  parliamentAmendments,
  parliamentAuditEvents,
  parliamentComments,
  parliamentFloorRequests,
  parliamentItems,
  parliamentMeetingSessions,
  parliamentResultReactions,
  parliamentSeats,
  parliamentSpeakerCandidates,
  parliamentSpeakerVotes,
  parliamentVotes,
} from "../../../db/schema";

const CITIZEN_IDS = new Set(["amberina", "zxy", "truth", "kaito", "harry"]);
const SPEAKER_MANAGERS = new Set(["amberina", "zxy", "truth"]);
const STAGES = new Set(["proposal", "debate", "amendment", "voting", "resolved", "deferred"]);
const KINDS = new Set(["proposal", "bill"]);
const CLASSIFICATIONS = new Set(["ordinary", "constitutional", "administrative_review", "external_agreement", "youth_autonomy", "pending_review"]);
const ROUTINGS = new Set(["parliament", "legislative_committee", "dual_review", "youth_electorate", "pending_review"]);
const AGE_BANDS = new Set(["under_8", "8_to_11", "12_plus", "unknown"]);
const COMMENT_TYPES = new Set(["comment", "speech", "point-order", "reaction", "routing-objection"]);
const VOTE_CHOICES = new Set(["support", "oppose", "abstain"]);
const OUTCOMES = new Set(["pending", "passed", "rejected", "leader_decision_required", "withdrawn"]);
const AMENDMENT_DECISIONS = new Set(["accepted", "rejected"]);
const CHAMBER_SIDES = new Set(["proposal", "question"]);
const FLOOR_REQUEST_TYPES = new Set(["speech", "give_way", "point_order"]);
const FLOOR_REQUEST_DECISIONS = new Set(["accepted", "rejected"]);
const RESULT_REACTIONS = new Set(["like", "dislike"]);
const LIVE_RESPONSE_ACTIONS = new Set(["configure_speaker_election", "stand_for_speaker", "cast_speaker_vote", "resolve_speaker_tie", "choose_seat", "start_debate_session", "create_floor_request", "decide_floor_request", "cast_vote", "set_result_reaction"]);

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function truthy(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function isStageManager(request: Request, citizenId: string) {
  if (citizenId !== "amberina") return false;
  if ((env as unknown as { SCHICKSAL_HOSTING?: string }).SCHICKSAL_HOSTING === "cloudflare") return true;
  const hostname = new URL(request.url).hostname;
  if (hostname === "terminal.local" || hostname === "localhost") return true;
  const authenticatedEmail = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  const adminEmail = (env as unknown as { SCHICKSAL_ADMIN_EMAIL?: string }).SCHICKSAL_ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(authenticatedEmail && adminEmail && authenticatedEmail === adminEmail);
}

function isSpeakerManager(request: Request, citizenId: string) {
  if (!SPEAKER_MANAGERS.has(citizenId)) return false;
  if ((env as unknown as { SCHICKSAL_HOSTING?: string }).SCHICKSAL_HOSTING === "cloudflare") return true;
  const hostname = new URL(request.url).hostname;
  return hostname === "terminal.local" || hostname === "localhost" || Boolean(request.headers.get("oai-authenticated-user-email"));
}

async function speakerRecord(itemId: string) {
  const db = getDb();
  const [meetings, candidates, ballots] = await Promise.all([
    db.select().from(parliamentMeetingSessions).where(eq(parliamentMeetingSessions.itemId, itemId)).limit(1),
    db.select().from(parliamentSpeakerCandidates).where(eq(parliamentSpeakerCandidates.itemId, itemId)),
    db.select().from(parliamentSpeakerVotes).where(eq(parliamentSpeakerVotes.itemId, itemId)),
  ]);
  return { meeting: meetings[0] ?? null, candidates, ballots };
}

async function audit(itemId: string, actorCitizenId: string, eventType: string, description: string, metadata: Record<string, unknown>, createdAt: string) {
  await getDb().insert(parliamentAuditEvents).values({
    id: crypto.randomUUID(), itemId, actorCitizenId, eventType, description,
    metadataJson: JSON.stringify(metadata), createdAt,
  });
}

async function resolveSpeakerElectionIfDue(itemId: string, now: string, closedBy = "system", early = false) {
  const db = getDb();
  const [meeting] = await db.select().from(parliamentMeetingSessions).where(eq(parliamentMeetingSessions.itemId, itemId)).limit(1);
  if (!meeting || meeting.speakerStatus !== "open" || !meeting.speakerElectionDeadline || (!early && Date.parse(meeting.speakerElectionDeadline) > Date.parse(now))) return meeting ?? null;
  // Tally and close in one statement, so a ballot arriving during closure is
  // either included in the result or rejected by the ballot's open-state guard.
  const closed = await env.DB.prepare(`WITH totals AS (
      SELECT c.citizen_id, COUNT(v.id) AS votes FROM parliament_speaker_candidates c
      LEFT JOIN parliament_speaker_votes v ON v.item_id = c.item_id AND v.candidate_citizen_id = c.citizen_id
      WHERE c.item_id = ? GROUP BY c.citizen_id
    ), leaders AS (SELECT citizen_id FROM totals WHERE votes = (SELECT MAX(votes) FROM totals) ORDER BY citizen_id)
    UPDATE parliament_meeting_sessions SET
      speaker_status = CASE WHEN (SELECT COUNT(*) FROM leaders) = 1 THEN 'elected' ELSE 'tie_pending' END,
      speaker_citizen_id = CASE WHEN (SELECT COUNT(*) FROM leaders) = 1 THEN (SELECT citizen_id FROM leaders) ELSE '' END,
      speaker_decided_by_citizen_id = CASE WHEN (SELECT COUNT(*) FROM leaders) = 1 THEN 'election' ELSE '' END,
      tied_candidate_ids_json = CASE WHEN (SELECT COUNT(*) FROM leaders) = 1 THEN '[]' ELSE (SELECT json_group_array(citizen_id) FROM leaders) END,
      speaker_election_deadline = CASE WHEN ? = 1 THEN ? ELSE speaker_election_deadline END, updated_at = ?
    WHERE item_id = ? AND speaker_status = 'open' AND (? = 1 OR speaker_election_deadline <= ?)
    RETURNING speaker_status, speaker_citizen_id, tied_candidate_ids_json`)
    .bind(itemId, early ? 1 : 0, now, now, itemId, early ? 1 : 0, now)
    .first<{ speaker_status: string; speaker_citizen_id: string; tied_candidate_ids_json: string }>();
  if (closed) {
    const record = await speakerRecord(itemId);
    const description = closed.speaker_status === "elected" ? "按截止时的票数，最高票者自动当选本次会议议长。" : record.candidates.length ? "最高票平票，等待三位委员中的任意一人裁决。" : "无人参选，可重新开放选举或直接指定议长。";
    await audit(itemId, closedBy, early ? "speaker_election_closed_early" : closed.speaker_status === "elected" ? "speaker_elected" : "speaker_tie", `${early ? "提前结束议长选举。" : "议长选举已截止。"}${description}`, { ...record, originalDeadline: meeting.speakerElectionDeadline, early }, now);
  }
  const [current] = await db.select().from(parliamentMeetingSessions).where(eq(parliamentMeetingSessions.itemId, itemId)).limit(1);
  return current ?? null;
}

async function isMeetingSpeaker(itemId: string, citizenId: string) {
  if (!itemId || !citizenId) return false;
  const [meeting] = await getDb().select().from(parliamentMeetingSessions).where(eq(parliamentMeetingSessions.itemId, itemId)).limit(1);
  return Boolean(meeting && meeting.speakerStatus === "elected" && meeting.speakerCitizenId === citizenId);
}

async function boardPayload(request: Request, requestedItemId: string, citizenId: string) {
  const db = getDb();
  const [items, allComments, allVotes, allAmendments, allAuditEvents] = await Promise.all([
    db.select().from(parliamentItems).orderBy(desc(parliamentItems.updatedAt), desc(parliamentItems.createdAt)),
    db.select().from(parliamentComments).orderBy(asc(parliamentComments.createdAt)),
    db.select().from(parliamentVotes).orderBy(asc(parliamentVotes.createdAt)),
    db.select().from(parliamentAmendments).orderBy(asc(parliamentAmendments.createdAt)),
    db.select().from(parliamentAuditEvents).orderBy(desc(parliamentAuditEvents.createdAt)),
  ]);
  const enrichedItems = items.map((item) => ({
    ...item,
    commentCount: allComments.filter((comment) => comment.itemId === item.id && comment.commentType !== "system").length,
    voteCount: allVotes.filter((vote) => vote.itemId === item.id).length,
    pendingAmendmentCount: allAmendments.filter((amendment) => amendment.itemId === item.id && amendment.status === "pending").length,
  }));
  const activeItem = enrichedItems.find((item) => item.id === requestedItemId) ?? enrichedItems[0] ?? null;
  if (activeItem) await resolveSpeakerElectionIfDue(activeItem.id, new Date().toISOString());
  const [meetingRows, speakerCandidates, speakerVotes, seats, floorRequests, resultReactions] = activeItem ? await Promise.all([
    db.select().from(parliamentMeetingSessions).where(eq(parliamentMeetingSessions.itemId, activeItem.id)).limit(1),
    db.select().from(parliamentSpeakerCandidates).where(eq(parliamentSpeakerCandidates.itemId, activeItem.id)).orderBy(asc(parliamentSpeakerCandidates.createdAt)),
    db.select().from(parliamentSpeakerVotes).where(eq(parliamentSpeakerVotes.itemId, activeItem.id)).orderBy(asc(parliamentSpeakerVotes.createdAt)),
    db.select().from(parliamentSeats).where(eq(parliamentSeats.itemId, activeItem.id)).orderBy(asc(parliamentSeats.side), asc(parliamentSeats.seatIndex)),
    db.select().from(parliamentFloorRequests).where(eq(parliamentFloorRequests.itemId, activeItem.id)).orderBy(desc(parliamentFloorRequests.createdAt)),
    db.select().from(parliamentResultReactions).where(eq(parliamentResultReactions.itemId, activeItem.id)).orderBy(asc(parliamentResultReactions.createdAt)),
  ]) : [[], [], [], [], [], []];
  const meeting = meetingRows[0] ?? null;
  return {
    items: enrichedItems,
    activeItem,
    comments: activeItem ? allComments.filter((comment) => comment.itemId === activeItem.id) : [],
    votes: activeItem ? allVotes.filter((vote) => vote.itemId === activeItem.id) : [],
    amendments: activeItem ? allAmendments.filter((amendment) => amendment.itemId === activeItem.id) : [],
    auditEvents: activeItem ? allAuditEvents.filter((event) => event.itemId === activeItem.id) : [],
    meeting,
    speakerCandidates,
    speakerVotes,
    seats,
    floorRequests,
    resultReactions,
    session: {
      citizenId,
      stageManager: isStageManager(request, citizenId),
      speakerManager: isSpeakerManager(request, citizenId),
      meetingSpeaker: Boolean(meeting && meeting.speakerStatus === "elected" && meeting.speakerCitizenId === citizenId),
      platformAuthenticated: Boolean(citizenId),
    },
  };
}

async function livePayload(request: Request, itemId: string, citizenId: string) {
  const db = getDb();
  const [item] = itemId ? await db.select().from(parliamentItems).where(eq(parliamentItems.id, itemId)).limit(1) : [];
  if (!item) return { error: "找不到这项议案。" };
  await resolveSpeakerElectionIfDue(item.id, new Date().toISOString());
  const [meetingRows, speakerCandidates, speakerVotes, seats, floorRequests, resultReactions, votes] = await Promise.all([
    db.select().from(parliamentMeetingSessions).where(eq(parliamentMeetingSessions.itemId, item.id)).limit(1),
    db.select().from(parliamentSpeakerCandidates).where(eq(parliamentSpeakerCandidates.itemId, item.id)).orderBy(asc(parliamentSpeakerCandidates.createdAt)),
    db.select().from(parliamentSpeakerVotes).where(eq(parliamentSpeakerVotes.itemId, item.id)).orderBy(asc(parliamentSpeakerVotes.createdAt)),
    db.select().from(parliamentSeats).where(eq(parliamentSeats.itemId, item.id)).orderBy(asc(parliamentSeats.side), asc(parliamentSeats.seatIndex)),
    db.select().from(parliamentFloorRequests).where(eq(parliamentFloorRequests.itemId, item.id)).orderBy(desc(parliamentFloorRequests.createdAt)),
    db.select().from(parliamentResultReactions).where(eq(parliamentResultReactions.itemId, item.id)).orderBy(asc(parliamentResultReactions.createdAt)),
    db.select().from(parliamentVotes).where(eq(parliamentVotes.itemId, item.id)).orderBy(asc(parliamentVotes.createdAt)),
  ]);
  const meeting = meetingRows[0] ?? null;
  return {
    meeting,
    speakerCandidates,
    speakerVotes,
    seats,
    floorRequests,
    resultReactions,
    votes,
    session: {
      citizenId,
      stageManager: isStageManager(request, citizenId),
      speakerManager: isSpeakerManager(request, citizenId),
      meetingSpeaker: Boolean(meeting && meeting.speakerStatus === "elected" && meeting.speakerCitizenId === citizenId),
      platformAuthenticated: Boolean(citizenId),
    },
  };
}

export async function GET(request: Request) {
  try {
    const citizenId = await requireMember(request);
    await ensureParliamentSchema();
    const url = new URL(request.url);
    const itemId = cleanText(url.searchParams.get("itemId"), 80);
    if (url.searchParams.get("scope") === "live") return Response.json(await livePayload(request, itemId, citizenId));
    return Response.json(await boardPayload(request, itemId, citizenId));
  } catch (error) {
    return apiFailure(error, "议会资料暂时无法读取。");
  }
}

export async function POST(request: Request) {
  try {
    const citizenId = await requireMember(request);
    await ensureParliamentSchema();
    const payload = await readJson(request, 60000);
    const action = cleanText(payload.action, 40);
    if (!citizenId) return Response.json({ error: "只有已识别的第一帝国公民可以参与议事。" }, { status: 403 });

    const db = getDb();
    let itemId = cleanText(payload.itemId, 80);
    const now = new Date().toISOString();

    if (action === "create_item") {
      const title = cleanText(payload.title, 140);
      const summary = cleanText(payload.summary, 500);
      const body = cleanText(payload.body, 12_000);
      const kind = cleanText(payload.kind, 30);
      const classification = cleanText(payload.classification, 40) || "pending_review";
      const proposerAgeBand = cleanText(payload.proposerAgeBand, 30) || "unknown";
      const recusalRequested = truthy(payload.recusalRequested);
      const deadline = cleanText(payload.deadline, 40);
      if (!title || !summary) return Response.json({ error: "请填写提案标题和摘要。" }, { status: 400 });
      if (!KINDS.has(kind)) return Response.json({ error: "请选择“提案”或“法案草案”。" }, { status: 400 });
      if (!CLASSIFICATIONS.has(classification) || !AGE_BANDS.has(proposerAgeBand)) return Response.json({ error: "议案分类或提案人年龄组无效。" }, { status: 400 });
      const routing = suggestedRouting(classification, proposerAgeBand, recusalRequested);
      itemId = crypto.randomUUID();
      const prefix = kind === "bill" ? "B" : "P";
      const serialCode = `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      await db.insert(parliamentItems).values({
        id: itemId, serialCode, kind, title, summary, body: body || "正文待提案人或立法委员会补入。",
        stage: "proposal", outcome: "pending", classification, routing, proposerAgeBand,
        recusalRequested: recusalRequested ? 1 : 0, deadline, stageReason: "新提交，等待受理与分流审查。",
        createdByCitizenId: citizenId, version: 1, createdAt: now, updatedAt: now,
      });
      await db.insert(parliamentComments).values({
        id: crypto.randomUUID(), itemId, citizenId: "amberina", commentType: "system",
        body: `${citizenId} 提交了新${kind === "bill" ? "法案草案" : "提案"}；系统建议分流至 ${routing}，等待正式确认。`, createdAt: now,
      });
      await audit(itemId, citizenId, "submitted", "议案已提交并生成程序分流建议。", { classification, routing, proposerAgeBand, recusalRequested }, now);
    } else if (action === "update_item") {
      if (!isStageManager(request, citizenId)) return Response.json({ error: "只有宇宙霸主账号可以编辑正式议案文稿。" }, { status: 403 });
      const title = cleanText(payload.title, 140);
      const summary = cleanText(payload.summary, 500);
      const body = cleanText(payload.body, 12_000);
      if (!itemId || !title || !summary || !body) return Response.json({ error: "标题、摘要和正文都不能为空。" }, { status: 400 });
      const [existing] = await db.select().from(parliamentItems).where(eq(parliamentItems.id, itemId)).limit(1);
      if (!existing) return Response.json({ error: "找不到这项议案。" }, { status: 404 });
      if (existing.stage === "voting" || existing.stage === "resolved") return Response.json({ error: "投票中或已结案的文本已冻结；请先正式重开议案。" }, { status: 409 });
      const nextVersion = existing.version + 1;
      await db.update(parliamentItems).set({ title, summary, body, version: nextVersion, updatedAt: now }).where(eq(parliamentItems.id, itemId));
      await db.insert(parliamentComments).values({ id: crypto.randomUUID(), itemId, citizenId, commentType: "system", body: `正式文稿更新至 v${nextVersion}。`, createdAt: now });
      await audit(itemId, citizenId, "text_revised", `正式文稿更新至 v${nextVersion}。`, { fromVersion: existing.version, toVersion: nextVersion }, now);
    } else if (action === "classify_item") {
      if (!isStageManager(request, citizenId)) return Response.json({ error: "只有宇宙霸主账号可以确认议案分类与程序路线。" }, { status: 403 });
      const classification = cleanText(payload.classification, 40);
      const routing = cleanText(payload.routing, 40);
      const proposerAgeBand = cleanText(payload.proposerAgeBand, 30);
      const deadline = cleanText(payload.deadline, 40);
      const recusalRequested = truthy(payload.recusalRequested);
      const reason = cleanText(payload.reason, 500);
      if (!itemId || !CLASSIFICATIONS.has(classification) || !ROUTINGS.has(routing) || !AGE_BANDS.has(proposerAgeBand)) return Response.json({ error: "请选择有效的分类、路线和年龄组。" }, { status: 400 });
      if (reason.length < 4) return Response.json({ error: "请写明分流理由，至少 4 个字。" }, { status: 400 });
      const [existing] = await db.select().from(parliamentItems).where(eq(parliamentItems.id, itemId)).limit(1);
      if (!existing) return Response.json({ error: "找不到这项议案。" }, { status: 404 });
      await db.update(parliamentItems).set({ classification, routing, proposerAgeBand, deadline, recusalRequested: recusalRequested ? 1 : 0, updatedAt: now }).where(eq(parliamentItems.id, itemId));
      await audit(itemId, citizenId, "classified", `确认议案分类与程序路线：${reason}`, { classification, routing, proposerAgeBand, recusalRequested, deadline }, now);
    } else if (action === "configure_speaker_election") {
      if (!isSpeakerManager(request, citizenId)) return Response.json({ error: "只有宇宙霸主、No.2 和我说真的可以管理议长选举。" }, { status: 403 });
      const deadlineInput = cleanText(payload.speakerElectionDeadline, 80);
      if (!itemId || !deadlineInput || !Number.isFinite(Date.parse(deadlineInput))) return Response.json({ error: "请选择有效的议长选举截止时间。" }, { status: 400 });
      const speakerElectionDeadline = new Date(deadlineInput).toISOString();
      if (Date.parse(speakerElectionDeadline) <= Date.parse(now)) return Response.json({ error: "议长选举截止时间必须晚于现在。" }, { status: 400 });
      const [existing] = await db.select().from(parliamentItems).where(eq(parliamentItems.id, itemId)).limit(1);
      if (!existing || !["debate", "amendment"].includes(existing.stage)) return Response.json({ error: "议长选举只能在辩论或修正阶段开启。" }, { status: 409 });
      const previous = await speakerRecord(itemId);
      if (previous.meeting && previous.meeting.speakerStatus !== "not_configured") return Response.json({ error: "请先撤销本次选举或议长权限，再重新开放选举。" }, { status: 409 });
      await env.DB.batch([
        env.DB.prepare("DELETE FROM parliament_speaker_votes WHERE item_id = ?").bind(itemId),
        env.DB.prepare("DELETE FROM parliament_speaker_candidates WHERE item_id = ?").bind(itemId),
        env.DB.prepare("DELETE FROM parliament_seats WHERE item_id = ?").bind(itemId),
        env.DB.prepare("DELETE FROM parliament_floor_requests WHERE item_id = ?").bind(itemId),
        env.DB.prepare(`INSERT INTO parliament_meeting_sessions
          (item_id, speaker_election_deadline, speaker_status, speaker_citizen_id, speaker_decided_by_citizen_id, tied_candidate_ids_json, current_floor_citizen_id, debate_started_at, seats_locked, updated_at)
          VALUES (?, ?, 'open', '', '', '[]', '', '', 0, ?)
          ON CONFLICT(item_id) DO UPDATE SET speaker_election_deadline = excluded.speaker_election_deadline, speaker_status = 'open', speaker_citizen_id = '', speaker_decided_by_citizen_id = '', tied_candidate_ids_json = '[]', current_floor_citizen_id = '', debate_started_at = '', seats_locked = 0, updated_at = excluded.updated_at`)
          .bind(itemId, speakerElectionDeadline, now),
      ]);
      await audit(itemId, citizenId, "speaker_election_opened", "本次会议议长选举已开放，票数与投票者实时公开。", { speakerElectionDeadline, previous }, now);
    } else if (["close_speaker_election", "revoke_speaker_election", "assign_speaker"].includes(action)) {
      if (!isSpeakerManager(request, citizenId)) return Response.json({ error: "只有宇宙霸主、No.2 和我说真的可以管理本次议长。" }, { status: 403 });
      const [item] = await db.select().from(parliamentItems).where(eq(parliamentItems.id, itemId)).limit(1);
      if (!item) return Response.json({ error: "找不到这项议案。" }, { status: 404 });
      if (!["proposal", "deferred", "debate", "amendment"].includes(item.stage)) return Response.json({ error: "表决中或已结案的议案不能更换议长；请先由最高领导人重开辩论。" }, { status: 409 });
      const previous = await speakerRecord(itemId);
      if (action === "close_speaker_election") {
        if (previous.meeting?.speakerStatus !== "open") return Response.json({ error: "本次议长选举已经关闭或尚未开放。" }, { status: 409 });
        await resolveSpeakerElectionIfDue(itemId, now, citizenId, true);
      } else if (action === "revoke_speaker_election") {
        if (!previous.meeting || previous.meeting.speakerStatus === "not_configured") return Response.json({ error: "本次没有可撤销的选举或议长权限。" }, { status: 409 });
        await env.DB.batch([
          env.DB.prepare(`UPDATE parliament_meeting_sessions SET speaker_election_deadline = '', speaker_status = 'not_configured', speaker_citizen_id = '', speaker_decided_by_citizen_id = '', tied_candidate_ids_json = '[]', current_floor_citizen_id = '', debate_started_at = '', seats_locked = 0, updated_at = ? WHERE item_id = ?`).bind(now, itemId),
          env.DB.prepare("UPDATE parliament_floor_requests SET status = 'rejected', decided_at = ?, decided_by_citizen_id = ? WHERE item_id = ? AND status = 'pending'").bind(now, citizenId, itemId),
        ]);
        await audit(itemId, citizenId, "speaker_election_revoked", "本次议长选举及议长权限已撤销。正式发言、原始选票和撤销前的结果保留在程序记录中。", { previous }, now);
      } else {
        const candidateCitizenId = cleanText(payload.candidateCitizenId, 40);
        if (!CITIZEN_IDS.has(candidateCitizenId)) return Response.json({ error: "请选择一位有效公民担任本次会议议长。" }, { status: 400 });
        const startNow = truthy(payload.startDebateNow);
        await env.DB.batch([
          env.DB.prepare(`INSERT INTO parliament_meeting_sessions (item_id, speaker_election_deadline, speaker_status, speaker_citizen_id, speaker_decided_by_citizen_id, tied_candidate_ids_json, current_floor_citizen_id, debate_started_at, seats_locked, updated_at)
            VALUES (?, '', 'elected', ?, ?, '[]', '', ?, ?, ?)
            ON CONFLICT(item_id) DO UPDATE SET speaker_election_deadline = '', speaker_status = 'elected', speaker_citizen_id = excluded.speaker_citizen_id, speaker_decided_by_citizen_id = excluded.speaker_decided_by_citizen_id, tied_candidate_ids_json = '[]', current_floor_citizen_id = '', debate_started_at = excluded.debate_started_at, seats_locked = excluded.seats_locked, updated_at = excluded.updated_at`)
            .bind(itemId, candidateCitizenId, citizenId, startNow ? now : "", startNow ? 1 : 0, now),
          env.DB.prepare("DELETE FROM parliament_seats WHERE item_id = ? AND citizen_id = ?").bind(itemId, candidateCitizenId),
          env.DB.prepare("UPDATE parliament_floor_requests SET status = 'rejected', decided_at = ?, decided_by_citizen_id = ? WHERE item_id = ? AND status = 'pending'").bind(now, citizenId, itemId),
          env.DB.prepare("UPDATE parliament_items SET stage = 'debate', outcome = 'pending', stage_reason = '委员直接指定本次会议议长，进入辩论。', updated_at = ? WHERE id = ?").bind(now, itemId),
        ]);
        await audit(itemId, citizenId, "speaker_appointed", `委员直接指定本次会议议长，${startNow ? "立即开始辩论，锁定现有席位" : "进入议场，等待成员就座后宣布开会"}。`, { candidateCitizenId, startDebateNow: startNow, previous, previousStage: item.stage }, now);
      }
    } else if (action === "stand_for_speaker") {
      if (!itemId) return Response.json({ error: "找不到本次会议。" }, { status: 400 });
      const [meeting] = await db.select().from(parliamentMeetingSessions).where(eq(parliamentMeetingSessions.itemId, itemId)).limit(1);
      if (!meeting || meeting.speakerStatus !== "open" || Date.parse(meeting.speakerElectionDeadline) <= Date.parse(now)) return Response.json({ error: "议长候选登记已经关闭。" }, { status: 409 });
      const inserted = await env.DB.prepare(`INSERT OR IGNORE INTO parliament_speaker_candidates (id, item_id, citizen_id, created_at)
        SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM parliament_meeting_sessions WHERE item_id = ? AND speaker_status = 'open' AND speaker_election_deadline > ?)`)
        .bind(`${itemId}:${citizenId}`, itemId, citizenId, now, itemId, now).run();
      if (!inserted.meta.changes) return Response.json({ error: "选举已关闭，或你已经登记参选。" }, { status: 409 });
      await audit(itemId, citizenId, "speaker_candidacy", `${citizenId} 登记为本次会议议长候选人。`, {}, now);
    } else if (action === "cast_speaker_vote") {
      const candidateCitizenId = cleanText(payload.candidateCitizenId, 40);
      if (!itemId || !CITIZEN_IDS.has(candidateCitizenId)) return Response.json({ error: "请选择有效的议长候选人。" }, { status: 400 });
      const [meeting] = await db.select().from(parliamentMeetingSessions).where(eq(parliamentMeetingSessions.itemId, itemId)).limit(1);
      if (!meeting || meeting.speakerStatus !== "open" || Date.parse(meeting.speakerElectionDeadline) <= Date.parse(now)) return Response.json({ error: "议长选举已经截止。" }, { status: 409 });
      const [candidate] = await db.select().from(parliamentSpeakerCandidates).where(eq(parliamentSpeakerCandidates.id, `${itemId}:${candidateCitizenId}`)).limit(1);
      if (!candidate) return Response.json({ error: "这位公民尚未登记参选本次会议议长。" }, { status: 409 });
      const voted = await env.DB.prepare(`INSERT INTO parliament_speaker_votes (id, item_id, voter_citizen_id, candidate_citizen_id, created_at, updated_at)
        SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM parliament_meeting_sessions WHERE item_id = ? AND speaker_status = 'open' AND speaker_election_deadline > ?)
        ON CONFLICT(item_id, voter_citizen_id) DO UPDATE SET candidate_citizen_id = excluded.candidate_citizen_id, updated_at = excluded.updated_at`)
        .bind(`${itemId}:${citizenId}`, itemId, citizenId, candidateCitizenId, now, now, itemId, now).run();
      if (!voted.meta.changes) return Response.json({ error: "议长选举已经截止。" }, { status: 409 });
      await audit(itemId, citizenId, "speaker_vote_cast", `${citizenId} 公开投出本次会议议长选票。`, { candidateCitizenId }, now);
    } else if (action === "resolve_speaker_tie") {
      if (!isSpeakerManager(request, citizenId)) return Response.json({ error: "议长选举平票只能由宇宙霸主、No.2 或我说真的裁决。" }, { status: 403 });
      const [item] = await db.select().from(parliamentItems).where(eq(parliamentItems.id, itemId)).limit(1);
      if (!item || !["debate", "amendment"].includes(item.stage)) return Response.json({ error: "只能在辩论或修正阶段裁决议长选举。" }, { status: 409 });
      const candidateCitizenId = cleanText(payload.candidateCitizenId, 40);
      const [meeting] = await db.select().from(parliamentMeetingSessions).where(eq(parliamentMeetingSessions.itemId, itemId)).limit(1);
      let tiedCandidates: string[] = [];
      try { tiedCandidates = meeting ? JSON.parse(meeting.tiedCandidateIdsJson) as string[] : []; } catch { tiedCandidates = []; }
      if (!meeting || meeting.speakerStatus !== "tie_pending" || !tiedCandidates.includes(candidateCitizenId)) return Response.json({ error: "只能在平票候选人中作出裁决。" }, { status: 409 });
      await db.update(parliamentMeetingSessions).set({ speakerStatus: "elected", speakerCitizenId: candidateCitizenId, speakerDecidedByCitizenId: citizenId, tiedCandidateIdsJson: "[]", updatedAt: now }).where(eq(parliamentMeetingSessions.itemId, itemId));
      await audit(itemId, citizenId, "speaker_tie_resolved", "委员完成议长选举平票裁决。", { candidateCitizenId }, now);
    } else if (action === "choose_seat") {
      const side = cleanText(payload.side, 20);
      const seatIndex = Number(payload.seatIndex);
      if (!itemId || !CHAMBER_SIDES.has(side) || !Number.isInteger(seatIndex) || seatIndex < 1 || seatIndex > 4) return Response.json({ error: "请选择有效的议场席位。" }, { status: 400 });
      const [meeting] = await db.select().from(parliamentMeetingSessions).where(eq(parliamentMeetingSessions.itemId, itemId)).limit(1);
      if (!meeting || meeting.speakerStatus !== "elected") return Response.json({ error: "议长产生后才能进入议场选座。" }, { status: 409 });
      if (meeting.speakerCitizenId === citizenId) return Response.json({ error: "本次会议议长已经就座于中央议长席。" }, { status: 409 });
      if (meeting.seatsLocked || meeting.debateStartedAt) return Response.json({ error: "辩论已经开始，议场席位现已锁定。" }, { status: 409 });
      const occupied = await env.DB.prepare("SELECT citizen_id FROM parliament_seats WHERE item_id = ? AND side = ? AND seat_index = ? LIMIT 1").bind(itemId, side, seatIndex).first<{ citizen_id: string }>();
      if (occupied && occupied.citizen_id !== citizenId) return Response.json({ error: "这个位置已经有人就座。" }, { status: 409 });
      await env.DB.batch([
        env.DB.prepare("DELETE FROM parliament_seats WHERE item_id = ? AND citizen_id = ?").bind(itemId, citizenId),
        env.DB.prepare("INSERT INTO parliament_seats (id, item_id, citizen_id, side, seat_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(`${itemId}:${citizenId}`, itemId, citizenId, side, seatIndex, now, now),
      ]);
      await audit(itemId, citizenId, "seat_selected", `${citizenId} 选择了${side === "proposal" ? "提案方" : "质询方"}第 ${seatIndex} 席。`, { side, seatIndex }, now);
    } else if (action === "start_debate_session") {
      if (!await isMeetingSpeaker(itemId, citizenId)) return Response.json({ error: "只有本次会议当选议长可以宣布开会。" }, { status: 403 });
      const [meeting] = await db.select().from(parliamentMeetingSessions).where(eq(parliamentMeetingSessions.itemId, itemId)).limit(1);
      if (!meeting || meeting.debateStartedAt) return Response.json({ error: "本次辩论已经开始。" }, { status: 409 });
      await db.update(parliamentMeetingSessions).set({ debateStartedAt: now, seatsLocked: 1, updatedAt: now }).where(eq(parliamentMeetingSessions.itemId, itemId));
      await audit(itemId, citizenId, "debate_opened", "本次会议议长宣布开会，提案方与质询方席位锁定。", {}, now);
    } else if (action === "create_floor_request") {
      const requestType = cleanText(payload.requestType, 30);
      const body = cleanText(payload.body, 500);
      if (!itemId || !FLOOR_REQUEST_TYPES.has(requestType)) return Response.json({ error: "请选择有效的议场请求。" }, { status: 400 });
      const [meeting] = await db.select().from(parliamentMeetingSessions).where(eq(parliamentMeetingSessions.itemId, itemId)).limit(1);
      if (!meeting || !meeting.debateStartedAt) return Response.json({ error: "正式辩论尚未开始。" }, { status: 409 });
      if (meeting.speakerCitizenId === citizenId) return Response.json({ error: "议长请直接使用主持面板。" }, { status: 409 });
      await db.insert(parliamentFloorRequests).values({ id: crypto.randomUUID(), itemId, citizenId, requestType, body, status: "pending", createdAt: now });
      await audit(itemId, citizenId, "floor_request", `${citizenId} 提交议场请求：${requestType}。`, { requestType, body }, now);
    } else if (action === "decide_floor_request") {
      if (!await isMeetingSpeaker(itemId, citizenId)) return Response.json({ error: "只有本次会议议长可以处理发言和程序请求。" }, { status: 403 });
      const requestId = cleanText(payload.requestId, 80);
      const decision = cleanText(payload.decision, 20);
      if (!requestId || !FLOOR_REQUEST_DECISIONS.has(decision)) return Response.json({ error: "请选择接受或拒绝。" }, { status: 400 });
      const [floorRequest] = await db.select().from(parliamentFloorRequests).where(eq(parliamentFloorRequests.id, requestId)).limit(1);
      if (!floorRequest || floorRequest.itemId !== itemId || floorRequest.status !== "pending") return Response.json({ error: "这项议场请求已经处理或不存在。" }, { status: 409 });
      await db.update(parliamentFloorRequests).set({ status: decision, decidedAt: now, decidedByCitizenId: citizenId }).where(eq(parliamentFloorRequests.id, requestId));
      if (decision === "accepted") await db.update(parliamentMeetingSessions).set({ currentFloorCitizenId: floorRequest.citizenId, updatedAt: now }).where(eq(parliamentMeetingSessions.itemId, itemId));
      await audit(itemId, citizenId, "floor_request_decided", `议长${decision === "accepted" ? "接受" : "拒绝"}了议场请求。`, { requestId, decision, requestType: floorRequest.requestType }, now);
    } else if (action === "set_result_reaction") {
      const reaction = cleanText(payload.reaction, 20);
      if (!itemId || !RESULT_REACTIONS.has(reaction)) return Response.json({ error: "请选择赞或踩。" }, { status: 400 });
      const [existing] = await db.select().from(parliamentItems).where(eq(parliamentItems.id, itemId)).limit(1);
      if (!existing || existing.stage !== "resolved") return Response.json({ error: "只有已经认证的结果可以进行态度反馈。" }, { status: 409 });
      await env.DB.prepare(`INSERT INTO parliament_result_reactions (id, item_id, citizen_id, reaction, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(item_id, citizen_id) DO UPDATE SET reaction = excluded.reaction, updated_at = excluded.updated_at`)
        .bind(`${itemId}:${citizenId}`, itemId, citizenId, reaction, now, now).run();
    } else if (action === "add_comment") {
      const body = cleanText(payload.body, 1_500);
      const commentType = cleanText(payload.commentType, 40);
      const quoteText = cleanText(payload.quoteText, 1_500);
      const parentId = cleanText(payload.parentId, 80);
      if (!itemId || !body) return Response.json({ error: "评论内容不能为空。" }, { status: 400 });
      if (!COMMENT_TYPES.has(commentType)) return Response.json({ error: "评论类型无效。" }, { status: 400 });
      const [existing] = await db.select().from(parliamentItems).where(eq(parliamentItems.id, itemId)).limit(1);
      if (!existing) return Response.json({ error: "找不到这项议案。" }, { status: 404 });
      if (commentType === "speech" && ["debate", "amendment"].includes(existing.stage)) {
        const [meeting] = await db.select().from(parliamentMeetingSessions).where(eq(parliamentMeetingSessions.itemId, itemId)).limit(1);
        if (!meeting?.debateStartedAt || meeting.currentFloorCitizenId !== citizenId) return Response.json({ error: "只有经本次会议议长准许的当前发言人可以提交正式发言。" }, { status: 403 });
      }
      if (commentType === "reaction" && ["debate", "amendment"].includes(existing.stage)) {
        const [meeting] = await db.select().from(parliamentMeetingSessions).where(eq(parliamentMeetingSessions.itemId, itemId)).limit(1);
        if (!meeting?.debateStartedAt) return Response.json({ error: "议长宣布开会后才能发送议场反应。" }, { status: 409 });
      }
      if (quoteText && !existing.body.includes(quoteText)) return Response.json({ error: "引用内容必须来自当前版本的议案正文。" }, { status: 400 });
      if (parentId) {
        const [parent] = await db.select().from(parliamentComments).where(eq(parliamentComments.id, parentId)).limit(1);
        if (!parent || parent.itemId !== itemId) return Response.json({ error: "找不到要回复的发言。" }, { status: 404 });
      }
      await db.insert(parliamentComments).values({ id: crypto.randomUUID(), itemId, citizenId, commentType, body, quoteText, parentId, createdAt: now });
      await db.update(parliamentItems).set({ updatedAt: now }).where(eq(parliamentItems.id, itemId));
      if (commentType === "routing-objection") await audit(itemId, citizenId, "routing_objection", "公民对当前议案分流提出异议，等待程序审查。", { body }, now);
    } else if (action === "submit_amendment") {
      const targetQuote = cleanText(payload.targetQuote, 2_000);
      const proposedText = cleanText(payload.proposedText, 4_000);
      const reason = cleanText(payload.reason, 1_000);
      if (!itemId || !targetQuote || !proposedText || !reason) return Response.json({ error: "原文、替换文本与修正理由都不能为空。" }, { status: 400 });
      const [existing] = await db.select().from(parliamentItems).where(eq(parliamentItems.id, itemId)).limit(1);
      if (!existing) return Response.json({ error: "找不到这项议案。" }, { status: 404 });
      if (["voting", "resolved", "deferred"].includes(existing.stage)) return Response.json({ error: "当前阶段不接受新的正式修正案。" }, { status: 409 });
      if (!existing.body.includes(targetQuote)) return Response.json({ error: "待修改原文必须逐字来自当前版本。" }, { status: 400 });
      const amendmentId = crypto.randomUUID();
      await db.insert(parliamentAmendments).values({ id: amendmentId, itemId, citizenId, targetQuote, proposedText, reason, status: "pending", createdAt: now });
      await db.update(parliamentItems).set({ stage: existing.stage === "proposal" ? "amendment" : existing.stage, updatedAt: now }).where(eq(parliamentItems.id, itemId));
      await audit(itemId, citizenId, "amendment_submitted", "正式修正案已提交，等待接受或否决。", { amendmentId, targetQuote, proposedText }, now);
    } else if (action === "decide_amendment") {
      if (!isStageManager(request, citizenId)) return Response.json({ error: "只有宇宙霸主账号可以正式接受或否决修正案。" }, { status: 403 });
      const amendmentId = cleanText(payload.amendmentId, 80);
      const decision = cleanText(payload.decision, 20);
      if (!amendmentId || !AMENDMENT_DECISIONS.has(decision)) return Response.json({ error: "请选择接受或否决。" }, { status: 400 });
      const [amendment] = await db.select().from(parliamentAmendments).where(eq(parliamentAmendments.id, amendmentId)).limit(1);
      if (!amendment || amendment.itemId !== itemId) return Response.json({ error: "找不到这项修正案。" }, { status: 404 });
      if (amendment.status !== "pending") return Response.json({ error: "这项修正案已经处理。" }, { status: 409 });
      const [existing] = await db.select().from(parliamentItems).where(eq(parliamentItems.id, itemId)).limit(1);
      if (!existing) return Response.json({ error: "找不到议案正文。" }, { status: 404 });
      if (existing.stage === "voting" || existing.stage === "resolved") return Response.json({ error: "文本已冻结，不能处理修正案。" }, { status: 409 });
      let nextVersion = existing.version;
      if (decision === "accepted") {
        if (!existing.body.includes(amendment.targetQuote)) return Response.json({ error: "当前正文已变化，请重新提交针对新版本的修正案。" }, { status: 409 });
        nextVersion += 1;
        const nextBody = existing.body.replace(amendment.targetQuote, amendment.proposedText);
        await db.update(parliamentItems).set({ body: nextBody, version: nextVersion, updatedAt: now }).where(eq(parliamentItems.id, itemId));
      }
      await db.update(parliamentAmendments).set({ status: decision, decidedAt: now, decidedByCitizenId: citizenId }).where(eq(parliamentAmendments.id, amendmentId));
      await audit(itemId, citizenId, `amendment_${decision}`, `修正案已${decision === "accepted" ? `接受并并入 v${nextVersion}` : "否决"}。`, { amendmentId, decision, version: nextVersion }, now);
    } else if (action === "cast_vote") {
      const choice = cleanText(payload.choice, 20);
      if (!itemId || !VOTE_CHOICES.has(choice)) return Response.json({ error: "请选择支持、反对或弃权。" }, { status: 400 });
      const [existing] = await db.select().from(parliamentItems).where(eq(parliamentItems.id, itemId)).limit(1);
      if (!existing) return Response.json({ error: "找不到这项议案。" }, { status: 404 });
      if (existing.stage !== "voting" || !existing.votingVersion || existing.votingVersion !== existing.version) return Response.json({ error: "投票尚未开放，或表决文本版本已失效。" }, { status: 409 });
      await env.DB.prepare(`INSERT INTO parliament_votes (id, item_id, citizen_id, choice, document_version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(item_id, citizen_id) DO UPDATE SET choice = excluded.choice, document_version = excluded.document_version, updated_at = excluded.updated_at`)
        .bind(`${itemId}:${citizenId}`, itemId, citizenId, choice, existing.votingVersion, now, now).run();
      await db.update(parliamentItems).set({ updatedAt: now }).where(eq(parliamentItems.id, itemId));
    } else if (action === "transition_stage") {
      if (!isStageManager(request, citizenId)) return Response.json({ error: "只有宇宙霸主账号可以切换议事阶段。" }, { status: 403 });
      const nextStage = cleanText(payload.stage, 30);
      const reason = cleanText(payload.reason, 500);
      if (!itemId || !STAGES.has(nextStage)) return Response.json({ error: "请选择有效的议事阶段。" }, { status: 400 });
      if (reason.length < 4) return Response.json({ error: "每次阶段变化都必须写明程序理由，至少 4 个字。" }, { status: 400 });
      const [existing] = await db.select().from(parliamentItems).where(eq(parliamentItems.id, itemId)).limit(1);
      if (!existing) return Response.json({ error: "找不到这项议案。" }, { status: 404 });
      if (nextStage === "voting") {
        const pending = await db.select().from(parliamentAmendments).where(eq(parliamentAmendments.itemId, itemId));
        if (pending.some((amendment) => amendment.status === "pending")) return Response.json({ error: "仍有待处理修正案，不能进入表决。" }, { status: 409 });
        if (existing.routing === "pending_review") return Response.json({ error: "程序分流尚未确认，不能进入表决。" }, { status: 409 });
        if (["debate", "amendment"].includes(existing.stage)) {
          const [meeting] = await db.select().from(parliamentMeetingSessions).where(eq(parliamentMeetingSessions.itemId, itemId)).limit(1);
          if (!meeting || meeting.speakerStatus !== "elected" || !meeting.debateStartedAt) return Response.json({ error: "必须先完成议长选举并由当选议长宣布开会，才能进入正式表决。" }, { status: 409 });
        }
      }
      if (nextStage === "resolved" && existing.stage !== "voting") return Response.json({ error: "只有正在表决的议案可以直接结案。" }, { status: 409 });
      let outcome = nextStage === "resolved" ? existing.outcome : "pending";
      if (nextStage === "resolved") {
        const requestedOutcome = cleanText(payload.outcome, 40);
        if (OUTCOMES.has(requestedOutcome) && requestedOutcome !== "pending") outcome = requestedOutcome;
        else {
          const votes = await db.select().from(parliamentVotes).where(eq(parliamentVotes.itemId, itemId));
          const eligibleVotes = votes.filter((vote) => vote.documentVersion === existing.votingVersion);
          const support = eligibleVotes.filter((vote) => vote.choice === "support").length;
          const oppose = eligibleVotes.filter((vote) => vote.choice === "oppose").length;
          outcome = support > oppose ? "passed" : oppose > support ? "rejected" : "leader_decision_required";
        }
      }
      await db.update(parliamentItems).set({ stage: nextStage, outcome, stageReason: reason, votingVersion: nextStage === "voting" ? existing.version : existing.votingVersion, updatedAt: now }).where(eq(parliamentItems.id, itemId));
      await db.insert(parliamentComments).values({ id: crypto.randomUUID(), itemId, citizenId, commentType: "system", body: `议事阶段由“${existing.stage}”切换为“${nextStage}”：${reason}`, createdAt: now });
      await audit(itemId, citizenId, "stage_transition", `议事阶段由“${existing.stage}”切换为“${nextStage}”。`, { from: existing.stage, to: nextStage, reason, outcome, frozenVersion: nextStage === "voting" ? existing.version : existing.votingVersion }, now);
    } else {
      return Response.json({ error: "未知的议会操作。" }, { status: 400 });
    }

    return Response.json(LIVE_RESPONSE_ACTIONS.has(action) ? await livePayload(request, itemId, citizenId) : await boardPayload(request, itemId, citizenId));
  } catch (error) {
    return apiFailure(error, "议会操作失败，请稍后重试。");
  }
}
