import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("both external arcade games run inside current signed-in Lounge without document navigation", () => {
  const room=read("app/club/game-room.tsx");
  const cabinet=read("app/club/game-room-catalogue.ts");
  const lounge=read("app/club/committee-lounge.tsx");
  assert.match(cabinet,/id: "ice-fire".*href: "\/games\/fireboy-watergirl\?from=game-room"/);
  assert.match(cabinet,/id: "aquarium".*href: "\/games\/aquarium\?from=game-room"/);
  assert.match(lounge, /<GameRoom emblemBlades=\{EMBLEM_BLADES\}/);
  assert.match(room, /const \[routeGame, setRouteGame\] = useState<StandaloneGameId \| null>\(null\)/);
  assert.match(room,/lazy\(\(\) => import\("\.\.\/games\/fireboy-watergirl\/game-frame"\)/);
  assert.match(room,/lazy\(\(\) => import\("\.\.\/games\/aquarium\/aquarium-game"\)/);
  assert.match(room,/const openRouteGame = \(id: string\) =>/);
  assert.match(room,/onClick=\{\(\) => openRouteGame\(game\.id\)\}/);
  assert.match(room,/if \(routeGame\) return createPortal\(/);
  assert.match(room,/document\.body/);
  assert.match(room,/data-lounge-embedded-game=\{routeGame\}/);
  assert.match(room,/onBack=\{\(\) => setRouteGame\(null\)\}/);
  assert.match(room,/EmbeddedGameBoundary/);
  assert.match(room,/getDerivedStateFromError/);
  assert.match(room,/返回游戏室/);
  assert.doesNotMatch(room,/href=\{game\.href\}|rememberGameRoomReturn|window\.location\.|location\.assign|location\.replace/);
});

test("standalone direct game entry remains available but no longer controls Lounge return", () => {
  const fire=read("app/games/fireboy-watergirl/game-frame.tsx");
  const water=read("app/games/aquarium/aquarium-game.tsx");
  const fireEntry=read("app/games/fireboy-watergirl/page.tsx");
  const aquaEntry=read("app/games/aquarium/page.tsx");
  const cabinet=read("app/club/game-room.tsx");
  assert.match(fire,/onBack\?: \(\) => void/);
  assert.match(water,/onBack\?: \(\) => void/);
  assert.match(fire,/onBack \? <button type="button" onClick=\{onBack\}/);
  assert.match(water,/\{onBack \? <button type="button" onClick=\{onBack\}/);
  assert.match(fire,/src=\{source!\}/);
  assert.match(water,/src="\/games\/insaniquarium\/index\.html"/);
  assert.match(fireEntry,/<FireboyWatergirlFrame \/>/);
  assert.match(aquaEntry,/<AquariumGame \/>/);
  assert.doesNotMatch(cabinet,/<a\s+className=\{\`cabinet-game/);
});

test("game error fallback and game styles are isolated, keyboard-usable and reversible", () => {
  const css=read("app/club/game-room-embed.css");
  const room=read("app/club/game-room.tsx");
  const fire=read("app/games/fireboy-watergirl/game-frame.tsx");
  const aqua=read("app/games/aquarium/aquarium-game.tsx");
  assert.match(css,/\.lounge-embedded-game\s*\{/);
  assert.match(css,/position: fixed/);
  assert.match(css,/z-index: 1200/);
  assert.match(css,/overscroll-behavior: contain/);
  assert.match(room,/import "\.\/game-room-embed\.css";/);
  assert.match(room,/onClick=\{this\.props\.onExit\}/);
  assert.match(room,/role="alert"/);
  assert.match(room,/Suspense fallback=/);
  assert.match(fire,/type="button" onClick=\{onBack\}/);
  assert.match(aqua,/type="button" onClick=\{onBack\}/);
  assert.match(read("app/club/game-room-catalogue.ts"),/kind: "route"/);
  // Do not change original imported game data / WASM / art while fixing navigation.
  assert.match(fire,/\/games\/\$\{chosen\}\/index\.html/);
  assert.match(aqua,/\/games\/insaniquarium\/index\.html/);
});

test("mandatory briefing and authenticated Worker boundaries are retained for true new visits", () => {
  const page=read("app/page.tsx");
  const access=read("app/standalone-access.ts");
  const session=read("app/member-session-core.ts");
  assert.match(page,/type Phase = "opening" \| "login" \| "welcome" \| "system"/);
  assert.match(page,/readyForMandatoryBriefing\(preload, citizen\.id\)/);
  assert.match(access,/const pageRequest = !path\.startsWith\("\/api\/"\)/);
  assert.match(session,/HttpOnly; Path=\/; SameSite=Lax/);
  const room=read("app/club/game-room.tsx");
  assert.doesNotMatch(room,/\/api\/member-session|setPhase|setCitizen|logout|window\.location/);
});
