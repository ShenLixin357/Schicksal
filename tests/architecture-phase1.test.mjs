import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("homepage moved out of the page coordinator and still uses the canonical eight rays", () => {
  const home = read("app/home/home-section.tsx");
  const page = read("app/page.tsx");
  const emblem = read("app/emblem/blade-spec.ts");
  assert.match(home, /export function HomeSection/);
  assert.match(home, /<HeroEmblemSculpture blades=\{EMBLEM_BLADES\}/);
  assert.match(home, /READ THE RESTORATION RECORD/);
  assert.match(page, /import \{ HomeSection \} from "\.\/home\/home-section"/);
  assert.doesNotMatch(page, /function HomeSection\(/);
  assert.match(emblem, /CITIZENS\.map\(\(citizen, index\)/);
  assert.match(emblem, /color: citizen\.accent/);
  assert.match(emblem, /angle: index \* 45/);
  assert.match(page, /import \{ EMBLEM_BLADES \} from "\.\/emblem\/blade-spec"/);
});

test("photo archive still accesses the exact authenticated photo API and uses existing badges", () => {
  const photos = read("app/photos/photo-archive.tsx");
  const page = read("app/page.tsx");
  assert.match(photos, /export function PhotoArchiveSection/);
  assert.match(photos, /fetch\("\/api\/photos"\)/);
  assert.match(photos, /method: "POST"/);
  assert.match(photos, /12 \* 1024 \* 1024/);
  assert.match(photos, /subjectKey === activeFilterKey/);
  assert.match(photos, /renderCitizenMark: \(subject: Citizen\) => ReactNode/);
  assert.match(photos, /sharedMark: ReactNode/);
  assert.doesNotMatch(photos, /<Emblem compact/);
  assert.doesNotMatch(photos, /<CitizenMark citizen/);
  assert.match(page, /<PhotoArchiveSection citizen=\{citizen\} sharedMark=\{<Emblem compact \/>\}/);
  assert.match(page, /const PhotoArchiveSection = lazy\(\(\) => import\("\.\/photos\/photo-archive"\)/);
  assert.doesNotMatch(page, /function PhotoArchiveSection\(/);
});

test("national archives preserve the original cover, content URLs and author emblem", () => {
  const archive = read("app/archives/archive-section.tsx");
  const page = read("app/page.tsx");
  assert.match(archive, /export function ArchivesSection/);
  assert.match(archive, /archive-queen-cover\.png/);
  assert.match(archive, /how-to-build-a-state-lesson-1\.md/);
  assert.match(archive, /how-to-build-a-state-lesson-2-a\.md/);
  assert.match(archive, /how-to-build-a-state-lesson-2-b\.md/);
  assert.match(archive, /archiveMarkdownToHtml\(chapterText\)/);
  assert.match(archive, /authorMarkColor/);
  assert.match(page, /authorMark=\{<CitizenMark citizen=\{CITIZENS\[0\]\} \/>\}/);
  assert.match(page, /const ArchivesSection = lazy\(\(\) => import\("\.\/archives\/archive-section"\)/);
  assert.match(page, /<FeatureSuspense label="国家档案馆">/);
  assert.doesNotMatch(page, /function ArchivesSection\(/);
});

test("feature styles now have their own source files without touching approved palette overrides", () => {
  const css = read("app/globals.css");
  const home = read("app/home/home.css");
  const photos = read("app/photos/photo-archive.css");
  assert.match(css, /@import "\.\/home\/home\.css";/);
  assert.match(css, /@import "\.\/photos\/photo-archive\.css";/);
  assert.match(home, /\.hero-emblem/);
  assert.match(home, /\.status-grid/);
  assert.match(photos, /\.photo-filters/);
  assert.match(photos, /\.photo-card/);
  assert.doesNotMatch(css, /^\.photo-filters \{/m);
  assert.doesNotMatch(css, /^\.home-section \{/m);
  // Original light-palette overrides still have priority over dark prototypes.
  assert.match(css, /\.status-grid > article \{ background: linear-gradient\(145deg,rgba\(255,255,255,\.76\)/);
});

test("the approved UI remains protected by mandatory briefing and Lodge identity checks", () => {
  const page = read("app/page.tsx");
  const shell = read("app/shell/imperial-sidebar.tsx");
  assert.match(read("app/club/lounge-access.ts"), /CLUB_MEMBER_IDS = new Set\(\["amberina", "zxy", "truth"\]\)/);
  assert.match(page, /import \{ CLUB_MEMBER_IDS, announceCommitteeLounge \} from "\.\/club\/lounge-access";/);
  assert.match(page, /mandatory-briefing-gate/);
  assert.match(page, /readyForMandatoryBriefing\(preload, citizen\.id\)/);
  assert.match(shell, /disabled=\{!canEnterLounge && !loungeOpen\}/);
  assert.match(page, /<ImperialSidebar/);
  assert.match(page, /<LoungePassage/);
});
