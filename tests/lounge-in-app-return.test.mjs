import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("both Forest Temple and aquarium stay in the authenticated GameRoom", () => {
  const room=read("app/club/game-room.tsx");
  const cabinet=read("app/club/game-room-catalogue.ts");
  const lounge=read("app/club/committee-lounge.tsx");
  assert.match(cabinet,/id: "ice-fire".*href: "\/games\/fireboy-watergirl\?from=game-room"/);
  assert.match(cabinet,/id: "aquarium".*href: "\/games\/aquarium\?from=game-room"/);
  assert.match(lounge, /<GameRoom emblemBlades=\{EMBLEM_BLADES\}/);
  assert.match(room, /const \[routeGame, setRouteGame\] = useState<ArcadeRoute \| null>\(null\)/);
  assert.match(room, /const openRouteGame = \(id: string\) =>/);
  assert.match(room, /onClick=\{\(\) => openRouteGame\(game\.id\)\}/);
  assert.match(room, /if \(routeGame\) return <EmbeddedArcade key=\{routeGame\} game=\{routeGame\} onClose=\{\(\) => setRouteGame\(null\)\}/);
  assert.doesNotMatch(room,/href=\{game\.href\}|rememberGameRoomReturn|window\.location\.|location\.assign|location\.replace/);
});

test("Chryser aquarium uses the same in-app callback instead of a root navigation", () => {
  const room=read("app/club/chryser-lounge.tsx");
  assert.match(room,/import \{ EmbeddedArcade \} from "\.\/embedded-arcade"/);
  assert.match(room,/const \[aquariumOpen, setAquariumOpen\] = useState\(false\)/);
  assert.match(room,/if \(aquariumOpen\) return <EmbeddedArcade game="aquarium" onClose=\{\(\) => setAquariumOpen\(false\)\}/);
  assert.match(room,/className="chryser-aquarium"[^>]*onClick=\{\(\) => setAquariumOpen\(true\)\}/);
  assert.doesNotMatch(room,/<a className="chryser-aquarium" href="\/games\/aquarium"/);
});

test("shared lazy arcade catches game chunk errors and returns without re-login", () => {
  const overlay=read("app/club/embedded-arcade.tsx");
  const css=read("app/club/game-room-embed.css");
  assert.match(overlay,/type ArcadeRoute = "ice-fire" \| "aquarium"/);
  assert.match(overlay,/lazy\(\(\) => import\("\.\.\/games\/fireboy-watergirl\/game-frame"\)/);
  assert.match(overlay,/lazy\(\(\) => import\("\.\.\/games\/aquarium\/aquarium-game"\)/);
  assert.match(overlay,/createPortal\(/);
  assert.match(overlay,/document\.body/);
  assert.match(overlay,/data-lounge-embedded-game=\{game\}/);
  assert.match(overlay,/onBack=\{onClose\}/);
  assert.match(overlay,/getDerivedStateFromError/);
  assert.match(overlay,/onClick=\{this\.props\.onClose\}/);
  assert.match(overlay,/Suspense fallback=/);
  assert.match(css,/position: fixed/);
  assert.match(css,/z-index: 1200/);
  assert.match(css,/overscroll-behavior: contain/);
  assert.doesNotMatch(overlay,/window\.location|location\.assign|location\.replace|fetch\("\/api\/member-session"/);
});

test("standalone game URLs and original HTML engines remain available", () => {
  const fire=read("app/games/fireboy-watergirl/game-frame.tsx");
  const aqua=read("app/games/aquarium/aquarium-game.tsx");
  assert.match(fire,/onBack\?: \(\) => void/);
  assert.match(aqua,/onBack\?: \(\) => void/);
  assert.match(fire,/onBack \? <button type="button" onClick=\{onBack\}/);
  assert.match(aqua,/\{onBack \? <button type="button" onClick=\{onBack\}/);
  assert.match(fire,/src=\{source!\}/);
  assert.match(aqua,/src="\/games\/insaniquarium\/index\.html"/);
  assert.match(read("app/games/fireboy-watergirl/page.tsx"),/<FireboyWatergirlFrame \/>/);
  assert.match(read("app/games/aquarium/page.tsx"),/<AquariumGame \/>/);
  assert.match(fire,/\/games\/\$\{chosen\}\/index\.html/);
});

test("mandatory briefing and private Worker session boundaries stay enforced on true new visits", () => {
  const page=read("app/page.tsx");
  const access=read("app/standalone-access.ts");
  const session=read("app/member-session-core.ts");
  assert.match(page,/type Phase = "opening" \| "login" \| "welcome" \| "system"/);
  assert.match(page,/readyForMandatoryBriefing\(preload, citizen\.id\)/);
  assert.match(access,/const pageRequest = !path\.startsWith\("\/api\/"\)/);
  assert.match(session,/HttpOnly; Path=\/; SameSite=Lax/);
  const overlay=read("app/club/embedded-arcade.tsx");
  assert.doesNotMatch(overlay,/\/api\/member-session|setPhase|setCitizen|logout|window\.location/);
});


test("module chunk errors return to signed-in shell instead of forcing re-login", () => {
  const feature=read("app/shell/feature-suspense.tsx");
  const page=read("app/page.tsx");
  assert.match(feature,/type FeatureProps = \{ label: string; children: ReactNode; onExit: \(\) => void; lounge\?: boolean \}/);
  assert.match(feature,/onClick=\{this\.props\.onExit\}/);
  assert.doesNotMatch(feature,/window\.location\.reload\(\)/);
  for (const label of ["天命图谱","帝国政务","家庭影像馆","国家档案馆"]) {
    assert.ok(page.includes('<FeatureSuspense label="'+label+'" onExit={() => setSection("home")}>'), label+" must recover locally");
  }
  assert.match(page, /<FeatureSuspense label="委员会 Lounge" onExit=\{\(\) => setSection\("home"\)\} lounge>/);
  assert.match(page, /<FeatureSuspense label="政务手册" onExit=\{\(\)=>setAtlasHandbookOpen\(false\)\}>/);
});
