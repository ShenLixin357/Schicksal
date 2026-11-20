import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("original 3D helix renders at full fidelity while visible and stops offscreen", () => {
  const main = read("app/emblem/hero-emblem-sculpture.tsx");
  const material = read("app/emblem/hero-emblem-sculpture.css");
  assert.match(main, /new IntersectionObserver/);
  assert.match(main, /document\.visibilityState === "visible"/);
  assert.match(main, /document\.addEventListener\("visibilitychange"/);
  assert.match(main, /document\.removeEventListener\("visibilitychange"/);
  assert.match(main, /observer\?\.disconnect\(\)/);
  assert.match(main, /startedAt \+= now - pausedAt/);
  assert.match(main, /MOTION\.cycleMs/);
  assert.match(main, /blade\.style\.setProperty\("--helix-x"/);
  assert.match(main, /blade\.style\.setProperty\("--blade-tilt-x"/);
  assert.match(main, /reduceMotion\.matches/);
  assert.match(material, /\.blade-facet-left/);
  assert.match(material, /\.blade-facet-right/);
  assert.match(material, /\.blade-ridge/);
  assert.doesNotMatch(main, /setInterval/);
});

test("user-initiated magical passages concurrently prewarm JavaScript chunks", () => {
  const journeys = read("app/club/use-room-journeys.ts");
  const lounge = read("app/club/committee-lounge.tsx");
  const options = [
    ["amberina","mafraer-lounge"],["chryser","chryser-lounge"],
    ["truth","wordmage-lounge"],["game-room","game-room"],
  ];
  for (const [room,chunk] of options) {
    assert.ok(journeys.includes('import("./'+chunk+'")'), chunk + " should warm during travel");
    assert.ok(journeys.includes('warmDestination("'+room+'")'), room + " should start warming from a click");
    assert.ok(lounge.includes('lazy(() => import("./'+chunk+'")'), chunk + " must remain genuinely lazy");
  }
  assert.match(journeys, /background\.decode\(\)/);
  assert.match(journeys, /fanDeadlineRef\.current/);
  assert.match(journeys, /fireplaceDeadlineRef\.current/);
  assert.match(journeys, /globeDeadlineRef\.current/);
});

test("the heavyweight private CSS is imported with Lounge only and never re-encoded", () => {
  const root = read("app/layout.tsx");
  const lounge = read("app/club/committee-lounge.tsx");
  const scenes = read("app/club/lounge-scenes.css");
  const page = read("app/page.tsx");
  assert.ok(!root.includes('import "./club/lounge-scenes.css";'));
  assert.ok(lounge.includes('import "./lounge-scenes.css";'));
  assert.match(page, /const CommitteeLounge = lazy\(/);
  assert.match(scenes, /Committee Restroom v16/);
  assert.match(scenes, /Committee Lounge v19/);
  assert.ok(Buffer.byteLength(scenes) > 140_000);
  assert.match(scenes, /\.lounge-module-loading/);
});
