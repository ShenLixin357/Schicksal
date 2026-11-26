import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const sigil = readFileSync("app/club/mystic-marks.tsx", "utf8");
const css = readFileSync("app/club/no2-lounge-scythe.css", "utf8");
const asset = readFileSync("public/no2-lounge-purple-scythe.webp");

test("No.2 is bound to the animated purple-scythe Lounge sigil", () => {
  assert.match(sigil, /memberId === "zxy"[\s\S]*?mystic-shadow-scythe/);
  assert.match(sigil, /no2-scythe-art/);
  assert.doesNotMatch(sigil, /mystic-ember-flame/);
  assert.match(sigil, /memberId === "amberina"/);
  assert.match(sigil, /mystic-field/);
});

test("small, transparent WebP asset and CSS motion contract remain in place", () => {
  assert.equal(asset.toString("ascii", 0, 4), "RIFF");
  assert.equal(asset.toString("ascii", 8, 12), "WEBP");
  assert.ok(statSync("public/no2-lounge-purple-scythe.webp").size < 30000);
  assert.match(css, /no2ScytheVioletFire/);
  assert.match(css, /no2ScytheEdgeGlint/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\/no2-lounge-purple-scythe\.webp/);
});
