import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CITIZENS, AMBERINA_OFFICIAL_COLOR, AMBERINA_WEB_MARK_COLOR, citizenRepresentativeColor, hasLeaderInsignia } from "../app/citizens.ts";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const asset = (path) => readFileSync(new URL(path, import.meta.url));
const checkImage = (file, expectedSha) => {
  assert.equal(file.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  assert.equal(file.readUInt32BE(16),800);
  assert.equal(file.readUInt32BE(20),800);
  assert.equal(createHash("sha256").update(file).digest("hex"),expectedSha);
};
const hexBlend=(a,b,w=.7)=>{
  const read=(s,idx)=>parseInt(s.slice(idx,idx+2),16);
  return "#"+[1,3,5].map(i=>Math.round(w*read(a,i)+(1-w)*read(b,i)).toString(16).padStart(2,"0")).join("").toUpperCase();
};

test("new champagne web gold follows exact 70/30 screenshot-picked mix",()=>{
  assert.equal(hexBlend("#EAD98C","#EEDFA1"),"#EBDB92");
  assert.equal(AMBERINA_WEB_MARK_COLOR,"#EBDB92");
  assert.equal(AMBERINA_OFFICIAL_COLOR,"#F3ED87");
  checkImage(asset("../public/amberina-personal-simple-champagne.png"),"ee49a02590aaf230dbfd22e04df5d910350c238abbad43309fd2344e679c406a");
  checkImage(asset("../public/amberina-personal-simple-official.png"),"55b230019268fce29feb9011ba2d220f3576ec3d8c4d7659049548228b1e4823");
});

test("ordinary Amberina icon uses web gold but selected Speaker uses original color and image",()=>{
  const page=source("../app/page.tsx");
  const a=CITIZENS.find(c=>c.id==="amberina");
  assert.ok(a);
  assert.equal(a.markColor,"#EBDB92");
  assert.match(page,/function CitizenMark\(\{ citizen, display = "web" \}/);
  assert.match(page,/const markColor = display === "official" && citizen\.id === "amberina" \? AMBERINA_OFFICIAL_COLOR : citizen\.markColor/);
  assert.match(page,/src=\{display === "official" \? "\/amberina-personal-simple-official\.png" : "\/amberina-personal-simple-champagne\.png"\}/);
  assert.match(page,/electedSpeaker && <CitizenMark citizen=\{electedSpeaker\} display="official" \/>/);
  assert.doesNotMatch(page,/citizen-mark-mist/);
  assert.match(page,/function Login\(/);
  assert.match(page,/<CitizenMark citizen=\{item\}/);
  assert.match(page,/<div className="welcome-mark"><CitizenMark citizen=\{citizen\}/);
});

test("other personal colors and official representative color remain unchanged",()=>{
  const a=CITIZENS.find(c=>c.id==="amberina");
  const zxy=CITIZENS.find(c=>c.id==="zxy");
  assert.ok(a && zxy);
  assert.equal(citizenRepresentativeColor(a), AMBERINA_OFFICIAL_COLOR);
  assert.equal(citizenRepresentativeColor(zxy), zxy.accent);
  const page=source("../app/page.tsx");
  assert.match(page,/"128",AMBERINA_OFFICIAL_COLOR/);
  assert.match(page,/citizenRepresentativeColor\(item\)/);
  assert.match(page,/citizenRepresentativeColor\(subject\)/);
  assert.match(page,/const EMBLEM_BLADES:/);
  assert.match(page,/color: citizen\.accent,/);
  assert.match(page,/function ProfileSection\(/);
});

test("existing personal rings and President-only dots match the web badge, but not a background disc",()=>{
  const entry=source("../app/entry.css"),globals=source("../app/globals.css"),page=source("../app/page.tsx"),layout=source("../app/layout.tsx");
  const a=CITIZENS.find(c=>c.id==="amberina"),zxy=CITIZENS.find(c=>c.id==="zxy");
  assert.ok(a && zxy);
  assert.equal(hasLeaderInsignia(a),true);
  assert.equal(hasLeaderInsignia(zxy),false);
  assert.equal(hasLeaderInsignia({ ...a, office:"Citizen of the First Empire" }),false);
  assert.equal(hasLeaderInsignia({ ...zxy, office:"President of the First Empire" }),true);
  assert.match(page,/hasLeaderInsignia\(citizen\)/);
  assert.match(entry,/\.citizen-mark \{[^\n]*var\(--mark\)/);
  assert.match(entry,/\.citizen-mark::before \{[^\n]*var\(--mark\)/);
  assert.match(globals,/\.citizen-mark\.leader::after \{[^\n]*var\(--mark\)/);
  assert.match(entry,/\.citizen-mark\.personal-simple\.leader \{\s*background: transparent;\s*box-shadow: none;/);
  assert.match(globals,/\.book-cover-mark \{[^\n]*var\(--mark\)/);
  assert.match(globals,/\.reader-author-mark \{[^\n]*var\(--mark\)/);
  assert.doesNotMatch(layout,/amberina-personal-fog\.css/);
});
