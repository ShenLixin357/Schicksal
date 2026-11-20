import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PROFILE_CRYSTAL_RATIO, profileCrystalCoordinates, profileCrystalPath,
} from "../app/emblem/crystal-geometry.ts";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("each personal-page kite is 4.236 times as long as its full width", () => {
  const point = profileCrystalCoordinates(20, 20);
  assert.equal(point.maximumWidth, 20);
  assert.equal(point.totalLength, 84.72);
  assert.ok(Math.abs((point.innerY-point.outerY) / (point.rightX-point.leftX) - 4.236) < 1e-10);
  assert.equal(PROFILE_CRYSTAL_RATIO.lengthToMaxWidth, 4.236);
  assert.equal(PROFILE_CRYSTAL_RATIO.maxWidthFromOuter, 0.618);
  assert.equal(PROFILE_CRYSTAL_RATIO.outerToInner, 1.618);
  assert.ok(Math.abs((point.shoulderY-point.outerY) / point.totalLength - 0.618) < 1e-10);
  assert.ok(Math.abs((point.shoulderY-point.outerY) / (point.innerY-point.shoulderY) - 1.618) < .001);
  assert.match(profileCrystalPath(point), /^M 0 -104\.72 L 10 -52\.36 L 0 -20 L -10 -52\.36 Z$/);
  assert.throws(() => profileCrystalCoordinates(0,20), RangeError);
  assert.throws(() => profileCrystalCoordinates(20,-2), RangeError);
});

test("the profile adds diamonds beside the approved personal mark and isolates styling", () => {
  const profile=read("app/profile/profile-page.tsx");
  const badge=read("app/profile/profile-crystal-emblem.tsx");
  const css=read("app/profile/profile-crystal.css");
  assert.match(profile, /<ProfileCrystalEmblem citizenId=\{citizen\.id\}\/>\{renderMark\}/);
  assert.match(badge, /EMBLEM_BLADES\.map/);
  assert.match(badge, /profileCrystalPath\(coordinates\)/);
  assert.match(badge, /transform=\{\`translate\(120 120\) rotate/);
  assert.match(badge, /import "\.\/profile-crystal\.css"/);
  assert.match(css, /\.profile-crystal-emblem/);
  assert.doesNotMatch(css, /(^|\n)\s*\.(?:sidebar|club-|lounge-|emblem-3d-)/);
  assert.ok(!badge.includes("MafraerLounge"));
});

test("navigation width and type scale preserve original main site across screen sizes", () => {
  const layout=read("app/navigation-layout.css");
  const shell=read("app/shell/shell.css");
  assert.match(layout, /--sidebar-width: 248px/);
  assert.match(layout, /--sidebar-width: 200px/);
  assert.match(layout, /--sidebar-width: 64px/);
  assert.match(shell, /min-height:49px/);
  assert.match(shell, /font:500 \.74rem\/1\.4 var\(--sans\)/);
  assert.match(shell, /font:400 6px\/1\.3 var\(--sans\)/);
  assert.doesNotMatch(shell, /imperial-nav-copy > strong \{ font-size:\.(?:67|6)rem/);
});
