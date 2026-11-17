import type { BriefingNews, BriefingTask } from "./briefing-data";

export type ParliamentItemForBriefing = {
  id: string;
  serialCode: string;
  title: string;
  summary: string;
  stage: string;
  votingVersion: number | null;
  version: number;
  deadline: string;
  createdAt: string;
  updatedAt: string;
};

export type VoteForBriefing = {
  itemId: string;
  citizenId: string;
  documentVersion: number;
};

export type AuditForBriefing = {
  id: string;
  itemId: string;
  eventType: string;
  description: string;
  createdAt: string;
};

// Match the CURRENT server-side cast_vote guard: this feature does not invent
// a separate eligibility policy or assume a draft is an enacted law.
export function parliamentVotingTasks(
  items: readonly ParliamentItemForBriefing[],
  ownVotes: readonly VoteForBriefing[],
  citizenId: string,
): BriefingTask[] {
  if (!citizenId) return [];
  return items.filter((item) =>
    item.stage === "voting" && item.votingVersion !== null &&
    item.votingVersion > 0 && item.votingVersion === item.version &&
    !ownVotes.some((vote) =>
      vote.citizenId === citizenId && vote.itemId === item.id &&
      vote.documentVersion === item.votingVersion
    )
  ).map((item) => ({
    id: "parliament-vote:" + item.id,
    title: item.title,
    detail: item.serialCode + " · 正式表决尚未投票",
    deadline: item.deadline || null,
    deadlineKind: "expected" as const,
    actionable: true,
    completed: false,
    target: "parliament",
    targetId: item.id,
  }));
}

const PUBLIC_NEWS_EVENTS: Record<string, { title: string; category: string }> = {
  submitted: { title: "新的议案已提交", category: "议会动态" },
  stage_transition: { title: "议案程序已更新", category: "议会动态" },
};

// Public, audited changes only; don't turn every procedural click into
// a headline. Importantly, this never claims a proposal became law.
export function parliamentAuditNews(
  events: readonly AuditForBriefing[],
  items: readonly ParliamentItemForBriefing[],
): BriefingNews[] {
  const byItem = new Map(items.map((item) => [item.id, item]));
  return events.flatMap((event) => {
    const kind = PUBLIC_NEWS_EVENTS[event.eventType];
    const item = byItem.get(event.itemId);
    if (!kind || !item || !event.description.trim()) return [];
    return [{
      id: "parliament-audit:" + event.id,
      title: kind.title + " · " + item.serialCode,
      summary: event.description,
      category: kind.category,
      publishedAt: event.createdAt,
      target: "parliament" as const,
      targetId: item.id,
    }];
  });
}
