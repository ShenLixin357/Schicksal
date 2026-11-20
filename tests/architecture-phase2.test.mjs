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
  assert.match(panel, /renderOfficialMark\(electedSpeaker\)/);
  assert.match(panel, /renderOfficialMark\(citizenFor\(request\.citizenId\)!\)/);
  assert.ok((panel.match(/renderOfficialMark\(/g)||[]).length >= 8);
  assert.match(page, /renderOfficialMark=\{member => <CitizenMark citizen=\{member\} display="official" \/>\}/);
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
  assert.match(room, /fetch\("\/api\/committee-club"/);
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

test("preserved Lounge styles now live outside globals and remain ordered after it", () => {
  const globals = read("app/globals.css");
  const lounge = read("app/club/lounge-scenes.css");
  const layout = read("app/layout.tsx");
  assert.doesNotMatch(globals,/Committee Restroom v16/);
  assert.match(lounge,/Committee Restroom v16/);
  assert.match(lounge,/Committee Lounge v19/);
  assert.match(lounge,/@keyframes clubVaseObjectIn/);
  assert.match(lounge,/@keyframes chryserAquariumBubble/);
  assert.ok(layout.indexOf('import "./globals.css";') < layout.indexOf('import "./club/lounge-scenes.css";'));
  assert.match(lounge,/\.lounge-module-loading/);
});

test("all private data routes and D1 table ownership remain untouched by this feature split", () => {
  const room = read("app/club/committee-lounge.tsx");
  const panel = read("app/parliament/parliament-section.tsx");
  assert.match(panel, /method: "POST"/);
  assert.match(room, /method: "POST"/);
  assert.doesNotMatch(read("app/page.tsx"), /"\/api\/parliament"|"\/api\/committee-club"/);
});
