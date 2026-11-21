import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PUBLIC_MEMBER_VISUALS } from "../app/identity/visual-registry.ts";
import { CITIZENS, citizenRepresentativeColor } from "../app/citizens.ts";
import {
  AMBERINA_MARK_PLACEMENTS, NO2_FULL_MARK_PLACEMENTS, no2MarkAt,
} from "../app/identity/mark-placements.ts";

const root = new URL("../", import.meta.url);
const asset = path => readFileSync(new URL(path, root));
const source = path => asset(path).toString("utf8");
const approved = Object.freeze({
  responsive: {
    path: "public/no2-personal-responsive-garnet.png",
    sha256: "1dba227636156058944d1293a5e142a20c637f30b1b40ac6714f83cd09cd87ba",
    dimensions: [1073, 1073],
  },
  full: {
    path: "public/no2-personal-full-garnet.png",
    sha256: "c243fd7ee99c859e268cf5b756248bb62ec461936448f0110ae3516f35422157",
    dimensions: [820, 994],
  },
});

test("the two No.2 PNGs are the unchanged approved source bytes, not redrawn or recoloured", () => {
  for (const item of Object.values(approved)) {
    const data = asset(item.path);
    assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.deepEqual([data.readUInt32BE(16), data.readUInt32BE(20)], item.dimensions);
    assert.equal(createHash("sha256").update(data).digest("hex"), item.sha256);
  }
  assert.deepEqual(
    asset("app/assets/no2-login-responsive-garnet.png"),
    asset(approved.responsive.path),
    "anonymous login art must be the byte-identical approved responsive original",
  );
});

test("ALL No.2 member colours, including the shared eight-ray emblem, use exactly Garnet Red", () => {
  const visual = PUBLIC_MEMBER_VISUALS.zxy;
  const red = "#D7263D";
  for (const field of ["representativeColor", "emblemRayColor", "webMarkColor", "officialMarkColor", "atlasPersonalColor"]) {
    assert.equal(visual[field], red, "incorrect No.2 colour: " + field);
  }
  assert.equal(visual.webMarkAsset, "/no2-personal-responsive-garnet.png");
  assert.equal(visual.officialMarkAsset, "/no2-personal-full-garnet.png");
  const member = CITIZENS.find(c => c.id === "zxy");
  assert.ok(member);
  assert.equal(member.markColor, red);
  assert.equal(member.accent, red);
  assert.equal(member.motif, "skull");
  assert.equal(citizenRepresentativeColor(member), red);
  // The emblem module and Atlas module use bundler-resolution imports, so
  // check their wiring without loading them directly in Node's test runner.
  const bladesSource = source("app/emblem/blade-spec.ts");
  assert.match(bladesSource, /CITIZENS\.map\(\(citizen, index\)/);
  assert.match(bladesSource, /color: citizen\.accent/);
  const blade = CITIZENS.map((citizen, index) => ({
    index, citizenId: citizen.id, color: citizen.accent,
  })).find(b => b.citizenId === "zxy");
  assert.ok(blade);
  assert.equal(blade.index, 1);
  assert.equal(blade.color, red);
  const atlasSource = source("app/atlas/atlas-data.ts");
  assert.match(atlasSource, /getPublicMemberVisual\(id\)/);
  assert.match(atlasSource, /emblemSrc: visual\.officialMarkAsset/);
  assert.match(atlasSource, /accent: visual\.atlasPersonalColor/);
  assert.doesNotMatch(source("app/identity/visual-registry.ts"), /#d95d52|#f05f55/i);
});

test("small placements use responsive mark; only approved large personal portraits use full artwork", () => {
  const full = new Set(["profile-personal-simple", "profile-public-simple", "atlas-personal-detail"]);
  assert.deepEqual(new Set(NO2_FULL_MARK_PLACEMENTS), full);
  for (const placement of Object.keys(AMBERINA_MARK_PLACEMENTS)) {
    assert.deepEqual(no2MarkAt(placement), {
      color: "#D7263D",
      asset: full.has(placement)
        ? "/no2-personal-full-garnet.png"
        : "/no2-personal-responsive-garnet.png",
    }, "Incorrect No.2 mark at " + placement);
  }
  assert.throws(() => no2MarkAt("unapproved-location"), /Unapproved No.2/);
  const renderer = source("app/identity/public-mark.tsx");
  assert.match(renderer, /citizen.id === "zxy" \? no2MarkAt\(placement\)/);
  assert.match(renderer, /no2 \? " no2-symbol" : ""/);
  assert.match(renderer, /<Image src=\{markAsset\}/);
});

test("server-side pre-auth entry has the same responsive mark and Garnet Red as React login", () => {
  const entry = source("app/entry-screen.ts");
  assert.match(entry, /import no2OriginalLoginMark from "\.\/assets\/no2-login-responsive-garnet\.png\?inline"/);
  assert.match(entry, /class="citizen-mark personal-simple no2-symbol mark-zxy"/);
  assert.match(entry, /\.mark-zxy \.citizen-simple-image\{background-image:url\("\$\{no2OriginalLoginMark\}"\)\}/);
  assert.match(entry, /citizenRepresentativeColor\(member\)/);
  assert.match(entry, /member\.accent/);
  const css = source("app/entry.css");
  assert.match(css, /\.citizen-mark\.no2-symbol \.citizen-simple-image/);
  const profile = source("app/profile/profile-page.tsx");
  assert.match(profile, /Garnet Red Skull Emblem/);
  assert.match(profile, /Garnet Red \/ 石榴红 · #D7263D/);
  assert.doesNotMatch(profile, /Red Flame/);
});
