import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CITIZENS, AMBERINA_OFFICIAL_COLOR, AMBERINA_WEB_MARK_COLOR, citizenRepresentativeColor, hasLeaderInsignia } from "../app/citizens.ts";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const asset = (path) => readFileSync(new URL(path, import.meta.url));
const checkImage = (file, expectedSha) => {
  assert.equal(file.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(file.readUInt32BE(16), 800);
  assert.equal(file.readUInt32BE(20), 800);
  assert.equal(createHash("sha256").update(file).digest("hex"), expectedSha);
};

test("web 75.3% asset and official Procreate-derived asset stay separate", () => {
  assert.equal(AMBERINA_OFFICIAL_COLOR, "#F3ED87");
  assert.equal(AMBERINA_WEB_MARK_COLOR, "#F1E17E");
  checkImage(asset("../public/amberina-personal-simple-web753.png"), "6f2b94be6c80df63fe0a97fd216b68aa6099d975a5ea7798cbb3841ebb7ef3e4");
  checkImage(asset("../public/amberina-personal-simple-official.png"), "55b230019268fce29feb9011ba2d220f3576ec3d8c4d7659049548228b1e4823");
  assert.notDeepEqual(asset("../public/amberina-personal-simple-web753.png"), asset("../public/amberina-personal-simple-official.png"));
});

test("login chooser and welcome use updated Simple glyph with dedicated non-cached URL", () => {
  const page = source("../app/page.tsx");
  const entry = source("../app/entry.css");
  assert.match(page, /function Login\(/);
  assert.match(page, /<div className="identity-grid">/);
  assert.match(page, /<CitizenMark citizen=\{item\}/);
  assert.match(page, /<div className="welcome-mark"><CitizenMark citizen=\{citizen\}/);
  assert.match(page, /amberina-personal-simple-web753\.png/);
  assert.doesNotMatch(page, /src="\/amberina-personal-simple\.png"/);
  assert.match(entry, /citizen-simple-image/);
});

test("personal mark has its own web tone, while representative accents stay official", () => {
  const a = CITIZENS.find(citizen => citizen.id === "amberina");
  const zxy = CITIZENS.find(citizen => citizen.id === "zxy");
  assert.ok(a && zxy);
  assert.equal(a.markColor, AMBERINA_WEB_MARK_COLOR);
  assert.equal(citizenRepresentativeColor(a), AMBERINA_OFFICIAL_COLOR);
  assert.equal(citizenRepresentativeColor(zxy), zxy.accent);
  const page = source("../app/page.tsx");
  assert.match(page, /citizenRepresentativeColor\(item\)/);
  assert.match(page, /citizenRepresentativeColor\(focused\)/);
  assert.match(page, /citizenRepresentativeColor\(subject\)/);
  assert.match(page, /"128",AMBERINA_OFFICIAL_COLOR/);
  assert.match(page, /const EMBLEM_BLADES:/);
  assert.match(page, /color: citizen\.accent,/);
  assert.match(page, /function ProfileSection\(/);
});

test("leader dots follow the President's office, and all original mark rings use the matching color", () => {
  const amberina = CITIZENS.find(citizen => citizen.id === "amberina");
  const zxy = CITIZENS.find(citizen => citizen.id === "zxy");
  assert.ok(amberina && zxy);
  assert.equal(hasLeaderInsignia(amberina), true);
  assert.equal(hasLeaderInsignia(zxy), false);
  assert.equal(hasLeaderInsignia({ ...amberina, office: "Citizen of the First Empire" }), false);
  assert.equal(hasLeaderInsignia({ ...zxy, office: "President of the First Empire" }), true);
  const page = source("../app/page.tsx");
  const entry = source("../app/entry.css");
  const globals = source("../app/globals.css");
  const presence = source("../app/briefing/sidebar-presence.tsx");
  assert.match(page, /hasLeaderInsignia\(citizen\)/);
  assert.match(entry, /\.citizen-mark::before/);
  assert.match(entry, /--identity-mark/);
  assert.match(globals, /\.citizen-mark\.leader::after \{[^\n]*var\(--mark\)/);
  assert.match(globals, /\.book-cover-mark \{[^\n]*var\(--mark\)/);
  assert.match(globals, /\.reader-author-mark \{[^\n]*var\(--mark\)/);
  assert.match(presence, /renderMark\(member\.id\)/);
  assert.match(presence, /presence\.status === "ready"/);
});

test("elected meeting Speaker on dark chamber background uses official artwork and ring tone", () => {
  const page = source("../app/page.tsx");
  assert.match(page, /display === "official" && citizen\.id === "amberina" \? AMBERINA_OFFICIAL_COLOR/);
  assert.match(page, /amberina-personal-simple-official\.png/);
  assert.match(page, /electedSpeaker && <CitizenMark citizen=\{electedSpeaker\} display="official" \/>/);
});
