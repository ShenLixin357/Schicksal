import test from "node:test";
import assert from "node:assert/strict";
import { parliamentAffairsTasks, parliamentVotingTasks, parliamentAuditNews } from "../app/briefing/briefing-feed.ts";
import { orderedBriefingTasks, latestNews } from "../app/briefing/briefing-data.ts";

function bill(id, stage = "voting", version = 3, votingVersion = 3, deadline = "2026-12-03") {
  return { id, serialCode: "P-" + id, title: "议案 " + id, summary: "测试",
    stage, version, votingVersion, deadline, createdAt: "2026-11-01", updatedAt: "2026-11-15" };
}

test("only valid open votes not cast by the signed-in member become tasks", () => {
  const items = [
    bill("unvoted", "voting", 3, 3, "2026-11-20"),
    bill("voted", "voting", 3, 3, "2026-11-19"),
    bill("draft", "proposal", 3, null, "2026-11-18"),
    bill("stale-text", "voting", 4, 3, "2026-11-17"),
    bill("done", "resolved", 3, 3, "2026-11-16"),
    bill("no-vote-version", "voting", 3, null, "2026-11-15"),
    bill("unconstrained", "voting", 3, 3, ""),
  ];
  const ownVotes = [
    { itemId: "voted", citizenId: "amberina", documentVersion: 3 },
    { itemId: "unvoted", citizenId: "other-member", documentVersion: 3 },
  ];
  assert.deepEqual(orderedBriefingTasks(parliamentVotingTasks(items, ownVotes, "amberina")).map(x => x.id),
    ["parliament-vote:unvoted", "parliament-vote:unconstrained"]);
  const tasks = parliamentVotingTasks([bill("a")], [], "amberina");
  assert.deepEqual(tasks[0].targetId, "a");
  assert.equal(parliamentVotingTasks(items, ownVotes, "").length, 0);
});

test("after a vote is recorded for the current document version, the pending task disappears", () => {
  const item = bill("v1");
  assert.equal(parliamentVotingTasks([item], [], "zxy").length, 1);
  assert.equal(parliamentVotingTasks([item], [{ itemId: "v1", citizenId: "zxy", documentVersion: 3 }], "zxy").length, 0);
  assert.equal(parliamentVotingTasks([item], [{ itemId: "v1", citizenId: "zxy", documentVersion: 2 }], "zxy").length, 1);
});

test("live parliament milestones belong to my affairs, not Daily News", () => {
  const now = Date.parse("2026-11-19T05:00:00+08:00");
  const items = [
    { ...bill("proposal", "proposal", 1, null), kind: "proposal" },
    { ...bill("election", "debate", 2, null), kind: "bill" },
    { ...bill("debate", "debate", 2, null), kind: "bill" },
    { ...bill("referendum", "voting", 2, 2), kind: "referendum" },
    { ...bill("resolved", "resolved", 2, 2), kind: "bill" },
  ];
  const meetings = [
    { itemId: "election", speakerStatus: "open", speakerElectionDeadline: "2026-11-20T06:00:00+08:00",
      speakerCitizenId: "", debateStartedAt: "", updatedAt: "2026-11-19T03:00:00+08:00" },
    { itemId: "debate", speakerStatus: "elected", speakerElectionDeadline: "",
      speakerCitizenId: "amberina", debateStartedAt: "2026-11-19T04:00:00+08:00", updatedAt: "2026-11-19T04:00:00+08:00" },
  ];
  const candidates = [{ itemId: "election", citizenId: "zxy" }];
  let tasks = parliamentAffairsTasks(items, [], "amberina", meetings, candidates, [], now);
  assert.deepEqual(tasks.map(x => x.id), [
    "parliament-proposal:proposal", "speaker-election:election", "speaker-vote:election",
    "parliament-debate:debate", "referendum-vote:referendum",
  ]);
  const election = tasks.find(x => x.id === "speaker-vote:election");
  assert.equal(election.deadlineKind, "deadline");
  assert.equal(election.deadline, meetings[0].speakerElectionDeadline);
  assert.equal(election.focus, "speaker");
  assert.equal(tasks.find(x=>x.id==="parliament-proposal:proposal").deadlineKind, "expected");
  assert.equal(tasks.find(x=>x.id==="parliament-debate:debate").deadlineKind, "expected");

  tasks = parliamentAffairsTasks(items, [], "amberina", meetings, candidates,
    [{ itemId: "election", voterCitizenId: "amberina" }], now);
  assert.equal(tasks.some(x => x.id === "speaker-vote:election"), false, "cast ballot clears pending speaker vote");
  assert.equal(tasks.some(x => x.id === "speaker-election:election"), true, "open nomination still visible");

  const expired = [{ ...meetings[0], speakerElectionDeadline: "2026-11-19T04:00:00+08:00" }];
  tasks = parliamentAffairsTasks(items, [], "amberina", expired, candidates, [], now);
  assert.equal(tasks.some(x => x.id.startsWith("speaker-")), false, "expired election is not actionable");
  assert.equal(parliamentAffairsTasks(items, [], "", meetings, candidates, [], now).length, 0, "anonymous person has no affairs");
});

test("news contains only final results, not an opening or a live ballot", () => {
  const items = [
    { ...bill("active", "debate"), kind: "bill" },
    { ...bill("done", "resolved"), kind: "bill" },
  ];
  const events = [
    { id: "proposal", itemId: "active", eventType: "submitted", description: "新提案", createdAt: "2026-11-03T00:00:00Z" },
    { id: "opened", itemId: "active", eventType: "speaker_election_opened", description: "议长选举开放", createdAt: "2026-11-04T00:00:00Z" },
    { id: "ballot", itemId: "active", eventType: "speaker_vote_cast", description: "议长投票", createdAt: "2026-11-04T02:00:00Z" },
    { id: "debate", itemId: "active", eventType: "debate_opened", description: "开会辩论", createdAt: "2026-11-05T00:00:00Z" },
    { id: "stage", itemId: "active", eventType: "stage_transition", metadataJson: '{"to":"voting"}', description: "进入表决", createdAt: "2026-11-06T00:00:00Z" },
    { id: "outcome", itemId: "done", eventType: "stage_transition", metadataJson: '{"to":"resolved"}', description: "正式结案", createdAt: "2026-11-07T00:00:00Z" },
    { id: "speaker", itemId: "active", eventType: "speaker_elected", description: "议长已当选", createdAt: "2026-11-08T00:00:00Z" },
    { id: "unknown", itemId: "missing", eventType: "speaker_elected", description: "不属于现有议案", createdAt: "2026-11-09T00:00:00Z" },
  ];
  const news = latestNews(parliamentAuditNews(events, items));
  assert.deepEqual(news.map(x => x.id), ["parliament-result:speaker", "parliament-result:outcome"]);
  assert.equal(news[0].targetId, "active");
  assert.equal(news.every(x => !/开放|投票|辩论/.test(x.title)), true);
  assert.equal(news.every(x => !x.title.includes("法律已生效")), true);
});

test("temporary red QA flag applies to the named foundation proposal only", () => {
  const foundation = { ...bill("foundation", "proposal", 1, null), title: "国家基础制度框架案" };
  const ordinary = { ...bill("other", "proposal", 1, null), title: "其他提案" };
  const items = parliamentAffairsTasks([foundation, ordinary], [], "amberina");
  assert.equal(items.find(x => x.targetId === "foundation").priority, "important");
  assert.equal(items.find(x => x.targetId === "other").priority, "standard");
  assert.equal(items.find(x => x.targetId === "foundation").deadlineKind, "expected");
  assert.equal(items.find(x => x.targetId === "foundation").actionable, true);
});
