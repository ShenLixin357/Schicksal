import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(p)=>readFileSync(new URL(p,import.meta.url),"utf8");
const css=read("../app/oat-sage-theme.css");
const layout=read("../app/layout.tsx");
const page=read("../app/page.tsx");
const briefing=read("../app/briefing/briefing.css");
const base=read("../app/globals.css");

test("approved oat/sage palette stays in its own last-imported reversible layer",()=>{
  assert.match(css,/--oat-bg:\s*#eceee5/);
  for(const color of ["#dee8d6","#d8e4ce","#f1f6ed","#c9d9c2"]) assert.ok(css.includes(color),color);
  assert.match(layout,/import "\.\/oat-sage-theme\.css";/);
  assert.ok(layout.indexOf('import "./oat-sage-theme.css"')>layout.indexOf('import "./club/lounge-magic.css"'));
  assert.match(css,/\.system:not\(\.club-system\)/);
  assert.match(css,/\.imperial-briefing-overlay/);
  assert.doesNotMatch(css,/\.club-system\s+\.sidebar/);
  assert.doesNotMatch(css,/\.profile(?:\s|[,.:{>])/);
});
test("retheme does not alter member emblem original colour or urgent indicators",()=>{
  assert.match(page,/function CitizenMark/);
  assert.match(page,/amberina-personal-simple-web753\.png/);
  assert.match(page,/amberina-personal-simple-official\.png/);
  assert.match(page,/electedSpeaker && <CitizenMark citizen=\{electedSpeaker\} display="official"/);
  assert.match(page,/AMBERINA_OFFICIAL_COLOR/);
  assert.match(briefing,/imperial-briefing-wave-embroidery/);
  assert.match(base,/\.citizen-mark\.leader::after/);
  assert.doesNotMatch(css,/\.affair-urgent|\.affair-important|\.imperial-briefing-wave-embroidery/);
  assert.doesNotMatch(css,/\.emblem-ray|\.emblem-slot|\.emblem-3d-blade/);
});
test("theme syntactically balanced and reachable styles are scoped",()=>{
  const count=(char)=>css.split(char).length-1;
  assert.equal(count("{"),count("}"));
  assert.equal(count("/*"),count("*/"));
  assert.ok(css.length<18000,"keep theme layer maintainable");
  assert.match(css,/\.login \.identity-grid \.citizen-mark\.personal-simple/);
  assert.match(css,/\.system:not\(\.club-system\) \.sidebar \.citizen-mark\.personal-simple/);
  assert.doesNotMatch(css,/\.chamber-centre \.citizen-mark\.personal-simple/);
});
