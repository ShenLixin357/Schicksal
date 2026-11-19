import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(p)=>readFileSync(new URL(p,import.meta.url),"utf8");
const css=read("../app/oat-sage-theme.css");
const layout=read("../app/layout.tsx");
const page=read("../app/page.tsx");
const briefing=read("../app/briefing/briefing.css");
const base=read("../app/globals.css");
const entry=read("../app/entry.css");

test("oat/off-white palette replaces the over-green preview in an isolated last-imported layer",()=>{
  assert.match(css,/--oat-bg:\s*#ecede4/);
  assert.match(css,/--oat-card:\s*#f5f4ed/);
  assert.match(css,/--oat-leaf:\s*#d8e4ce/);
  assert.match(css,/\.sidebar \{\s*background:linear-gradient\(170deg,#f4f3ec,#f1f2ea\)/);
  assert.doesNotMatch(css,/#789274|#647c67|#dfe8d8|#d6e5cc|#a8bd9f|#465e4c/i);
  assert.match(layout,/import "\.\/oat-sage-theme\.css";/);
  assert.ok(layout.indexOf('import "./oat-sage-theme.css"')>layout.indexOf('import "./club/lounge-magic.css"'));
  assert.match(css,/\.system:not\(\.club-system\)/);
  assert.doesNotMatch(css,/\.club-system\s+\.sidebar/);
  assert.doesNotMatch(css,/\.profile(?:\s|[,.:{>])/);
});
test("no invented coloured backplate on Amberina's personal Simple; rings and office dots remain",()=>{
  assert.match(css,/\.login \.citizen-mark\.personal-simple/);
  assert.match(css,/\.welcome \.citizen-mark\.personal-simple/);
  assert.match(css,/\.system:not\(\.club-system\) \.citizen-mark\.personal-simple \{\s*background:transparent;\s*box-shadow:none;/);
  assert.match(entry,/\.citizen-mark::before/);
  assert.match(base,/\.citizen-mark\.leader::after/);
  assert.doesNotMatch(css,/\.citizen-mark\.personal-simple[^}]*radial-gradient/);
});
test("red/yellow semantic statuses, personal identities and illustrated scenes are untouched",()=>{
  assert.match(page,/function CitizenMark/);
  assert.match(page,/amberina-personal-simple-web753\.png/);
  assert.match(page,/amberina-personal-simple-official\.png/);
  assert.match(page,/electedSpeaker && <CitizenMark citizen=\{electedSpeaker\} display="official"/);
  assert.match(briefing,/imperial-briefing-wave-embroidery/);
  assert.doesNotMatch(css,/\.affair-urgent|\.affair-important|\.imperial-briefing-wave-embroidery/);
  assert.doesNotMatch(css,/\.emblem-ray|\.emblem-slot|\.emblem-3d-blade/);
});
test("maintainable single theme file with balanced brackets",()=>{
  const count=(char)=>css.split(char).length-1;
  assert.equal(count("{"),count("}"));
  assert.equal(count("/*"),count("*/"));
  assert.ok(css.length<15000);
});
