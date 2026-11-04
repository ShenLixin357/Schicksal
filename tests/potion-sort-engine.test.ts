import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPotionMove,
  generatePotionLevel,
  getPotionPour,
  isPotionComplete,
  POTION_DIFFICULTIES,
  potionStateHash,
  verifyPotionSolution,
  type PotionDifficultyId,
} from "../app/club/minigames/potion-sort-engine.ts";

test("generated levels across every difficulty carry a replayable winning path", () => {
  (Object.keys(POTION_DIFFICULTIES) as PotionDifficultyId[]).forEach((difficulty, difficultyIndex) => {
    for (let sample = 0; sample < 16; sample += 1) {
      const level = generatePotionLevel(difficulty, difficultyIndex * 10_000 + sample * 97 + 11);
      assert.equal(level.difficulty, difficulty);
      assert.equal(isPotionComplete(level.bottles, level.capacity), false);
      assert.equal(verifyPotionSolution(level), true, `${difficulty} seed ${level.seed} must replay to a win`);
      assert.ok(level.knownSolution.length > 0);
    }
  });
});

test("a legal pour moves the entire contiguous top run that fits", () => {
  const bottles = [["amber", "garnet", "garnet"], ["garnet"], []] as const;
  const move = getPotionPour(bottles, 0, 1, 4);
  assert.deepEqual(move, { from: 0, to: 1, color: "garnet", count: 2 });
  const result = applyPotionMove(bottles, move!, 4);
  assert.deepEqual(result?.bottles, [["amber"], ["garnet", "garnet", "garnet"], []]);
});

test("illegal colors, full targets, and self-pours are rejected without mutation", () => {
  const bottles = [["amber"], ["garnet"], ["amber", "amber", "amber", "amber"]] as const;
  const before = potionStateHash(bottles);
  assert.equal(getPotionPour(bottles, 0, 1, 4), null);
  assert.equal(getPotionPour(bottles, 0, 2, 4), null);
  assert.equal(getPotionPour(bottles, 0, 0, 4), null);
  assert.equal(potionStateHash(bottles), before);
});
