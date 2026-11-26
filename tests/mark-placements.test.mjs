import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CITIZENS, citizenRepresentativeColor } from "../app/citizens.ts";
import {
  AMBERINA_MARK_PLACEMENTS, amberinaMarkAt, amberinaVariantAt,
} from "../app/identity/mark-placements.ts";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("all 22 owner-reviewed places are declared; only own main sidebar uses strong", () => {
  const keys=Object.keys(AMBERINA_MARK_PLACEMENTS);
  assert.equal(keys.length, 23, "22 user-approved places plus separate other-user sidebar guard");
  assert.deepEqual(Object.entries(AMBERINA_MARK_PLACEMENTS).filter(([,v])=>v==="strong"), [["sidebar-main-self", "strong"]]);
  for (const place of keys) assert.ok(["official","strong"].includes(amberinaVariantAt(place)));
  assert.throws(()=>amberinaVariantAt("future-unapproved-mark"),/Unapproved/);
  assert.deepEqual(amberinaMarkAt("sidebar-main-self"), {
    color:"#EECF58",asset:"/amberina-personal-simple-gold-eecf58.png",
  });
  for (const place of keys.filter(x=>x!=="sidebar-main-self"))
    assert.deepEqual(amberinaMarkAt(place),{
      color:"#F3ED87",asset:"/amberina-personal-simple-official.png",
    }, "wrong treatment of "+place);
});

test("official colour cannot be replaced by the stronger glyph-only colour", () => {
  const member=CITIZENS.find(m=>m.id==="amberina");
  assert.equal(member.markColor,"#F3ED87");
  assert.equal(citizenRepresentativeColor(member),"#F3ED87");
  assert.equal(member.accent,"#f3c969","independent shared-emblem blade palette must remain unchanged");
});

test("secure inlined anonymous login art is byte-identical to the locked original Simple", () => {
  const a = readFileSync(new URL("../app/assets/amberina-login-mark-official.png", import.meta.url));
  const b = readFileSync(new URL("../public/amberina-personal-simple-official.png", import.meta.url));
  assert.deepEqual(a, b, "entry art must never silently fall back to the strong glyph");
  assert.equal(createHash("sha256").update(a).digest("hex"), "55b230019268fce29feb9011ba2d220f3576ec3d8c4d7659049548228b1e4823");
});

test("no implicit mark display default or unapproved mark calls remain", () => {
  const mark=read("app/identity/public-mark.tsx");
  const page=read("app/page.tsx");
  assert.match(mark,/placement: PublicMarkPlacement/);
  assert.doesNotMatch(mark,/display = "web"|display = "official"/);
  assert.match(mark,/amberinaMarkAt\(placement\)/);
  const uses=[...page.matchAll(/<CitizenMark\b[^>]*\/>/g)];
  assert.ok(uses.length>=10);
  for(const [use] of uses) assert.match(use,/placement=/,"missing explicit site placement: "+use);
  assert.match(page,/sidebar-main-self/);
  assert.match(page,/sidebar-lounge-self/);
  assert.match(page,/sidebar-main-other-member/);
  assert.match(page,/placement="profile-personal-simple"/);
  assert.match(page,/placement="profile-public-simple"/);
  assert.match(page,/placement="archive-book-cover"/);
  assert.match(page,/placement="archive-reader-author"/);
  assert.match(page,/placement="login-react-picker"/);
  assert.match(page,/placement="welcome-identity"/);
});

test("unbundled login entry uses approved original public Simple, not old inline strong asset", () => {
  const entry=read("app/entry-screen.ts");
  assert.match(entry,/amberinaMarkAt\("login-entry-picker"\)/);
  assert.match(entry,/loginMark\.color/);
  assert.match(entry,/assets\/amberina-login-mark-official\.png\?inline/);
  assert.doesNotMatch(entry,/assets\/amberina-login-mark\.png\?inline/);
});

test("three photo, four parliament and two messaging contexts retain explicit slots", () => {
  const photos=read("app/photos/photo-archive.tsx");
  const parliament=read("app/parliament/parliament-section.tsx");
  const messenger=read("app/messenger/messenger.tsx");
  for(const slot of ["photos-filter-subject","photos-upload-subject","photos-card-subject"])
    assert.match(photos,new RegExp('"'+slot+'"'));
  for(const slot of ["parliament-seat-speaker","parliament-speaker-election","parliament-comment-request","parliament-votes-results"])
    assert.match(parliament,new RegExp('"'+slot+'"'));
  for(const slot of ["messenger-contact","messenger-peer"])
    assert.match(messenger,new RegExp('"'+slot+'"'));
});

test("Atlas label is a safe placeholder, never an art-approval signal", () => {
  const nav=read("app/shell/navigation.ts");
  const page=read("app/page.tsx");
  assert.match(nav,/ATLAS_VISUAL_APPROVED = false/);
  assert.match(nav,/\{ id: "atlas", label: "天命图谱" \}/);
  assert.match(page,/ATLAS_VISUAL_APPROVED \? <FeatureSuspense/);
  assert.match(page,/<ShellPlaceholder kind="atlas" \/>/);
  assert.match(read("app/shell/placeholder.tsx"),/美术设计中 · 暂未开放/);
  assert.match(read("app/atlas/atlas-data.ts"),/emblemSrc: visual\.officialMarkAsset/);
});
