import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { CITIZENS, hasLeaderInsignia } from "../app/citizens.ts";

test("Amberina's official web Simple uses unrotated Procreate preview pixels and unchanged identity wrappers", () => {
  const file = readFileSync(new URL("../public/amberina-personal-simple.png", import.meta.url));
  assert.equal(file.length, 158158);
  assert.equal(file.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(file.readUInt32BE(16), 800);
  assert.equal(file.readUInt32BE(20), 800);
  assert.equal(createHash("sha256").update(file).digest("hex"),
    "a4476f7946aa4d5a5f23e44a74a1b9cf621cd48f17a1760ce6572be79aae4ffb");

  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const entry = readFileSync(new URL("../app/entry.css", import.meta.url), "utf8");
  const globals = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const presence = readFileSync(new URL("../app/briefing/sidebar-presence.tsx", import.meta.url), "utf8");
  const members = readFileSync(new URL("../app/citizens.ts", import.meta.url), "utf8");

  assert.match(page, /citizen\.id === "amberina"/);
  assert.match(page, /citizen-mark personal-simple\$\{leaderClass\}/);
  assert.match(page, /src="\/amberina-personal-simple\.png"/);
  assert.doesNotMatch(page, /case "snow":/); // No previous hand-drawn snowflake returns.
  assert.match(entry, /\.citizen-mark::before/); // Original inner circle survives.
  assert.doesNotMatch(entry, /\.citizen-mark\.personal-simple::before/);
  assert.match(globals, /\.citizen-mark\.leader::after/); // Original outer halo/dots now follow the office.
  assert.match(presence, /renderMark\(member\.id\)/); // Online keeps original CitizenMark UI.
  assert.match(presence, /presence\.status === "ready"/); // Never mock online members.
  assert.match(members, /markColor: "#F2E783", motif: "snow"/);
});

test("leadership marker follows the presidential office, even if the office holder changes", () => {
  const amberina = CITIZENS.find(citizen => citizen.id === "amberina");
  const zxy = CITIZENS.find(citizen => citizen.id === "zxy");
  assert.ok(amberina && zxy);
  assert.equal(hasLeaderInsignia(amberina), true);
  assert.equal(hasLeaderInsignia(zxy), false);
  assert.equal(hasLeaderInsignia({ ...amberina, office: "Citizen of the First Empire" }), false);
  assert.equal(hasLeaderInsignia({ ...zxy, office: "President of the First Empire" }), true);
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /hasLeaderInsignia\(citizen\)/);
  assert.match(page, /citizen-mark \${citizen\.motif}\${leaderClass}/);
});

test("website emblem, existing circular marks and leadership dots all derive from the same member web color", () => {
  const members = readFileSync(new URL("../app/citizens.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const entry = readFileSync(new URL("../app/entry.css", import.meta.url), "utf8");
  const globals = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(members, /markColor: "#F2E783"/);
  // Official shared emblem stays separately controlled by Citizen.accent, not markColor.
  assert.match(members, /accent: "#f3c969", markColor: "#F2E783"/);
  assert.match(entry, /\.citizen-mark \{[^\n]*var\(--mark\)/);
  assert.match(entry, /\.citizen-mark::before \{[^\n]*var\(--mark\)/);
  assert.match(globals, /\.citizen-mark\.leader \{[^\n]*var\(--mark\)/);
  assert.match(globals, /\.citizen-mark\.leader::after \{[^\n]*var\(--mark\)/);
  assert.doesNotMatch(globals, /\.citizen-mark\.leader[^\n]*rgba\(243,201,105/);
  assert.match(globals, /\.book-cover-mark \{[^\n]*var\(--mark\)/);
  assert.match(globals, /\.reader-author-mark \{[^\n]*var\(--mark\)/);
  assert.match(page, /className="book-cover-mark" style=\{\{ "--mark": CITIZENS\[0\]\.markColor/);
  assert.match(page, /className="reader-author-mark" style=\{\{ "--mark": CITIZENS\[0\]\.markColor/);
  assert.match(page, /className=\{\`citizen-mark personal-simple\$\{leaderClass\}\`\}/);
});
