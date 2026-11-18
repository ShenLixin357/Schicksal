import { briefingDateTime, type BriefingTask } from "./briefing-data";
import type {
  ParliamentItemForBriefing, SpeakerCandidateForBriefing, SpeakerMeetingForBriefing,
  SpeakerVoteForBriefing, VoteForBriefing,
} from "./briefing-feed";

export type InboxViews = {
  pending: BriefingTask[];
  participated: BriefingTask[];
  missed: BriefingTask[];
  archived: BriefingTask[];
};

export type ArchiveRow = { taskId: string; archivedAt: string };

type DatedVote = VoteForBriefing & { createdAt?: string; updatedAt?: string };
type DatedCandidate = SpeakerCandidateForBriefing & { createdAt?: string };
type DatedSpeakerVote = SpeakerVoteForBriefing & { createdAt?: string; updatedAt?: string };

const withinDays = (date: string, now: number, days: number) => {
  const when = briefingDateTime(date);
  return Number.isFinite(when) && when <= now && when >= now - days * 86_400_000;
};

// Stable per-stage identity avoids a restored archive hiding an entirely new
// speaker-election round or a newer frozen parliamentary ballot version.
export function affairCycleKey(task: BriefingTask, item: ParliamentItemForBriefing, meeting?: SpeakerMeetingForBriefing) {
  if (task.category === "speaker-vote" || task.category === "speaker-election") {
    return task.id + ":" + (meeting?.speakerElectionDeadline || "");
  }
  if (task.category === "parliament-vote" || task.category === "referendum") {
    return task.id + ":v" + (item.votingVersion ?? item.version);
  }
  if (task.category === "debate") return task.id + ":" + (meeting?.debateStartedAt || "");
  return task.id;
}

export function buildInboxViews(
  liveTasks: readonly BriefingTask[],
  items: readonly ParliamentItemForBriefing[],
  ownVotes: readonly DatedVote[],
  meetings: readonly SpeakerMeetingForBriefing[],
  candidates: readonly DatedCandidate[],
  ownSpeakerVotes: readonly DatedSpeakerVote[],
  archivedRows: readonly ArchiveRow[],
  citizenId: string,
  now = Date.now(),
): InboxViews {
  const byItem = new Map(items.map(item => [item.id, item]));
  const meetingByItem = new Map(meetings.map(m => [m.itemId, m]));
  const archiveMap = new Map(archivedRows.map(row => [row.taskId, row.archivedAt]));
  const pending: BriefingTask[] = [], archived: BriefingTask[] = [];
  for (const live of liveTasks) {
    const item = live.targetId ? byItem.get(live.targetId) : undefined;
    if (!item) continue;
    const cycleKey = affairCycleKey(live, item, meetingByItem.get(item.id));
    const entry = { ...live, cycleKey };
    const archivedAt = archiveMap.get(cycleKey);
    if (archivedAt) archived.push({ ...entry, archivedAt });
    else pending.push(entry);
  }

  const participated: BriefingTask[] = [], missed: BriefingTask[] = [];
  const completed = (item: ParliamentItemForBriefing, category: BriefingTask["category"],
    stamp: string, title: string, detail: string, deadline: string | null, realDeadline = false): BriefingTask => ({
      id: "completed:" + category + ":" + item.id + ":" + stamp,
      title, detail: item.serialCode + " · " + detail, category,
      deadline, deadlineKind: realDeadline ? "deadline" : "expected",
      completedAt: stamp, actionable: false, completed: true,
      target: "parliament", targetId: item.id, focus: category === "speaker-vote" ? "speaker" : "vote",
    });
  for (const vote of ownVotes) {
    if (vote.citizenId !== citizenId) continue;
    const item = byItem.get(vote.itemId);
    const stamp = vote.updatedAt || vote.createdAt || "";
    if (!item || !withinDays(stamp, now, 30)) continue;
    const referendum = item.kind === "referendum";
    participated.push(completed(item, referendum ? "referendum" : "parliament-vote", stamp,
      item.title, "你已参与正式表决 · 文稿版本 v" + vote.documentVersion, item.deadline || null));
  }
  for (const vote of ownSpeakerVotes) {
    if (vote.voterCitizenId !== citizenId) continue;
    const item = byItem.get(vote.itemId), meeting = meetingByItem.get(vote.itemId);
    const stamp = vote.updatedAt || vote.createdAt || "";
    if (!item || !withinDays(stamp, now, 30)) continue;
    participated.push(completed(item, "speaker-vote", stamp, "议长选举 · " + item.title,
      "你已投出议长选票", meeting?.speakerElectionDeadline || null, true));
  }
  for (const candidate of candidates) {
    if (candidate.citizenId !== citizenId) continue;
    const item = byItem.get(candidate.itemId), meeting = meetingByItem.get(candidate.itemId);
    const stamp = candidate.createdAt || "";
    if (!item || !withinDays(stamp, now, 30)) continue;
    participated.push(completed(item, "speaker-election", stamp, "议长候选登记 · " + item.title,
      "你已登记参选", meeting?.speakerElectionDeadline || null, true));
  }

  for (const meeting of meetings) {
    const item = byItem.get(meeting.itemId);
    const deadline = meeting.speakerElectionDeadline;
    const cutoff = briefingDateTime(deadline || null);
    // 'not_configured' covers cancellations; an assigned speaker with no
    // actual election is never counted as a missed voting opportunity.
    if (!item || !Number.isFinite(cutoff) || cutoff > now ||
      !["elected", "tie_pending"].includes(meeting.speakerStatus) ||
      !candidates.some(candidate => candidate.itemId === item.id) ||
      ownSpeakerVotes.some(v => v.itemId === item.id && v.voterCitizenId === citizenId)) continue;
    missed.push({
      id: "missed:speaker-vote:" + item.id + ":" + deadline,
      title: "议长选举 · " + item.title,
      detail: item.serialCode + " · 选举已截止，你没有投票",
      deadline, deadlineKind: "deadline", category: "speaker-vote",
      actionable: false, completed: false, target: "parliament", targetId: item.id, focus: "speaker",
    });
  }
  participated.sort((a, b) => briefingDateTime(b.completedAt || null) - briefingDateTime(a.completedAt || null));
  missed.sort((a, b) => briefingDateTime(b.deadline) - briefingDateTime(a.deadline));
  archived.sort((a, b) => briefingDateTime(b.archivedAt || null) - briefingDateTime(a.archivedAt || null));
  return { pending, participated, missed, archived };
}
