import test from "node:test";
import assert from "node:assert/strict";
import { buildInboxViews, affairCycleKey } from "../app/briefing/affairs-history.ts";
import { parliamentAffairsTasks } from "../app/briefing/briefing-feed.ts";
import { orderedBriefingTasks } from "../app/briefing/briefing-data.ts";

const now = Date.parse("2026-11-19T08:00:00+08:00");
function item(id, stage, extras = {}) {
  return { id, serialCode:"P-" + id, title:"议案 " + id, summary:"",
    kind:"bill", outcome:"pending", stage, votingVersion:2, version:2,
    deadline:"", createdAt:"2026-11-10T00:00:00+08:00",
    updatedAt:"2026-11-18T00:00:00+08:00", ...extras };
}
test("archived active items keep their original card/DDL and return as pending when restored", () => {
  const proposal = item("p","proposal");
  const voting = item("v","voting");
  const items = [proposal,voting];
  const live = parliamentAffairsTasks(items,[],"amberina",[],[],[],now);
  const activeVote = live.find(t => t.category === "parliament-vote");
  assert.ok(activeVote);
  const key = affairCycleKey(activeVote,voting);
  const archivedAt = "2026-11-18T08:00:00+08:00";
  const views = buildInboxViews(live,items,[],[],[],[],[{taskId:key,archivedAt}],"amberina",now);
  assert.equal(views.pending.some(t => t.targetId === "v"),false);
  assert.equal(views.archived[0].targetId,"v");
  assert.equal(views.archived[0].cycleKey,key);
  assert.equal(views.archived[0].deadline,null);
  const restored = buildInboxViews(live,items,[],[],[],[],[],"amberina",now);
  assert.equal(restored.pending.some(t => t.targetId === "v"),true);
});
test("expired speaker ballot moves to missed even before lazy election finalization", () => {
  const election = item("speaker","debate",{votingVersion:null});
  const deadline = "2026-11-19T07:59:59+08:00";
  const meetings = [{itemId:"speaker",speakerStatus:"open",speakerElectionDeadline:deadline,
    speakerCitizenId:"",debateStartedAt:"",updatedAt:"2026-11-17T12:00:00+08:00"}];
  const candidates = [{itemId:"speaker",citizenId:"zxy",createdAt:"2026-11-18T08:00:00+08:00"}];
  const live = parliamentAffairsTasks([election],[],"amberina",meetings,candidates,[],now);
  assert.equal(live.length,0,"past real deadline must not be actionable");
  const archived = [{taskId:"speaker-vote:speaker:"+deadline,archivedAt:"2026-11-18T08:00:00+08:00"}];
  const views = buildInboxViews(live,[election],[],meetings,candidates,[],archived,"amberina",now);
  assert.equal(views.archived.length,0,"expired archived opportunity leaves archive");
  assert.equal(views.missed.length,1,"closed unvoted speaker opportunity is missed");
});
test("closed ordinary vote is missed without inventing a hard DDL", () => {
  const resolved=item("resolved","resolved",{outcome:"passed"});
  const views=buildInboxViews([], [resolved],[],[],[],[],[],"amberina",now);
  assert.equal(views.missed.length,1);
  assert.equal(views.missed[0].deadline,null);
});
test("participation panel shows recent 30 days only, while older records remain in parliament", () => {
  const voting=item("v","resolved",{outcome:"passed"});
  const recent={itemId:"v",citizenId:"amberina",documentVersion:2,
    createdAt:"2026-11-18T08:00:00+08:00",updatedAt:"2026-11-18T08:00:00+08:00"};
  const older={...recent,updatedAt:"2026-09-01T08:00:00+08:00",
    createdAt:"2026-09-01T08:00:00+08:00"};
  const shown=buildInboxViews([], [voting],[recent],[],[],[],[],"amberina",now);
  assert.equal(shown.participated.length,1);
  assert.equal(shown.missed.length,0);
  const hidden=buildInboxViews([], [voting],[older],[],[],[],[],"amberina",now);
  assert.equal(hidden.participated.length,0);
  assert.equal(hidden.missed.length,0,"older vote remains on record and is not counted missed");
});
test("priority is important red, then true sub-48h yellow, then standard white", () => {
  const base=(id,deadline,priority="standard")=>({
    id,title:id,detail:id,category:"parliament-vote",priority,
    deadline,deadlineKind:"deadline",target:"parliament",
    actionable:true,completed:false,
  });
  const tasks=[
    base("ordinary","2026-11-30T10:00:00+08:00"),
    base("urgent","2026-11-20T08:00:00+08:00"),
    base("important","2026-12-30T08:00:00+08:00","important"),
  ];
  assert.deepEqual(orderedBriefingTasks(tasks,now).map(t=>t.id),
    ["important","urgent","ordinary"]);
});
