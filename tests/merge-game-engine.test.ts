import assert from "node:assert/strict";
import test from "node:test";
import {
  radiusForTier,
  scoreForTier,
  stepMergePhysics,
  updateDangerTimer,
  type MergeBody,
} from "../app/club/minigames/merge-game-engine.ts";

function body(id: number, tier: number, x: number, y: number): MergeBody {
  return { id, tier, x, y, vx: 0, vy: 0, bornAt: 0, popUntil: 0 };
}

test("equal tiers merge once at their midpoint and award centralized tier score", () => {
  const result = stepMergePhysics([body(1, 2, 200, 300), body(2, 2, 238, 300)], {
    width: 460, height: 620, dt: 0, now: 1000, nextId: 3,
  });
  assert.equal(result.merges.length, 1);
  assert.deepEqual(result.merges[0].sourceIds, [1, 2]);
  assert.equal(result.merges[0].body.tier, 3);
  assert.equal(result.merges[0].points, scoreForTier(3));
  assert.equal(result.bodies.length, 1);
});

test("unequal tiers collide but never merge", () => {
  const result = stepMergePhysics([body(1, 1, 200, 300), body(2, 2, 230, 300)], {
    width: 460, height: 620, dt: 0, now: 1000, nextId: 3,
  });
  assert.equal(result.merges.length, 0);
  assert.equal(result.bodies.length, 2);
});

test("three simultaneous equal contacts cannot consume one source twice", () => {
  const result = stepMergePhysics([body(1, 0, 200, 300), body(2, 0, 216, 300), body(3, 0, 232, 300)], {
    width: 460, height: 620, dt: 0, now: 1000, nextId: 4,
  });
  assert.equal(result.merges.length, 1);
  assert.equal(new Set(result.merges.flatMap((event) => event.sourceIds)).size, 2);
  assert.equal(result.bodies.length, 2, "one untouched body and one merged body remain");
});

test("danger line requires the full grace period and ignores newborn drops", () => {
  const radius = radiusForTier(0, 460);
  const high = body(1, 0, 220, 104 + radius - 2);
  high.bornAt = 1000;
  const newborn = updateDangerTimer([high], { width: 460, lineY: 104, now: 1500, previousSince: null, graceMs: 1800 });
  assert.equal(newborn.above, false);

  const entered = updateDangerTimer([high], { width: 460, lineY: 104, now: 2000, previousSince: null, graceMs: 1800 });
  assert.equal(entered.gameOver, false);
  const held = updateDangerTimer([high], { width: 460, lineY: 104, now: 3799, previousSince: entered.since, graceMs: 1800 });
  assert.equal(held.gameOver, false);
  const expired = updateDangerTimer([high], { width: 460, lineY: 104, now: 3800, previousSince: entered.since, graceMs: 1800 });
  assert.equal(expired.gameOver, true);
});
