import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { optionalPlatformProgress } from "../scripts/ice-fire/standalone-compat.mjs";

// The loader's onFileComplete callback in pinned games 1–4.
const callback = "(function(a){ return h5api.progress(a), (j.width = (a / 100) * i), f.crop(j); })";
function load(window) {
  const crop = [];
  const j = { width: 0 };
  const f = { crop(rect) { crop.push(rect.width); return rect.width; } };
  return { progress: runInNewContext(optionalPlatformProgress(callback), { window, j, i: 200, f }), crop };
}
test("loading reaches completion without the external platform SDK", () => {
  for (const window of [{}, { h5api: {} }]) {
    const { progress, crop } = load(window);
    assert.equal(progress(25), 50);
    assert.equal(progress(100), 200);
    assert.deepEqual(crop, [50, 200]);
  }
});
test("an available platform SDK still receives real progress", () => {
  const reports = [];
  const { progress, crop } = load({ h5api: { progress(value) { reports.push(value); } } });
  assert.equal(progress(80), 160);
  assert.deepEqual(reports, [80]);
  assert.deepEqual(crop, [160]);
});
test("unexpected upstream callbacks fail the import for review", () => {
  assert.throws(() => optionalPlatformProgress("unrelated code"), /review the pinned/);
  assert.throws(() => optionalPlatformProgress(callback + callback), /review the pinned/);
});
