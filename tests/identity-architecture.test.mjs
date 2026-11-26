import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  PUBLIC_MEMBER_VISUALS, getPublicMemberVisual, PUBLIC_EMPIRE_ASSETS,
  ATLAS_DECORATIVE_FACETS, BRIEFING_WAVE_COLORS, BRIEFING_BACKDROP_COLORS,
} from "../app/identity/visual-registry.ts";
import { CITIZENS, citizenRepresentativeColor } from "../app/citizens.ts";
import {
  ATLAS_OFFICES, officeHolders, isCurrentPresident, currentOfficeLabel, withOfficeHolders,
} from "../app/identity/office-registry.ts";

const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("all eight stable member identities share a public visual registry, independent of Lounge", () => {
  assert.deepEqual(Object.keys(PUBLIC_MEMBER_VISUALS), CITIZENS.map(member => member.id));
  for (const citizen of CITIZENS) {
    const visual = getPublicMemberVisual(citizen.id);
    assert.ok(visual, `Missing public visual for ${citizen.id}`);
    assert.equal(citizen.accent, visual.emblemRayColor);
    assert.equal(citizen.markColor, citizen.id === "amberina" ? visual.officialMarkColor : visual.webMarkColor);
    assert.equal(citizenRepresentativeColor(citizen), visual.representativeColor);
    for (const key of ["representativeColor", "emblemRayColor", "webMarkColor", "officialMarkColor"])
      assert.match(visual[key], /^#[a-f\d]{6}$/i);
  }
  assert.equal(getPublicMemberVisual("unknown"), undefined);
  assert.equal(PUBLIC_MEMBER_VISUALS.amberina.representativeColor, "#F3ED87");
  assert.equal(PUBLIC_MEMBER_VISUALS.amberina.webMarkColor, "#EECF58");
  assert.equal(PUBLIC_MEMBER_VISUALS.amberina.officialMarkAsset, "/amberina-personal-simple-official.png");
  assert.equal(PUBLIC_MEMBER_VISUALS.amberina.webMarkAsset, "/amberina-personal-simple-gold-eecf58.png");
  assert.equal(PUBLIC_EMPIRE_ASSETS.atlasEmblem, "/atlas/approved-main-emblem.webp");
  assert.ok(!source("app/identity/visual-registry.ts").includes("LOUNGE_IDENTITIES"));
  assert.ok(!source("app/club/lounge-access.ts").includes("PUBLIC_MEMBER_VISUALS"));
});

test("decorative palettes remain visually identical but are centrally editable", () => {
  assert.deepEqual(ATLAS_DECORATIVE_FACETS, [
    "#f4d269", "#91c9f4", "#e8787d", "#7acb91", "#c3e9f0", "#e7b1cf", "#e9a866", "#b897df",
  ]);
  assert.deepEqual(BRIEFING_WAVE_COLORS, [
    "#e3bf61", "#679ad3", "#d98486", "#76ae94", "#b3d6e3", "#dba4bf", "#dea46c", "#9987ba",
  ]);
  assert.deepEqual(BRIEFING_BACKDROP_COLORS, [
    "#e0b95b", "#7ca7d4", "#d8878a", "#78b29c", "#abd2dd", "#d7a1c1", "#d9a26d", "#9887bd",
  ]);
  assert.match(source("app/atlas/atlas-data.ts"), /PUBLIC_MEMBER_VISUALS/);
  assert.match(source("app/atlas/schicksal-atlas.tsx"), /ATLAS_DECORATIVE_FACETS/);
  assert.match(source("app/briefing/briefing.tsx"), /BRIEFING_WAVE_COLORS/);
  assert.match(source("app/briefing/briefing-backdrop.tsx"), /BRIEFING_BACKDROP_COLORS/);
});

test("presidency is an office, not an account, mark color, or Lounge persona", () => {
  assert.deepEqual(officeHolders("president"), ["amberina"]);
  assert.ok(isCurrentPresident("amberina"));
  assert.ok(!isCurrentPresident("zxy"));
  const next = withOfficeHolders(ATLAS_OFFICES, "president", ["zxy"]);
  assert.deepEqual(officeHolders("president", next), ["zxy"]);
  assert.equal(isCurrentPresident("amberina", next), false);
  assert.equal(isCurrentPresident("zxy", next), true);
  const former = CITIZENS.find(c => c.id === "amberina");
  const elected = CITIZENS.find(c => c.id === "zxy");
  assert.equal(currentOfficeLabel(former, next), "Minister of Technology", "leaving presidency does not erase another current office");
  assert.equal(currentOfficeLabel(elected, next), "President of the First Empire");
  assert.equal(citizenRepresentativeColor(former), "#F3ED87");
  assert.equal(citizenRepresentativeColor(elected), "#D7263D");
  assert.deepEqual(officeHolders("president"), ["amberina"], "simulation must never mutate current offices");
  assert.throws(() => withOfficeHolders(ATLAS_OFFICES, "nonexistent", ["zxy"]), /Unknown office/);
  assert.throws(() => withOfficeHolders(ATLAS_OFFICES, "president", ["zxy", "zxy"]), /Invalid/);
});

test("new modules can import registries without bringing in private scene or database", () => {
  for (const path of ["app/identity/visual-registry.ts", "app/identity/office-registry.ts"]) {
    const code = source(path);
    assert.doesNotMatch(code, /from ["'][^"']*(?:club|api|db|server|cloudflare|\.css)/);
  }
  const page = source("app/page.tsx");
  assert.match(page, /isCurrentPresident\(blade\.citizenId\)/);
  assert.match(page, /currentOfficeLabel\(citizen,offices\)/);
  assert.match(page, /\/api\/offices\/current/);
  assert.match(page, /const SchicksalAtlas = lazy\(\(\) => import\("\.\/atlas\/schicksal-atlas"\)/);
  assert.match(page, /const AtlasGovernmentHandbook = lazy\(\(\) => import\("\.\/atlas\/government-handbook"\)/);
  assert.match(page, /mandatory-briefing-gate/);
});

test("public mark/compact emblem renderers are reusable without copying Lounge marks", () => {
  const page = source("app/page.tsx");
  const mark = source("app/identity/public-mark.tsx");
  const compact = source("app/emblem/compact-emblem.tsx");
  assert.match(page, /import \{ PublicCitizenMark as CitizenMark \}/);
  assert.match(page, /import \{ CompactEmpireEmblem as Emblem \}/);
  assert.doesNotMatch(page, /function CitizenMark\(/);
  assert.match(mark, /export function PublicCitizenMark/);
  assert.match(mark, /getPublicMemberVisual\(citizen\.id\)/);
  assert.match(mark, /isCurrentPresident\(citizen\.id\)/);
  assert.match(mark, /<Image src=\{markAsset\}/);
  assert.match(compact, /export function CompactEmpireEmblem/);
  assert.match(compact, /EMBLEM_BLADES\.map/);
  assert.match(compact, /className=\{`emblem /);
  assert.doesNotMatch(compact, /mafraer|LOUNGE_IDENTITIES|MysticSigil/);
});
