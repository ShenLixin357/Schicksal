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
  assert.equal(amberina.markColor,AMBERINA_OFFICIAL_COLOR);
  assert.equal(citizenRepresentativeColor(amberina),AMBERINA_OFFICIAL_COLOR);
  assert.equal(citizenRepresentativeColor(zxy),zxy.accent);
});

test("two separately verified transparent PNGs, original artwork never overwritten",()=>{
  checkImage("../public/amberina-personal-simple-official.png","55b230019268fce29feb9011ba2d220f3576ec3d8c4d7659049548228b1e4823");
  checkImage("../public/amberina-personal-simple-gold-eecf58.png","eebb12aa5198c44d78aa27be4368855c7ba92ba3113b1e94386bc104f6f49a74");
  assert.notDeepEqual(asset("../public/amberina-personal-simple-gold-eecf58.png"),asset("../public/amberina-personal-simple-official.png"));
});

test("explicit original-colour placements preserve the unchanged Simple crop, with one approved strong sidebar",()=>{
  const page=source("../app/page.tsx");
  const entry=source("../app/entry.css");
  const globals=source("../app/globals.css");
  const layout=source("../app/layout.tsx");
  const mark = source("../app/identity/public-mark.tsx");
  assert.match(page, /import \{ PublicCitizenMark as CitizenMark \}/);
  assert.match(mark, /export function PublicCitizenMark/);
  assert.match(mark, /isCurrentPresident\(citizen\.id\)/);
  assert.match(mark, /visual\?\.officialMarkColor/);
  assert.match(mark, /amberinaMarkAt\(placement\)/);
  assert.match(mark, /<Image src=\{markAsset\}/);
  const visuals = source("../app/identity/visual-registry.ts");
  assert.match(visuals, /officialMarkAsset: "\/amberina-personal-simple-official\.png"/);
  assert.match(visuals, /webMarkAsset: "\/amberina-personal-simple-gold-eecf58\.png"/);
  assert.match(page,/CitizenMark citizen=\{item\} placement="login-react-picker"/);
  assert.match(page,/welcome-mark"><CitizenMark citizen=\{citizen\} placement="welcome-identity"/);
  const archive=source("../app/archives/archive-section.tsx");
  assert.match(archive,/className="book-cover-mark" style=\{\{ "--mark": authorMarkColor/);
  assert.match(page,/authorMarkColor=\{CITIZENS\[0\]\.markColor\}/);
  assert.match(archive,/className="reader-author-mark" style=\{\{ "--mark": authorMarkColor/);
  assert.match(page,/authorMark=\{<CitizenMark citizen=\{CITIZENS\[0\]\} placement="archive-book-cover" \/>\}/);
  assert.match(entry,/\.citizen-mark::before \{[^\n]*var\(--mark\)/);
  // President dots must be globally available, even before Lounge is loaded.
  const officeStyles=source("../app/identity/office-insignia.css");
  assert.match(officeStyles,/\.citizen-mark\.leader::after \{[^\n]*var\(--mark\)/);
  assert.match(layout,/import "\.\/identity\/office-insignia\.css";/);
  assert.doesNotMatch(source("../app/club/lounge-scenes.css"),/\.citizen-mark\.leader::after/);
  assert.match(entry,/\.citizen-mark\.personal-simple\.leader \{\s*background: transparent;\s*box-shadow: none;/);
  assert.doesNotMatch(page,/citizen-mark-mist/);
  assert.doesNotMatch(layout,/amberina-personal-fog|oat-sage-theme/);
});

test("ALL parliamentary insignia show original even for seat members, candidate, votes and commenters",()=>{
  const pg=source("../app/page.tsx");
  const section=source("../app/parliament/parliament-section.tsx");
  assert.ok(section.length>3000);
  const marks=[...section.matchAll(/renderOfficialMark\(/g)];
  assert.ok(marks.length>=8,"expected eight or more parliament official marks, got "+marks.length);
  assert.match(section,/renderOfficialMark\(electedSpeaker, "parliament-speaker-election"\)/);
  assert.match(section,/renderOfficialMark\(citizenFor\(request\.citizenId\)!, "parliament-comment-request"\)/);
  // The official-mode renderer is supplied by the parent rather than being
  // copied into the parliament domain, preserving the exact approved colours.
  assert.match(pg,/renderOfficialMark=\{\(member, placement\) => <CitizenMark citizen=\{member\} placement=\{placement\} \/>\}/);
  assert.doesNotMatch(section,/<CitizenMark citizen=/);
  // The member-presence footer moved to the extracted shell; identity rules did not change.
  assert.match(pg,/renderMemberMark=\{memberId => \{/);
  assert.match(pg,/CitizenMark citizen=\{member\} placement=\{member\.id === citizen\.id \?/);
  const sidebar=source("../app/shell/imperial-sidebar.tsx");
  assert.match(sidebar,/className="schicksal-sidebar-footer"[^]*?<SidebarPresence[^]*?selfId=\{selfId\}/);
  assert.match(sidebar,/className="schicksal-sidebar-logout"/);
  assert.match(sidebar,/onClick=\{onLogout\}/);
  const presence=source("../app/briefing/sidebar-presence.tsx");
  assert.match(presence,/member.id === selfId/);
  assert.match(presence,/member.id !== selfId && !member.locked && onlineIds.has\(member.id\)/);
});

test("user's scores and all other representative colours always use #F3ED87",()=>{
  const page=source("../app/page.tsx");
  const points=source("../app/points/points-pages.tsx");
  const profile=source("../app/profile/profile-page.tsx");
  assert.match(points,/"128",AMBERINA_OFFICIAL_COLOR/);
  assert.match(page,/citizenRepresentativeColor\(item\)/);
  assert.match(page,/citizenRepresentativeColor\(focused\)/);
  const photos=source("../app/photos/photo-archive.tsx");
  assert.match(photos,/citizenRepresentativeColor\(subject\)/);
  assert.match(photos,/renderCitizenMark/);
  assert.match(profile,/style=\{\{ "--citizen": citizenRepresentativeColor\(citizen\) \} as CSSProperties\}><div className="profile-mark"/);
  assert.match(source("../app/parliament/parliament-section.tsx"),/style=\{\{ "--citizen": citizenRepresentativeColor\(member\) \} as CSSProperties\}/);
  const blades=source("../app/emblem/blade-spec.ts");
  assert.match(blades,/const EMBLEM_BLADES:/);
  assert.match(blades,/color: citizen\.accent,/);
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
