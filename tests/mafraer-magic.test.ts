import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BROOM_DOCK, BROOM_HOME, BROOM_WINDOW, MAGIC_TIMING, beginGesture, chargeAt, curtainPoint, finishGesture, inertiaStep, moveGesture, pillowPose, quiltPoint, recallPose, settled, springStep, windowPoint } from "../app/club/mafraer-magic-motion.ts";

test("short taps and stationary holds trigger different actions, with capped charge", () => {
  const down = beginGesture(4, { x: 10, y: 10 }, 1000);
  const jitter = moveGesture(down, 4, { x: 12, y: 11 });
  assert.equal(finishGesture(jitter, 4, 1190), "tap");
  assert.equal(chargeAt(jitter, 1190), 0);
  assert.equal(finishGesture(down, 4, 1299), "tap");
  assert.equal(finishGesture(down, 4, 1300), "weather");
  assert.equal(finishGesture(down, 4, 2100), "weather");
  assert.ok(chargeAt(down, 2100) > .6 && chargeAt(down, 2100) < .8);
  assert.equal(chargeAt(down, 2500), 1);
  assert.equal(chargeAt(down, 40000), 1);
});

test("dragging after charging cancels weather, even when the pointer returns to its origin", () => {
  let gesture = beginGesture(7, { x: 50, y: 60 }, 0);
  assert.ok(chargeAt(gesture, 900) > 0);
  gesture = moveGesture(gesture, 7, { x: 68, y: 64 });
  gesture = moveGesture(gesture, 7, { x: 50, y: 60 });
  assert.equal(chargeAt(gesture, 1700), 0);
  assert.equal(finishGesture(gesture, 7, 1700), "drag");
});

test("another pointer cannot steal a gesture and cancellation cannot emit a tap or weather", () => {
  const held = beginGesture(3, { x: 0, y: 0 }, 0);
  assert.equal(moveGesture(held, 8, { x: 100, y: 100 }), held);
  assert.equal(finishGesture(held, 8, 1700), "none");
  assert.equal(finishGesture(held, 3, 1700, true), "none");
  assert.equal(finishGesture(null, 3, 1700), "none");
});

test("recall is a curved, eased flight with perspective and exact docking endpoints", () => {
  const start = recallPose(BROOM_HOME, BROOM_DOCK, 0), end = recallPose(BROOM_HOME, BROOM_DOCK, 1);
  assert.equal(start.x, BROOM_HOME.x); assert.equal(start.y, BROOM_HOME.y);
  assert.equal(end.x, BROOM_DOCK.x); assert.equal(end.y, BROOM_DOCK.y);
  const middle = recallPose(BROOM_HOME, BROOM_DOCK, .5);
  assert.ok(middle.y < Math.min(BROOM_HOME.y, BROOM_DOCK.y) - 10);
  assert.ok(Math.abs(middle.yaw) > 30);
  const first = recallPose(BROOM_HOME, BROOM_DOCK, .01), later = recallPose(BROOM_HOME, BROOM_DOCK, .5), next = recallPose(BROOM_HOME, BROOM_DOCK, .51);
  assert.ok(Math.hypot(first.x - start.x, first.y - start.y) < Math.hypot(next.x - later.x, next.y - later.y) * .2);
  for (let i = 0; i <= 100; i++) {
    const point = recallPose(BROOM_HOME, BROOM_DOCK, i / 100);
    assert.ok(point.x >= BROOM_WINDOW.left && point.x <= BROOM_WINDOW.right);
    assert.ok(point.y >= BROOM_WINDOW.top && point.y <= BROOM_WINDOW.bottom);
  }
});

test("released broom retains inertia then settles to the same dock at several frame rates", () => {
  const outcomes = [30, 60, 120].map((fps) => {
    let position = { x: 1160, y: 542, vx: 65, vy: -22 };
    const initial = { ...position };
    position = springStep(position, BROOM_DOCK, 1 / fps);
    assert.ok(position.x > initial.x); // Incoming velocity wasn't thrown away.
    for (let i = 1; i < fps * 5; i++) position = springStep(position, BROOM_DOCK, 1 / fps);
    assert.ok(settled(position, BROOM_DOCK)); return position;
  });
  assert.ok(Math.hypot(outcomes[0].x - outcomes[2].x, outcomes[0].y - outcomes[2].y) < .05);
  assert.deepEqual(windowPoint({ x: -400, y: 3000 }), { x: BROOM_WINDOW.left, y: BROOM_WINDOW.bottom });
  const droppedFrame = springStep({ x: 1200, y: 520, vx: 0, vy: 0 }, BROOM_DOCK, 10);
  assert.ok(Object.values(droppedFrame).every(Number.isFinite));
});

test("quilt corners articulate at different times instead of moving as one flat rectangle", () => {
  const origin = { x: 480, y: 600 };
  const left = quiltPoint(origin, 0, 1, .65), right = quiltPoint(origin, 1, 1, .65);
  assert.ok(Math.abs(left.y - right.y) > 12);
  const head = quiltPoint(origin, .5, 0, 1.8), hem = quiltPoint(origin, .5, 1, 1.8);
  assert.ok(origin.y - hem.y > (origin.y - head.y) * 2);
  for (const u of [0, .4, 1]) for (const v of [0, .5, 1]) assert.deepEqual(quiltPoint(origin, u, v, MAGIC_TIMING.bed / 1000), origin);
});

test("pillows land independently and curtain hems close while their upper attachments stay fixed", () => {
  assert.notEqual(pillowPose(0, 1.1).y, pillowPose(2, 1.1).y);
  for (let index = 0; index < 3; index++) assert.equal(Math.hypot(...Object.values(pillowPose(index, 5.6))), 0);
  const source = { x: 440, y: 450 };
  assert.deepEqual(curtainPoint(source, .5, 0, "left", 1), source);
  assert.deepEqual(curtainPoint(source, .5, .5, "left", 0), source);
  assert.ok(curtainPoint(source, .5, 1, "left", 1).x > source.x + 100);
  assert.ok(curtainPoint(source, .5, 1, "right", 1).x < source.x - 95);
});

test("galaxy momentum decays consistently and eventually stops rendering", () => {
  const after = (fps: number) => { let velocity = 3; for (let i = 0; i < fps; i++) velocity = inertiaStep(velocity, 1 / fps); return velocity; };
  assert.ok(Math.abs(after(30) - after(120)) < 1e-12);
  let velocity = 3; for (let i = 0; i < 300; i++) velocity = inertiaStep(velocity, 1 / 60);
  assert.equal(velocity, 0);
});

test("source and cleaned lighting states are registered to one unmodified room canvas", () => {
  for (const name of ["mafraer-ice-bedroom-moonlit-v4.png", "mafraer-ice-bedroom-lit-v4.png", "mafraer-palace-clean-moonlit-v1.png", "mafraer-palace-clean-lit-v1.png"]) {
    const png = readFileSync(new URL(`../public/${name}`, import.meta.url));
    assert.equal(png.readUInt32BE(16), 1672, name); assert.equal(png.readUInt32BE(20), 941, name);
  }
  for (const name of ["mafraer-ice-broom-v1.png", "mafraer-crystal-shell-v1.png"]) {
    const png = readFileSync(new URL(`../public/${name}`, import.meta.url));
    assert.equal(png[25], 6, `${name} must have an alpha channel`);
  }
});
