import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PROFILE_CRYSTAL_RATIO, profileCrystalCoordinates, profileCrystalPath,
} from "../app/emblem/crystal-geometry.ts";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("one crystal exactly follows the 4.236 / 0.618 geometry", () => {
  const point = profileCrystalCoordinates(34, 0);
  assert.equal(point.maximumWidth, 34);
  assert.equal(point.totalLength, 34 * 4.236);
  assert.ok(Math.abs((point.innerY-point.outerY)/(point.rightX-point.leftX)-4.236)<1e-10);
  assert.equal(PROFILE_CRYSTAL_RATIO.maxWidthFromOuter, .618);
  assert.equal(PROFILE_CRYSTAL_RATIO.outerToInner, 1.618);
  assert.ok(Math.abs((point.shoulderY-point.outerY)/point.totalLength-.618)<1e-10);
  assert.ok(Math.abs((point.shoulderY-point.outerY)/(point.innerY-point.shoulderY)-1.618)<.001);
  assert.equal(profileCrystalPath(point), `M 0 ${point.outerY} L ${point.rightX} ${point.shoulderY} L 0 ${point.innerY} L ${point.leftX} ${point.shoulderY} Z`);
});

test("self-profile has ONE officially coloured blade plus unchanged Simple mark", () => {
  const profile = read("app/profile/profile-page.tsx");
  const crystal = read("app/profile/profile-crystal-emblem.tsx");
  const css = read("app/profile/profile-crystal.css");
  assert.match(profile, /<ProfileCrystalEmblem color=\{citizenRepresentativeColor\(citizen\)\}\/>\{renderMark\}/);
  assert.match(crystal, /profileCrystalPath\(coordinates\)/);
  assert.match(crystal, /data-crystal-count="1"/);
  assert.match(crystal, /fill=\{color\}/);
  assert.doesNotMatch(crystal, /EMBLEM_BLADES|\.map\(|rotate\(\$\{blade\.angle\}|profile-crystal-core-ring/);
  assert.match(crystal, /import "\.\/profile-crystal\.css"/);
  assert.match(css, /\.profile-crystal-emblem/);
  assert.doesNotMatch(css, /(^|\n)\s*\.(?:sidebar|club-|lounge-|emblem-3d-)/);
  assert.ok(!crystal.includes("MafraerLounge"));
});

test("sidebar uses owner-approved compact widths while preserving original label size and color", () => {
  const layout=read("app/navigation-layout.css");
  const original=read("app/globals.css");
  const shell=read("app/shell/shell.css");
  const root=read("app/entry.css");
  assert.match(layout, /--sidebar-width: 224px/);
  assert.match(layout, /--sidebar-width: 192px/);
  assert.match(layout, /--sidebar-width: 64px/);
  assert.match(original, /min-height: 49px/);
  assert.match(shell, /min-height:49px/);
  assert.match(shell, /padding:0 9px/);
  assert.match(shell, /font-size:\.74rem/);
  assert.match(shell, /font-size:6px/);
  assert.match(shell, /color:#505d70/);
  assert.match(root, /--sans: Inter, ui-sans-serif, -apple-system/);
  assert.match(root, /--serif: Georgia, "Times New Roman", "Noto Serif SC"/);
  assert.match(shell, /font-family:var\(--sans\)/);
  assert.match(shell, /min-height:54px/);
  assert.doesNotMatch(shell, /imperial-nav-copy > strong \{ font-size:\.(?:67|6)rem/);
});
