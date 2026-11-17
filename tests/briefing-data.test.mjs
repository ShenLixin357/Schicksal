import test from "node:test";
import assert from "node:assert/strict";
import {
  BRIEFING_SEEN_SESSION_KEY, briefingDateTime, briefingDeadlineInfo, foundingNews, latestNews, latestUnreadMessages,
  markBriefingViewed, orderedBriefingTasks,
} from "../app/briefing/briefing-data.ts";

const task = (id, deadline, extra = {}) => ({
  id, title: "Task " + id, detail: "test", deadline,
  actionable: true, completed: false, target: "parliament", ...extra,
});

test("briefing tasks are deadline ordered, missing deadlines last, and inactive tasks filtered", () => {
  const tasks = [
    task("later", "2026-11-25T12:00:00+08:00"),
    task("no-date", null),
    task("soon", "2026-11-19T12:00:00+08:00"),
    task("closed", "2026-11-18T12:00:00+08:00", { actionable: false }),
    task("done", "2026-11-18T13:00:00+08:00", { completed: true }),
    task("expired-but-actionable", "2026-11-17T12:00:00+08:00"),
  ];
  assert.deepEqual(orderedBriefingTasks(tasks).map(({ id }) => id),
    ["expired-but-actionable", "soon", "later", "no-date"]);
  assert.equal(tasks[0].id, "later", "must not mutate caller array");
});

test("briefing takes only the two newest unread messages without mutating input", () => {
  const messages = [
    { id: "a", sender: "A", preview: "a", receivedAt: "2026-11-15T00:00:00Z", conversationId: "1" },
    { id: "b", sender: "B", preview: "b", receivedAt: "2026-11-17T00:00:00Z", conversationId: "2" },
    { id: "c", sender: "C", preview: "c", receivedAt: "2026-11-16T00:00:00Z", conversationId: "3" },
  ];
  assert.deepEqual(latestUnreadMessages(messages).map(({ id }) => id), ["b", "c"]);
  assert.equal(messages[0].id, "a");
});

test("all news is retained and date ordered; nothing is silently discarded", () => {
  const news = Array.from({ length: 12 }, (_, i) => ({
    id: String(i), title: String(i), summary: "", category: "test", target: null,
    publishedAt: new Date(Date.UTC(2026, 10, i + 1)).toISOString(),
  }));
  const ordered = latestNews(news);
  assert.equal(ordered.length, 12);
  assert.equal(ordered[0].id, "11");
  assert.equal(ordered.at(-1).id, "0");
  assert.equal(foundingNews[0].id, "restoration-2026-08-15");
});

test("one automatic display per login marker; new login marker displays again", () => {
  const memory = new Map();
  const storage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => { memory.set(key, value); } };
  assert.equal(markBriefingViewed(storage, "session-A"), true);
  assert.equal(markBriefingViewed(storage, "session-A"), false);
  assert.equal(memory.get(BRIEFING_SEEN_SESSION_KEY), "session-A");
  assert.equal(markBriefingViewed(storage, "session-B"), true);
});

test("date-only expected dates use the end of the UTC+8 calendar day", () => {
  assert.equal(briefingDateTime("2026-11-18"), Date.parse("2026-11-18T23:59:59.999+08:00"));
  assert.equal(briefingDeadlineInfo("2026-11-18", Date.parse("2026-11-18T12:00:00+08:00")).passed, false);
  assert.equal(briefingDeadlineInfo("2026-11-18", Date.parse("2026-11-19T00:00:00+08:00")).passed, true);
  assert.match(briefingDeadlineInfo("2026-11-18").label, /2026年11月18日/);
});
