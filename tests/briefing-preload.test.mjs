import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseBriefingFeed } from "../app/briefing/briefing-loader.ts";
import { readyForMandatoryBriefing, mayMountSiteAfterBriefing } from "../app/briefing/mandatory-entry.ts";

const source = path => readFileSync(new URL(path, import.meta.url), "utf8");
const emptyLiveFeed = () => ({ tasks: [], news: [], views: { pending: [], participated: [], missed: [], archived: [] } });

test("preload rejects incomplete or malformed live affairs instead of showing stale placeholders", () => {
  const feed = emptyLiveFeed();
  assert.deepEqual(parseBriefingFeed(feed), feed);
  for (const invalid of [null, {}, { tasks: [], news: [] }, { tasks: [], news: [], views: { pending: [] } }]) {
    assert.throws(() => parseBriefingFeed(invalid), /Malformed/);
  }
});

test("mandatory gate rejects all non-ready, mismatched or unverified preloads", () => {
  const good = { status: "ready", citizenId: "amberina", sessionKey: "verified-session-A", feed: emptyLiveFeed() };
  assert.equal(readyForMandatoryBriefing(good, "amberina"), true);
  for (const attempt of [
    { status: "loading", citizenId: "amberina", feed: good.feed, sessionKey: good.sessionKey },
    { status: "error", citizenId: "amberina", feed: good.feed, sessionKey: good.sessionKey },
    { ...good, citizenId: "zxy" },
    { ...good, sessionKey: "" },
    { ...good, feed: null },
    { ...good, feed: undefined },
  ]) {
    assert.equal(readyForMandatoryBriefing(attempt, "amberina"), false);
  }
  // Even when the fresh feed is ready, a not-yet-dismissed briefing keeps
  // the HOME, sidebar, parliament and Lounge entirely unmounted.
  assert.equal(mayMountSiteAfterBriefing(true), false);
  assert.equal(mayMountSiteAfterBriefing(false), true);
});

test("every authenticated entry waits for live feed AND server-verified identity", () => {
  const page = source("../app/page.tsx");
  const hook = source("../app/briefing/use-briefing-feed.ts");
  assert.match(page, /Promise\.all\(\[\s*fetchBriefingFeed\(controller\.signal\)/);
  assert.match(page, /result\.citizenId !== citizen\.id/);
  assert.match(page, /!result\.briefingSessionKey/);
  assert.match(page, /if \(!readyForMandatoryBriefing\(preload, citizen\.id\)\) return;/);
  assert.match(page, /useState\(true\)/);
  assert.match(page, /setSystemBriefing\(\{ feed: preload\.feed \}\)/);
  assert.match(page, /if \(phase === "welcome" \|\| !systemBriefing\)/);
  assert.match(page, /initialBriefing=\{systemBriefing\.feed\}/);
  assert.match(hook, /useState<BriefingFeed>\(initialFeed \?\?/);
  assert.match(hook, /if \(skipFirstFetch\.current\)/);
});

test("briefing renders as the ONLY post-welcome UI until explicitly acknowledged", () => {
  const page = source("../app/page.tsx");
  assert.match(page, /if \(!mayMountSiteAfterBriefing\(entryBriefingPending\)\) return <main className="mandatory-briefing-gate">\{briefingDialog\}<\/main>;/);
  assert.match(page, /const briefingDialog = \([\s\S]*?<BriefingOverlay[\s\S]*?<\/main>;/);
  assert.match(page, /setEntryBriefingPending\(false\)/);
  assert.match(page, /onClose=\{dismissBriefing\}/);
  assert.match(page, /onOpenDesk=\{openBriefingDesk\}/);
  assert.match(page, /onNavigate=\{navigateFromBriefing\}/);
  const gatedReturn = page.indexOf('return <main className="mandatory-briefing-gate">');
  const siteReturn = page.indexOf('return (\n    <main className={`system');
  assert.ok(gatedReturn >= 0 && siteReturn > gatedReturn, "mandatory gate returns before the main site shell can render");
  // The private game-return hint moved to its own adapter. It must not
  // bypass the mandatory post-login briefing gate.
  assert.match(page, /if \(wantsGameRoomReturn\(window\)\)/);
  const returnHint = source("../app/club/game-room-return.ts");
  assert.match(returnHint, /get\("lounge"\) === "game-room"/);
  assert.ok(page.indexOf("if (wantsGameRoomReturn(window))") < gatedReturn,
    "game-room restoration can set a target, but cannot render it before the briefing gate");
  assert.doesNotMatch(page, /setSystemBriefing\(\{ feed: preload\.feed, show: false \}\)/);
  assert.doesNotMatch(page, /setPhase\("system"\); return;/);
});

test("a failed briefing preload cannot open the site; only Retry is offered", () => {
  const page = source("../app/page.tsx");
  const html = page.slice(page.indexOf("function Welcome("),page.indexOf("function CitizenEmblem("));
  assert.match(html, /preloadStatus === "error"/);
  assert.match(html, /onClick=\{retry\}/);
  assert.doesNotMatch(page, /ENTER WITHOUT BRIEFING|enterWithoutBriefing|markBriefingViewed|BRIEFING_SEEN_SESSION_KEY/);
  assert.doesNotMatch(page, /setPhase\("system"\); return;/);
  assert.equal((page.match(/setPhase\("system"\)/g) ?? []).length, 1,
    "the verified preload gate is the only path to the system phase");
});

test("anonymous login embeds approved image without making private static files public", () => {
  const entry = source("../app/entry-screen.ts");
  const boundary = source("../app/standalone-access.ts");
  const privacy = source("../app/private-login.ts");
  assert.match(entry, /assets\/amberina-login-mark-official\.png\?inline/);
  assert.match(entry, /amberinaMarkAt\("login-entry-picker"\)/);
  assert.match(entry, /citizen-mark personal-simple/);
  assert.match(entry, /background-image:url/);
  assert.match(privacy, /img-src data:/);
  assert.doesNotMatch(boundary, /path === "\/amberina-personal-simple/);
});
