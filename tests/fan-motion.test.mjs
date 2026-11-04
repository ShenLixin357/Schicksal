import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FAN_CYCLE_MS, FAN_MAX_SPREAD_DEG, FAN_RIB_COUNT, FAN_RADIUS, FAN_TILT_DEG, fanSpread, lacePanelGeometry, orientFanPoint, ribAngle, sampleFanMotion } from "../app/club/fan-motion.ts";

const sample = (phase) => sampleFanMotion(phase * FAN_CYCLE_MS);
const derivative = (phase, key) => (sample(phase + .00001)[key] - sample(phase - .00001)[key]) / .00002;

test("seventeen independent ribs gather at the same fixed bottom rivet", () => {
  assert.equal(FAN_RIB_COUNT, 17);
  for (const phase of [0, .137, .328, .487, .552, .619, .783, .927]) {
    const { openProgress, azimuth } = sample(phase);
    const angles = Array.from({ length: FAN_RIB_COUNT }, (_, i) => ribAngle(i, openProgress));
    assert.ok(Math.abs(angles[16] - angles[0] - fanSpread(openProgress)) < 1e-9);
    for (let i = 1; i < angles.length; i++) assert.ok(angles[i] > angles[i - 1]);
    const pivot = orientFanPoint(0, 0, azimuth);
    assert.equal(Math.hypot(pivot.x, pivot.y, pivot.z), 0);
  }
  assert.equal(fanSpread(1), FAN_MAX_SPREAD_DEG);
  assert.ok(fanSpread(sample(.55).openProgress) < 6);
});

test("random frozen frames change real rib spacing and 3D viewing angle", () => {
  const frames = [0, .137, .328, .487, .552, .619, .783, .927].map(sample);
  assert.ok(new Set(frames.map((f) => fanSpread(f.openProgress).toFixed(0))).size >= 7);
  assert.ok(new Set(frames.map((f) => f.azimuth.toFixed(0))).size === 8);
  assert.ok(frames.filter((f) => f.openProgress < .7).length >= 4);
  assert.ok(frames.some((f) => f.openProgress < .03));
  assert.ok(frames.some((f) => Math.abs(Math.cos(f.azimuth * Math.PI / 180)) < .3));
});

test("main axis describes a cone, not a flat Z spinner", () => {
  const radius = FAN_RADIUS * Math.sin(FAN_TILT_DEG * Math.PI / 180);
  const points = Array.from({ length: 100 }, (_, i) => orientFanPoint(0, -FAN_RADIUS, i * 3.6));
  for (const p of points) {
    assert.ok(Math.abs(Math.hypot(p.x, p.z) - radius) < 1e-8);
    assert.ok(Math.abs(p.y + FAN_RADIUS * Math.cos(FAN_TILT_DEG * Math.PI / 180)) < 1e-8);
  }
  const front = orientFanPoint(100, 0, 0);
  const edge = orientFanPoint(100, 0, 90);
  assert.ok(Math.abs(front.x) > 99);
  assert.ok(Math.abs(edge.x) < .001);
  assert.ok(Math.abs(edge.z) > 99);
});

test("wrist inertia, fast release, late blooming linger, seamless joint", () => {
  const speeds = [.02, .3, .53, .568, .59, .82, .978].map((p) => derivative(p, "azimuth"));
  assert.ok(Math.max(...speeds) / Math.min(...speeds) > 5);
  assert.ok(derivative(.63, "openProgress") > derivative(.975, "openProgress") * 10);
  assert.ok(Math.abs(derivative(.52, "openProgress")) > Math.abs(derivative(.1, "openProgress")) * 2);
  assert.ok(sample(.94).openProgress > .97);
  assert.ok(sample(.99).openProgress > .998);
  const before = sample(1 - .00001);
  const after = sample(.00001);
  assert.ok(Math.abs(before.openProgress - after.openProgress) < .000001);
  assert.ok(Math.abs((before.azimuth - 360) - after.azimuth) < .003);
  const endingSpeed = (360 - before.azimuth) / .00001;
  const startingSpeed = after.azimuth / .00001;
  assert.ok(Math.abs(endingSpeed - startingSpeed) < 1);
});

test("folding lace vertices change and remain finite across the whole cycle", () => {
  let previous = -1;
  for (let i = 0; i < 1000; i++) {
    const frame = sample(i / 1000);
    assert.ok(frame.azimuth >= previous);
    previous = frame.azimuth;
    const panel = lacePanelGeometry(frame.openProgress);
    for (const path of Object.values(panel)) assert.ok(!/NaN|Infinity|undefined/.test(path));
  }
  assert.notEqual(lacePanelGeometry(1).leaf, lacePanelGeometry(.02).leaf);
  assert.notEqual(lacePanelGeometry(1).embroidery, lacePanelGeometry(.02).embroidery);
});

// Transpile only these isolated components in memory, without starting a browser.
async function componentModule(name) {
  const file = new URL(`../app/club/${name}.tsx`, import.meta.url);
  let code = ts.transpileModule(await readFile(file, "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const specifier of ["react", "react/jsx-runtime"]) {
    code = code.replaceAll(`from "${specifier}"`, `from ${JSON.stringify(import.meta.resolve(specifier))}`);
  }
  code = code.replaceAll('from "./fan-motion"', `from ${JSON.stringify(new URL("../app/club/fan-motion.ts", import.meta.url).href)}`);
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

test("actual rendered frozen frames preserve pivot/orbit/fan hierarchy and articulated ribs", async () => {
  const { ArticulatedFan } = await componentModule("articulated-fan");
  for (const phase of [.137, .328, .487, .552, .619, .783, .927]) {
    const expected = sample(phase);
    const html = renderToStaticMarkup(createElement(ArticulatedFan, { frozenAtMs: phase * FAN_CYCLE_MS }));
    assert.match(html, /fan-loading-scene[\s\S]*fan-fixed-pivot[\s\S]*fan-orbit-rig[\s\S]*fan-rig/);
    assert.ok(html.includes(`data-open-progress="${expected.openProgress.toFixed(4)}"`));
    assert.ok(html.includes(`data-azimuth="${expected.azimuth.toFixed(3)}"`));
    assert.equal((html.match(/data-fan-rib=/g) || []).length, 17);
    assert.equal((html.match(/data-fan-panel=/g) || []).length, 16);
    assert.ok(html.includes(`rotate(${ribAngle(0, expected.openProgress)})`));
    assert.ok(!/scaleX|scaleY|rotateZ|<image|<img/.test(html));
  }
});

test("room marks are a faceted crescent and a layered igniting flame, not emoji", async () => {
  const { MysticSigil } = await componentModule("mystic-marks");
  const moon = renderToStaticMarkup(createElement(MysticSigil, { memberId: "amberina" }));
  const flame = renderToStaticMarkup(createElement(MysticSigil, { memberId: "zxy" }));
  assert.equal((moon.match(/<polygon/g) || []).length, 14);
  assert.ok(!/❄|☾/.test(moon));
  assert.ok(!/♨/.test(flame));
  assert.match(flame, /green-smolder-seed[\s\S]*green-flame-ignition[\s\S]*green-flame-heart/);
});
