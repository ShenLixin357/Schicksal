import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Amberina personal identity uses the exact official Simple master, not a generated snowflake", () => {
  const file = readFileSync(new URL("../public/amberina-personal-simple.png", import.meta.url));
  assert.equal(file.length, 183074);
  assert.equal(file.subarray(0,8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(file.readUInt32BE(16), 1470);
  assert.equal(file.readUInt32BE(20), 1594);
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const members = readFileSync(new URL("../app/citizens.ts", import.meta.url), "utf8");
  assert.match(page, /citizen\.id === "amberina"/);
  assert.match(page, /src="\/amberina-personal-simple\.png"/);
  assert.doesNotMatch(page, /case "snow":/);
  assert.match(members, /markColor: "#F3ED87", motif: "snow"/);
});
