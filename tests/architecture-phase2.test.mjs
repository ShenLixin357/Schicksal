import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("first-site bundle excludes heavy parliament and Lounge scene implementation", () => {
  const page = read("app/page.tsx");
  assert.match(page, /const PersistentParliamentSection = lazy\(\(\) => import\("\.\/parliament\/parliament-section"\)/);
  assert.match(page, /const CommitteeLounge = lazy\(\(\) => import\("\.\/club\/committee-lounge"\)/);
  assert.match(page, /<FeatureSuspense label="帝国政务">/);
  assert.match(page, /<FeatureSuspense label="委员会 Lounge">/);
  assert.doesNotMatch(page, /function PersistentParliamentSection\(/);
  assert.doesNotMatch(page, /function CommitteeLounge\(/);
  assert.match(page, /if \(!mayMountSiteAfterBriefing\(entryBriefingPending\)\)/);
});

test("parliament view has its own existing wire types and keeps all official marks", () => {
  const panel = read("app/parliament/parliament-section.tsx");
  const types = read("app/parliament/parliament-types.ts");
  const page = read("app/page.tsx");
  assert.match(panel, /export function PersistentParliamentSection/);
  assert.match(panel, /fetch\("\/api\/parliament"/);
  assert.match(panel, /SpeakerManagement/);
  assert.match(panel, /renderOfficialMark\(electedSpeaker, "parliament-speaker-election"\)/);
  assert.match(panel, /renderOfficialMark\(citizenFor\(request\.citizenId\)!, "parliament-comment-request"\)/);
  assert.ok((panel.match(/renderOfficialMark\(/g)||[]).length >= 8);
  assert.match(page, /renderOfficialMark=\{\(member, placement\) => <CitizenMark citizen=\{member\} placement=\{placement\} \/> \}/);
  for (const type of ["ParliamentStage","ParliamentItem","ParliamentVote","ParliamentSession","ParliamentBoard"])
    assert.match(types,new RegExp("export type "+type+"\\b"));
  assert.doesNotMatch(panel, /from "\.\.\/api\//);
});

test("Lounge authorization survives code splitting and unauthorized logo remains inert", () => {
  const access = read("app/club/lounge-access.ts");
  const room = read("app/club/committee-lounge.tsx");
  const page = read("app/page.tsx");
  const sidebar = read("app/shell/imperial-sidebar.tsx");
  assert.match(access, /CLUB_MEMBER_IDS = new Set\(\["amberina", "zxy", "truth"\]\)/);
  assert.match(access, /export function announceCommitteeLounge/);
  assert.match(room, /export function CommitteeLounge/);
  assert.match(room, /from "\.\/lounge-api"/);
  assert.match(read("app/club/lounge-api.ts"), /const endpoint = "\/api\/committee-club"/);
  assert.match(room, /MafraerLounge/);
  assert.match(page, /if \(!CLUB_MEMBER_IDS\.has\(citizen\.id\) \|\| portal\) return/);
  assert.match(page, /else if \(CLUB_MEMBER_IDS\.has\(citizen\.id\)\) enterLounge\(\)/);
  assert.match(sidebar, /disabled=\{!canEnterLounge && !loungeOpen\}/);
});

test("game selector is lightweight and private scenes/engines load on demand", () => {
  const lounge = read("app/club/committee-lounge.tsx");
  const hook = read("app/club/minigames/use-mini-game-system.ts");
  const games = read("app/club/minigames/mini-game-system.tsx");
  assert.match(hook,/export function useMiniGameSystem/);
  assert.doesNotMatch(hook,/LoungeSolitaire|MiniGameShell|mini-game-registry/);
  assert.match(games,/export function MiniGameSystem/);
  assert.doesNotMatch(games,/export function useMiniGameSystem/);
  for(const path of ["chryser-lounge","wordmage-lounge","game-room","minigames/mini-game-system","minigames/lounge-leaderboard"])
    assert.ok(lounge.includes('lazy(() => import("./'+path+'")'),"No lazy chunk for "+path);
  assert.match(lounge,/import \{ useMiniGameSystem \} from "\.\/minigames\/use-mini-game-system";/);
});

test("preserved Lounge scene CSS loads with its lazy route instead of global entry", () => {
  const globals = read("app/globals.css");
  const lounge = read("app/club/lounge-scenes.css");
  const layout = read("app/layout.tsx");
  assert.doesNotMatch(globals,/Committee Restroom v16/);
  assert.match(lounge,/Committee Restroom v16/);
  assert.match(lounge,/Committee Lounge v19/);
  assert.match(lounge,/@keyframes clubVaseObjectIn/);
  assert.match(lounge,/@keyframes chryserAquariumBubble/);
  const ordered = [
    "./globals.css", "./club/lounge-core.css",
    "./parliament/parliament-workspace.css", "./archives/archive-reader.css",
    "./parliament/parliament-scenes.css", "./club/lounge-v15.css",
  ];
  const indices = ordered.map(path => layout.indexOf('import "'+path+'";'));
  assert.ok(indices.every((value,index) => value >= 0 && (index === 0 || value > indices[index-1])), "existing global CSS import order must remain stable");
  assert.ok(!layout.includes('import "./club/lounge-scenes.css";'));
  assert.ok(read("app/club/committee-lounge.tsx").includes('import "./lounge-scenes.css";'));
  assert.match(read("app/club/lounge-core.css"), /Committee Restroom — member-only Halloween club/);
  assert.match(read("app/parliament/parliament-workspace.css"), /Persistent parliament workspace/);
  assert.match(read("app/archives/archive-reader.css"), /National Archives: the authored record/);
  assert.match(read("app/parliament/parliament-scenes.css"), /Parliament v13/);
  assert.match(read("app/club/lounge-v15.css"), /Committee Restroom v15/);
  assert.ok(globals.split("\\n").length < 360);
  assert.match(lounge,/\.lounge-module-loading/);
});

test("all private data routes and D1 table ownership remain untouched by this feature split", () => {
  const room = read("app/club/committee-lounge.tsx");
  const panel = read("app/parliament/parliament-section.tsx");
  assert.match(panel, /method: "POST"/);
  // Phase D moves transport into a typed client adapter. The presentation
  // no longer constructs POST requests or claims an authenticated member ID.
  const loungeTransport = read("app/club/lounge-api.ts");
  assert.match(loungeTransport, /method: "POST"/);
  assert.match(room, /postCommitteeAction/);
  assert.doesNotMatch(room, /fetch\(/);
  assert.doesNotMatch(read("app/page.tsx"), /"\/api\/parliament"|"\/api\/committee-club"/);
});

test("deferred feature errors are recoverable and cannot bypass the mandatory briefing", () => {
  const suspense = read("app/shell/feature-suspense.tsx");
  assert.match(suspense, /class FeatureLoadBoundary extends Component/);
  assert.match(suspense, /getDerivedStateFromError/);
  assert.match(suspense, /window.location.reload\(\)/);
  assert.match(suspense, /<FeatureLoadBoundary key=\{label\}/);
  assert.match(read("app/page.tsx"), /mandatory-briefing-gate/);
});
