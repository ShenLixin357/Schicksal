import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

test("Amberina's official web Simple uses unrotated Procreate preview pixels and unchanged identity wrappers", () => {
  const file = readFileSync(new URL("../public/amberina-personal-simple.png", import.meta.url));
  assert.equal(file.length, 156570);
  assert.equal(file.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(file.readUInt32BE(16), 800);
  assert.equal(file.readUInt32BE(20), 800);
  assert.equal(createHash("sha256").update(file).digest("hex"),
    "55b230019268fce29feb9011ba2d220f3576ec3d8c4d7659049548228b1e4823");

  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const entry = readFileSync(new URL("../app/entry.css", import.meta.url), "utf8");
  const globals = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const presence = readFileSync(new URL("../app/briefing/sidebar-presence.tsx", import.meta.url), "utf8");
  const members = readFileSync(new URL("../app/citizens.ts", import.meta.url), "utf8");

  assert.match(page, /citizen\.id === "amberina"/);
  assert.match(page, /className="citizen-mark snow personal-simple"/);
  assert.match(page, /src="\/amberina-personal-simple\.png"/);
  assert.doesNotMatch(page, /case "snow":/); // No previous hand-drawn snowflake returns.
  assert.match(entry, /\.citizen-mark::before/); // Original inner circle survives.
  assert.doesNotMatch(entry, /\.citizen-mark\.personal-simple::before/);
  assert.match(globals, /\.citizen-mark\.snow::after/); // Original outer ring/dots.
  assert.match(presence, /renderMark\(member\.id\)/); // Online keeps original CitizenMark UI.
  assert.match(presence, /presence\.status === "ready"/); // Never mock online members.
  assert.match(members, /markColor: "#F3ED87", motif: "snow"/);
});
