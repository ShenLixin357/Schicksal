import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CITIZENS, AMBERINA_OFFICIAL_COLOR, AMBERINA_WEB_MARK_COLOR, citizenRepresentativeColor, hasLeaderInsignia } from "../app/citizens.ts";

const source=(p)=>readFileSync(new URL(p,import.meta.url),"utf8");
const asset=(p)=>readFileSync(new URL(p,import.meta.url));
const checkImage=(p,sha)=>{
  const buf=asset(p);
  assert.equal(buf.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  assert.equal(buf.readUInt32BE(16),800);
  assert.equal(buf.readUInt32BE(20),800);
  assert.equal(createHash("sha256").update(buf).digest("hex"),sha);
};

test("official colour from Procreate README is NOT the brighter personal-web colour",()=>{
  assert.equal(AMBERINA_OFFICIAL_COLOR,"#F3ED87");
  assert.equal(AMBERINA_WEB_MARK_COLOR,"#EECF58");
  const amberina=CITIZENS.find(c=>c.id==="amberina");
  const zxy=CITIZENS.find(c=>c.id==="zxy");
  assert.ok(amberina && zxy);
  assert.equal(amberina.markColor,AMBERINA_WEB_MARK_COLOR);
  assert.equal(citizenRepresentativeColor(amberina),AMBERINA_OFFICIAL_COLOR);
  assert.equal(citizenRepresentativeColor(zxy),zxy.accent);
});

test("two separately verified transparent PNGs, original artwork never overwritten",()=>{
  checkImage("../public/amberina-personal-simple-official.png","55b230019268fce29feb9011ba2d220f3576ec3d8c4d7659049548228b1e4823");
  checkImage("../public/amberina-personal-simple-gold-eecf58.png","eebb12aa5198c44d78aa27be4368855c7ba92ba3113b1e94386bc104f6f49a74");
  assert.notDeepEqual(asset("../public/amberina-personal-simple-gold-eecf58.png"),asset("../public/amberina-personal-simple-official.png"));
});

test("existing beige website mark and circles/leader dots use the enhanced gold; no fog or backplate",()=>{
  const page=source("../app/page.tsx");
  const entry=source("../app/entry.css");
  const globals=source("../app/globals.css");
  const layout=source("../app/layout.tsx");
  assert.match(page,/function CitizenMark\(\{ citizen, display = "web" \}/);
  assert.match(page,/display === "official" && citizen\.id === "amberina" \? AMBERINA_OFFICIAL_COLOR : citizen\.markColor/);
  assert.match(page,/src=\{display === "official" \? "\/amberina-personal-simple-official\.png" : "\/amberina-personal-simple-gold-eecf58\.png"\}/);
  assert.match(page,/<CitizenMark citizen=\{item\}/);
  assert.match(page,/<div className="welcome-mark"><CitizenMark citizen=\{citizen\}/);
  assert.match(page,/className="book-cover-mark" style=\{\{ "--mark": CITIZENS\[0\]\.markColor/);
  assert.match(page,/className="reader-author-mark" style=\{\{ "--mark": CITIZENS\[0\]\.markColor/);
  assert.match(entry,/\.citizen-mark::before \{[^\n]*var\(--mark\)/);
  assert.match(globals,/\.citizen-mark\.leader::after \{[^\n]*var\(--mark\)/);
  assert.match(entry,/\.citizen-mark\.personal-simple\.leader \{\s*background: transparent;\s*box-shadow: none;/);
  assert.doesNotMatch(page,/citizen-mark-mist/);
  assert.doesNotMatch(layout,/amberina-personal-fog|oat-sage-theme/);
});

test("ALL parliamentary insignia show original even for seat members, candidate, votes and commenters",()=>{
  const pg=source("../app/page.tsx");
  const section=pg.slice(pg.indexOf("function ParliamentSection("),pg.indexOf("function HonorsSection("));
  assert.ok(section.length>3000);
  const marks=[...section.matchAll(/<CitizenMark citizen=\{[^}]+\}[^>]*\/>/g)].map(x=>x[0]);
  assert.ok(marks.length>=8,"expected eight or more parliament usages, got "+marks.length);
  for(const mark of marks)assert.match(mark,/display="official"/,"parliament badge missing official mode: "+mark);
  assert.match(section,/electedSpeaker && <CitizenMark citizen=\{electedSpeaker\} display="official"/);
  // The member-presence footer moved to the extracted shell; identity rules did not change.
  assert.match(pg,/renderMemberMark=\\{memberId => \\{/);
  assert.match(pg,/<CitizenMark citizen=\\{member\\} display=\\{clubOpen \\? "official" : "web"\\}/);
  const sidebar=source("../app/shell/imperial-sidebar.tsx");
  assert.match(sidebar,/className="schicksal-sidebar-footer"[^]*?<SidebarPresence[^]*?selfId=\\{selfId\\}/);
  assert.match(sidebar,/className="schicksal-sidebar-logout"/);
  assert.match(sidebar,/onClick=\\{onLogout\\}/);
  const presence=source("../app/briefing/sidebar-presence.tsx");
  assert.match(presence,/member.id === selfId/);
  assert.match(presence,/member.id !== selfId && !member.locked && onlineIds.has\(member.id\)/);
});

test("user's scores and all other representative colours always use #F3ED87",()=>{
  const page=source("../app/page.tsx");
  assert.match(page,/"128",AMBERINA_OFFICIAL_COLOR/);
  assert.match(page,/citizenRepresentativeColor\(item\)/);
  assert.match(page,/citizenRepresentativeColor\(focused\)/);
  assert.match(page,/citizenRepresentativeColor\(subject\)/);
  assert.match(page,/style=\{\{ "--citizen": citizenRepresentativeColor\(citizen\) \} as CSSProperties\}><div className="profile-mark"/);
  assert.match(page,/style=\{\{ "--citizen": citizenRepresentativeColor\(member\) \} as CSSProperties\}/);
  assert.match(page,/const EMBLEM_BLADES:/);
  assert.match(page,/color: citizen\.accent,/);
});

test("president dots follow the office and future agents must ask before adding name/mark colour",()=>{
  const a=CITIZENS.find(c=>c.id==="amberina"),z=CITIZENS.find(c=>c.id==="zxy");
  assert.ok(a && z);
  assert.equal(hasLeaderInsignia(a),true);
  assert.equal(hasLeaderInsignia(z),false);
  assert.equal(hasLeaderInsignia({...a,office:"Citizen of the First Empire"}),false);
  assert.equal(hasLeaderInsignia({...z,office:"President of the First Empire"}),true);
  const ag=source("../AGENTS.md"),policy=source("../docs/amberina-identity-color-policy.md"),readme=source("../README.md");
  assert.match(ag,/ASK THE USER FIRST/);
  assert.match(ag,/#F3ED87/);
  assert.match(ag,/#EECF58/);
  assert.match(ag,/score numbers/);
  assert.match(policy,/这个位置的 Amberina/);
  assert.match(policy,/parliament/);
  assert.match(readme,/Amberina identity colour policy/);
});
