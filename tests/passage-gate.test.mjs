import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createPassageGate } from "../app/transitions/passage-gate.ts";

function passage(ready = false) {
  const events = [];
  const gate = createPassageGate({
    onSwap: () => events.push("swap"),
    onFinish: () => events.push("finish"),
    onWait: () => events.push("wait"),
    onFailure: () => events.push("failure"),
  }, ready);
  return { gate, events };
}

test("repeated skips leave the source visible until resources arrive and swap only once", () => {
  const { gate, events } = passage();
  gate.finishMotion();
  gate.finishMotion();
  assert.equal(gate.swap(), false);
  assert.deepEqual(events, ["wait"]);
  gate.destinationReady();
  gate.destinationReady();
  gate.finishMotion();
  assert.deepEqual(events, ["wait", "swap", "finish"]);
});

test("a ready destination swaps once whether the animation is skipped or played through", () => {
  const instant = passage(true);
  instant.gate.finishMotion();
  assert.deepEqual(instant.events, ["swap", "finish"]);
  const animated = passage();
  animated.gate.destinationReady();
  assert.deepEqual(animated.events, []);
  assert.equal(animated.gate.swap(), true);
  animated.gate.finishMotion();
  assert.deepEqual(animated.events, ["swap", "finish"]);
});

test("resource failure and unmount prevent late completion", () => {
  const failed = passage();
  failed.gate.finishMotion();
  failed.gate.destinationFailed();
  failed.gate.destinationReady();
  assert.deepEqual(failed.events, ["wait", "failure"]);
  const cancelled = passage();
  cancelled.gate.cancel();
  cancelled.gate.destinationReady();
  cancelled.gate.finishMotion();
  assert.deepEqual(cancelled.events, []);
});

test("public and React opening screens expose an accessible whole-screen skip with no visible prompt", () => {
  const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const entry = read("app/entry-screen.ts");
  const page = read("app/page.tsx");
  assert.match(entry, /class="opening-skip-surface"[^>]*aria-label="[^"]+"><\/button>/);
  assert.match(page, /className="opening-skip-surface"[^>]*aria-label=\{PASSAGE_SKIP_LABEL\}/);
  assert.doesNotMatch(entry + page, /SKIP INTRO/);
  assert.match(read("app/entry.css"), /\.opening-skip-surface\s*\{[^}]*inset:0/);
});
