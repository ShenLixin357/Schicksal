import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const briefing = readFileSync(new URL("../app/briefing/briefing.tsx", import.meta.url), "utf8");
const backdrop = readFileSync(new URL("../app/briefing/briefing-backdrop.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/briefing/briefing.css", import.meta.url), "utf8");

test("briefing uses the same compact eight-ray mark as the existing website navigation", () => {
  assert.match(page, /<div className="side-brand"><Emblem compact \/>/);
  assert.match(page, /heroMark=\{<Emblem compact \/>\}/);
  assert.doesNotMatch(page, /heroMark=\{<HeroEmblemSculpture/);
  assert.match(css, /imperial-briefing-emblem-art > \.emblem\.compact/);
});

test("the milky-ivory canvas keeps eight-colour waves and has only gently tinted ovals", () => {
  assert.match(briefing, /<BriefingBackdrop\/>/);
  assert.match(briefing, /<div className="imperial-briefing-paper">\s*<BriefingBackdrop\/>/);
  assert.match(briefing, /<div className="imperial-briefing-desk">\s*<BriefingBackdrop\/>/);
  assert.match(backdrop, /palette = \[/);
  assert.match(backdrop, /palette\.map\(/);
  assert.match(backdrop, /<radialGradient /);
  assert.match(backdrop, /<ellipse /);
  assert.match(backdrop, /className="imperial-briefing-oval-group"/);
  assert.doesNotMatch(backdrop, /<polygon /);
  assert.doesNotMatch(backdrop, /imperial-briefing-facet-group/);
  assert.match(briefing, /imperial-briefing-oval-halo/);
  assert.doesNotMatch(briefing, /imperial-briefing-arcade/);
  assert.match(css, /#faf8f2/);
  assert.match(css, /pointer-events:none/);
});
