import test from "node:test";
import assert from "node:assert/strict";
import { parliamentVotingTasks, parliamentAuditNews } from "../app/briefing/briefing-feed.ts";
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

test("only audited public milestone types are news, linked to their real item", () => {
  const items = [bill("one", "proposal")];
  const events = [
    { id: "a", itemId: "one", eventType: "submitted", description: "新的提案已提交", createdAt: "2026-11-03T00:00:00Z" },
    { id: "b", itemId: "one", eventType: "stage_transition", description: "由提案转为讨论", createdAt: "2026-11-04T00:00:00Z" },
    { id: "secret", itemId: "one", eventType: "speaker_vote_cast", description: "投票细节", createdAt: "2026-11-04T12:00:00Z" },
    { id: "orphan", itemId: "missing", eventType: "stage_transition", description: "未知议案", createdAt: "2026-11-05T00:00:00Z" },
  ];
  const news = latestNews(parliamentAuditNews(events, items));
  assert.deepEqual(news.map(x => x.id), ["parliament-audit:b", "parliament-audit:a"]);
  assert.equal(news[0].target, "parliament");
  assert.equal(news[0].targetId, "one");
  assert.equal(news.every(x => !x.title.includes("正式通过")), true);
});
