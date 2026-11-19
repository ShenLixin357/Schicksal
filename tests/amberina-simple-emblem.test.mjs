import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CITIZENS, AMBERINA_OFFICIAL_COLOR, AMBERINA_WEB_MARK_COLOR, citizenRepresentativeColor, hasLeaderInsignia } from "../app/citizens.ts";
const source = p => readFileSync(new URL(p, import.meta.url), "utf8");
const asset = p => readFileSync(new URL(p, import.meta.url));
const checkImage = (file, expectedSha) => {
  assert.equal(file.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(file.readUInt32BE(16), 800);
  assert.equal(file.readUInt32BE(20), 800);
  assert.equal(createHash("sha256").update(file).digest("hex"), expectedSha);
};
test("official original Procreate PNG is the sole active Amberina image", () => {
  assert.equal(AMBERINA_OFFICIAL_COLOR, "#F3ED87");
  assert.equal(AMBERINA_WEB_MARK_COLOR, "#F1E17E"); // Retained only as an historical unselected colour.
  checkImage(asset("../public/amberina-personal-simple-official.png"), "55b230019268fce29feb9011ba2d220f3576ec3d8c4d7659049548228b1e4823");
  const page = source("../app/page.tsx");
  assert.match(page, /src="\/amberina-personal-simple-official\.png"/);
  assert.doesNotMatch(page, /src="\/amberina-personal-simple-web753\.png"/);
  assert.match(page, /<span className="citizen-mark-mist" \/>/);
  assert.doesNotMatch(page, /display="web"|display="official"/);
});
test("Amberina identity has official color in login, welcome, archive, honors and parliament", () => {
  const a = CITIZENS.find(x => x.id === "amberina"), zxy=CITIZENS.find(x=>x.id==="zxy");
  assert.ok(a && zxy);
  assert.equal(a.markColor, AMBERINA_OFFICIAL_COLOR);
  assert.equal(citizenRepresentativeColor(a), AMBERINA_OFFICIAL_COLOR);
  assert.equal(citizenRepresentativeColor(zxy), zxy.accent);
  const page=source("../app/page.tsx");
  assert.match(page, /function Login\(/);
  assert.match(page, /<CitizenMark citizen=\{item\}/);
  assert.match(page, /<div className="welcome-mark"><CitizenMark citizen=\{citizen\}/);
  assert.match(page, /electedSpeaker && <CitizenMark citizen=\{electedSpeaker\} \/>/);
  assert.match(page, /"128",AMBERINA_OFFICIAL_COLOR/);
  assert.match(page, /const EMBLEM_BLADES:/);
  assert.match(page, /color: citizen\.accent,/);
});
test("independent #000A4C fog: exactly 56% center, 270/218 size, 32/218 blur and 77% fade", () => {
  const css=source("../app/amberina-personal-fog.css");
  const layout=source("../app/layout.tsx");
  assert.match(layout, /import "\.\/amberina-personal-fog\.css";/);
  assert.ok(layout.indexOf('import "./amberina-personal-fog.css"')>layout.indexOf('import "./club/lounge-magic.css"'));
  assert.match(css, /width:\s*123\.8532cqi/);
  assert.match(css, /height:\s*123\.8532cqi/);
  assert.match(css, /filter:\s*blur\(14\.6789cqi\)/);
  for(const a of [".56",".4312",".1792"]) assert.ok(css.includes("rgba(0,10,76,"+a+")"));
  assert.match(css, /rgba\(0,10,76,0\) 77%/);
  assert.match(css, /background:\s*transparent/);
  assert.doesNotMatch(css, /#789274|#647c67|background-color:/);
  assert.equal(css.split("{").length,css.split("}").length);
});
test("president office dots and original rings preserved; no new dots for others", () => {
  const a=CITIZENS.find(x=>x.id==="amberina"),z=CITIZENS.find(x=>x.id==="zxy");
  assert.ok(a && z);
  assert.equal(hasLeaderInsignia(a),true);
  assert.equal(hasLeaderInsignia(z),false);
  assert.equal(hasLeaderInsignia({ ...z, office:"President of the First Empire" }),true);
  const entry=source("../app/entry.css"),globals=source("../app/globals.css"),fog=source("../app/amberina-personal-fog.css"),presence=source("../app/briefing/sidebar-presence.tsx");
  assert.match(entry,/\.citizen-mark::before/);
  assert.match(globals,/\.citizen-mark\.leader::after/);
  assert.match(fog,/\.citizen-mark\.personal-simple\.leader::after/);
  assert.match(fog,/\.citizen-mark\.personal-simple > \.citizen-simple-image/);
  assert.match(presence,/renderMark\(member\.id\)/);
  assert.match(presence,/presence\.status === "ready"/);
});
