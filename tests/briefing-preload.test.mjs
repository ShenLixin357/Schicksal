import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseBriefingFeed } from "../app/briefing/briefing-loader.ts";

const source = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("preload rejects incomplete or malformed live affairs instead of showing stale placeholders", () => {
  const views = { pending: [], participated: [], missed: [], archived: [] };
  assert.deepEqual(parseBriefingFeed({ tasks: [], news: [], views }), { tasks: [], news: [], views });
  for (const invalid of [null, {}, { tasks: [], news: [] }, { tasks: [], news: [], views: { pending: [] } }]) {
    assert.throws(() => parseBriefingFeed(invalid), /Malformed/);
  }
});

test("Welcome prepares server-verified feed before System and automatic overlay appear", () => {
  const page = source("../app/page.tsx");
  const hook = source("../app/briefing/use-briefing-feed.ts");
  assert.match(page, /Promise\.all\(\[\s*fetchBriefingFeed\(controller\.signal\)/);
  assert.match(page, /result\.citizenId !== citizen\.id/);
  assert.match(page, /preload\.status !== "ready"/);
  assert.match(page, /useState\(initialBriefingOpen\)/);
  assert.match(page, /initialBriefing=\{systemBriefing\.feed\}/);
  assert.match(hook, /useState<BriefingFeed>\(initialFeed \?\?/);
  assert.match(hook, /if \(skipFirstFetch\.current\)/);
  assert.match(page, /get\("lounge"\) === "game-room"/);
});

test("anonymous login embeds approved image without making private static files public", () => {
  const entry = source("../app/entry-screen.ts");
  const boundary = source("../app/standalone-access.ts");
  const privacy = source("../app/private-login.ts");
  assert.match(entry, /assets\/amberina-login-mark\.png\?inline/);
  assert.match(entry, /citizen-mark personal-simple/);
  assert.match(entry, /background-image:url/);
  assert.match(privacy, /img-src data:/);
  assert.doesNotMatch(boundary, /path === "\/amberina-personal-simple/);
});
