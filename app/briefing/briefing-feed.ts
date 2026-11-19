import type { BriefingNews, BriefingTask } from "./briefing-data";

export type ParliamentItemForBriefing = {
  id: string;
  serialCode: string;
  kind?: string;
  outcome?: string;
  title: string;
  summary: string;
  stage: string;
  votingVersion: number | null;
  version: number;
  // Existing parliament_items.deadline is a planned date, NOT an enforced
  // voting cutoff. A real phase cutoff must come from its own source.
  deadline: string;
  createdAt: string;
  updatedAt: string;
};

export type VoteForBriefing = {
  itemId: string;
  citizenId: string;
  documentVersion: number;
};

export type SpeakerMeetingForBriefing = {
  itemId: string;
  speakerStatus: string;
  speakerElectionDeadline: string;
  speakerCitizenId: string;
  debateStartedAt: string;
  updatedAt: string;
};

export type SpeakerCandidateForBriefing = { itemId: string; citizenId: string };
export type SpeakerVoteForBriefing = { itemId: string; voterCitizenId: string };

export type AuditForBriefing = {
  id: string;
  itemId: string;
  eventType: string;
  description: string;
  metadataJson?: string;
  createdAt: string;
};

const task = (
  item: ParliamentItemForBriefing,
  options: Pick<BriefingTask, "id" | "detail" | "category" | "participation" | "focus" | "priority"> & {
    title: string; deadline?: string | null; realDeadline?: boolean; createdAt?: string;
  },
): BriefingTask => ({
  id: options.id,
  title: options.title,
  detail: item.serialCode + " · " + options.detail,
  deadline: options.deadline === undefined ? item.deadline || null : options.deadline,
  deadlineKind: options.realDeadline ? "deadline" : "expected",
  createdAt: options.createdAt || item.updatedAt || item.createdAt,
  category: options.category,
  participation: options.participation,
  focus: options.focus,
  priority: options.priority,
  actionable: true,
  completed: false,
  target: "parliament",
  targetId: item.id,
});

/** A citizen's CURRENT parliament affairs, not a chronological audit feed.
 * Only the server-authenticated account is passed into this function.
 * A stage can be ongoing without having an enforced deadline; never invent one.
 */
export function parliamentAffairsTasks(
  items: readonly ParliamentItemForBriefing[],
  ownVotes: readonly VoteForBriefing[],
  citizenId: string,
  meetings: readonly SpeakerMeetingForBriefing[] = [],
  candidates: readonly SpeakerCandidateForBriefing[] = [],
  speakerVotes: readonly SpeakerVoteForBriefing[] = [],
  now = Date.now(),
): BriefingTask[] {
  if (!citizenId) return [];
  const meetingById = new Map(meetings.map((meeting) => [meeting.itemId, meeting]));
  const tasks: BriefingTask[] = [];
  for (const item of items) {
    const meeting = meetingById.get(item.id);

    if (item.stage === "proposal") {
      tasks.push(task(item, {
        id: "parliament-proposal:" + item.id, category: "proposal",
        title: "新提案征询 · " + item.title,
        detail: "提案已开放，可查看并参与讨论",
        participation: "available", focus: "proposal",
        // TEMP QA ONLY: display this one existing proposal in red; no parliament data/state changes.
        priority: item.title === "国家基础制度框架案" ? "important" : "standard",
        createdAt: item.createdAt,
      }));
    }

    if (["debate", "amendment"].includes(item.stage)) {
      const closeAt = meeting?.speakerElectionDeadline
        ? Date.parse(meeting.speakerElectionDeadline) : Number.NaN;
      // The meeting can remain 'open' in D1 until an agenda request closes it.
      // Never advertise an expired election as an active opportunity.
      if (meeting?.speakerStatus === "open" && Number.isFinite(closeAt) && closeAt > now) {
        const hasRegistered = candidates.some(c => c.itemId === item.id && c.citizenId === citizenId);
        const hasVoted = speakerVotes.some(v => v.itemId === item.id && v.voterCitizenId === citizenId);
        const candidateCount = candidates.filter(c => c.itemId === item.id).length;
        tasks.push(task(item, {
          id: "speaker-election:" + item.id, category: "speaker-election",
          title: "议长选举开放 · " + item.title,
          detail: hasRegistered ? "你已登记参选；选举仍在进行" : "可报名成为本次会议的议长候选人",
          participation: "available", focus: "speaker",
          deadline: meeting.speakerElectionDeadline, realDeadline: true,
          createdAt: meeting.updatedAt,
        }));
        if (candidateCount > 0 && !hasVoted) {
          tasks.push(task(item, {
            id: "speaker-vote:" + item.id, category: "speaker-vote",
            title: "议长选举待投票 · " + item.title,
            detail: "已有候选人，点击进入本次会议投票",
            participation: "required", focus: "speaker",
            deadline: meeting.speakerElectionDeadline, realDeadline: true,
            createdAt: meeting.updatedAt,
          }));
        }
      }

      // 'debate' is the agenda stage; the actual live debate only begins
      // after the speaker explicitly announces it.
      if (meeting?.debateStartedAt) {
        tasks.push(task(item, {
          id: "parliament-debate:" + item.id, category: "debate",
          title: "正式辩论进行中 · " + item.title,
          detail: "议长已宣布开会，可进入议场发言或旁听",
          participation: "available", focus: "debate",
          createdAt: meeting.debateStartedAt,
        }));
      }
    }

    // Cast_vote presently allows all valid logged-in citizens; there is no
    // hard deadline enforcement in this stage. The existing item date is
    // labelled 'expected' until the parliament formally configures a cutoff.
    if (item.stage === "voting" && item.votingVersion !== null &&
      item.votingVersion > 0 && item.votingVersion === item.version &&
      !ownVotes.some(v => v.citizenId === citizenId && v.itemId === item.id &&
        v.documentVersion === item.votingVersion)
    ) {
      const referendum = item.kind === "referendum";
      tasks.push(task(item, {
        id: (referendum ? "referendum-vote:" : "parliament-vote:") + item.id,
        category: referendum ? "referendum" : "parliament-vote",
        title: (referendum ? "公投开放 · 待投票 · " : "议案正式表决 · 待投票 · ") + item.title,
        detail: referendum ? "公投进行中，请参与表决" : "正式表决已开始，你尚未投票",
        participation: "required", focus: "vote",
        createdAt: item.updatedAt,
      }));
    }
  }
  return tasks;
}

/** Compatibility helper for existing callers/tests: only pending ordinary votes. */
export function parliamentVotingTasks(
  items: readonly ParliamentItemForBriefing[],
  ownVotes: readonly VoteForBriefing[],
  citizenId: string,
): BriefingTask[] {
  return parliamentAffairsTasks(items, ownVotes, citizenId)
    .filter(item => item.category === "parliament-vote");
}

/** Public FINAL outcomes only. Parliamentary openings, live votes and current
 * debates belong to the personal affairs panel and never leak into Daily News.
 */
export function parliamentAuditNews(
  events: readonly AuditForBriefing[],
  items: readonly ParliamentItemForBriefing[],
): BriefingNews[] {
  const byItem = new Map(items.map(item => [item.id, item]));
  return events.flatMap(event => {
    const item = byItem.get(event.itemId);
    if (!item || !event.description.trim()) return [];

    let title = "";
    if (event.eventType === "stage_transition" && item.stage === "resolved") {
      try {
        const metadata = JSON.parse(event.metadataJson || "{}") as { to?: string };
        if (metadata.to === "resolved") title = "议案正式结案";
      } catch { /* malformed audit metadata is not a verified news event */ }
    } else if (event.eventType === "speaker_elected" || event.eventType === "speaker_tie_resolved" || event.eventType === "speaker_appointed") {
      title = "本次会议议长已产生";
    }
    if (!title) return [];
    return [{
      id: "parliament-result:" + event.id,
      title: title + " · " + item.serialCode,
      summary: event.description,
      category: "正式议会结果",
      publishedAt: event.createdAt,
      target: "parliament" as const,
      targetId: item.id,
    }];
  });
}
