import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = name => readFileSync(new URL(name, root), "utf8");
const blobSha = name => {
  const bytes = readFileSync(new URL(name, root));
  return createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
};

// Exact Git blob digests from the approved phase-2 baseline. These are a
// deliberate freeze of scene art CSS, not generic "golden screenshot" guesses.
const approvedCss = {
  "app/club/lounge-scenes.css": "723bd4ea52c259a408f64447588a73c5292b840b",
  "app/club/lounge-v15.css": "c242e05ee1845751385fc84d3a070526fd873260",
  "app/club/lounge-core.css": "1521546168ad93a9a0f223edec28f4dca4d0dc85",
  "app/club/lounge-magic.css": "2826de1655ba382751862c35c409e20a1ef7e8b8",
  "app/parliament/parliament-scenes.css": "a5e206a7dfb2e45929d813cfa9fec0fafe4bb4ae",
  "app/transitions/lounge-passage.css": "89ce93f2c47ba957f2d4843882fa9be3efc304f2",
};

test("room art and transition styles stay byte-identical to approved phase 2", () => {
  for (const [path, expected] of Object.entries(approvedCss))
    assert.equal(blobSha(path), expected, `${path} was unexpectedly repainted; request separate visual approval`);
});

test("all room transitions invalidate stale network callbacks on unmount", () => {
  const journey = read("app/club/use-room-journeys.ts");
  const lounge = read("app/club/committee-lounge.tsx");
  assert.match(lounge, /useRoomJourneys\(\{/);
  assert.doesNotMatch(journey, /historyRequestRef|historyAbortRef|committee_club_messages|member_direct_messages/);
  for (const name of ["fanTravelRef", "globeTravelRef", "musicBoxTravelRef", "fireplaceTravelRef"]) {
    assert.match(journey, new RegExp(`\\b${name}\\.current \\+= 1`), `unmount must invalidate ${name}`);
    assert.match(lounge, new RegExp(`request !== ${name}\\.current`), `stale completion must be guarded: ${name}`);
  }
  for (const name of ["fanDeadlineRef", "fireplaceDeadlineRef", "globeDeadlineRef"]) {
    assert.ok(journey.includes(`if (${name}.current !== null) window.clearTimeout(${name}.current)`), `unmount must clear ${name}`);
    assert.ok(journey.includes(`${name}.current = window.setTimeout(() =>`), `hung image must time out: ${name}`);
  }
});

test("scene loading uses bounded image decoding, without altering approved timings", () => {
  const journey = read("app/club/use-room-journeys.ts");
  const passage = read("app/transitions/lounge-passage.tsx");
  assert.match(journey, /const minimum = window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches \? 280 : 2600/);
  assert.match(journey, /const cycle = window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches \? 240 : FAN_CYCLE_MS/);
  assert.match(passage, /const ENTER_DURATION = 4000/);
  assert.match(passage, /Click anywhere \(or press Escape\) to skip/);
  assert.match(journey, /fireplaceDeadlineRef\.current = window\.setTimeout\(\(\) => complete\(false\), 12000\)/);
  assert.match(journey, /fanDeadlineRef\.current = window\.setTimeout\(\(\) => completePassage\(false\), 12000\)/);
});

test("game engines remain demand-loaded from an independent room boundary", () => {
  const lounge = read("app/club/committee-lounge.tsx");
  const shell = read("app/page.tsx");
  const mini = read("app/club/minigames/use-mini-game-system.ts");
  for (const chunk of ["./mafraer-lounge", "./chryser-lounge", "./wordmage-lounge", "./game-room", "./minigames/mini-game-system", "./minigames/lounge-leaderboard"]) {
    assert.ok(lounge.includes(`lazy(() => import("${chunk}")`), `must keep code-split chunk ${chunk}`);
  }
  const journeys = read("app/club/use-room-journeys.ts");
  const assets = read("app/club/mafraer-assets.ts");
  const bedroom = read("app/club/mafraer-lounge.tsx");
  assert.match(assets, /mafraer-ice-bedroom-moonlit-v4\\.png/);
  assert.match(assets, /mafraer-ice-bedroom-lit-v4\\.png/);
  assert.match(journeys, /from "\\.\\/mafraer-assets"/);
  assert.doesNotMatch(journeys, /from "\\.\\/mafraer-lounge"/);
  assert.match(bedroom, /from "\\.\\/mafraer-assets"/);
  assert.match(shell, /lazy\(\(\) => import\("\.\/club\/committee-lounge"\)/);
  assert.doesNotMatch(mini, /from ["']\.\/mini-game-system|from ["']\.\/lounge-leaderboard/);
});
