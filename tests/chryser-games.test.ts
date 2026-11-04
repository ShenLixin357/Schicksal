import assert from "node:assert/strict";
import test from "node:test";
import { generateSigilBoard, getSigilHint, isSigilBoard, rotateSigilMask, traceSigilLight, turnSigil } from "../app/club/minigames/jade-sigil-engine.ts";
import { checkEchoInput, completeEchoRound, createEcho, extendEcho, isEchoState } from "../app/club/minigames/ember-echo-engine.ts";

test("every generated sigil board has a fully connected, leak-free solution", () => {
  for (const size of [4, 5]) {
    for (let seed = 1; seed <= 24; seed += 1) {
      const board = generateSigilBoard(seed * 7387, size);
      assert.equal(isSigilBoard(board), true);
      assert.equal(traceSigilLight(board).complete, false);
      const solution = { ...board, cells: board.cells.map((cell) => ({ ...cell, rotation: 0 })) };
      assert.equal(traceSigilLight(solution).complete, true, `seed ${seed} size ${size}`);
      assert.equal(traceSigilLight(solution).leaks, 0);
    }
  }
});

test("sigil hints make finite progress even after player deviations", () => {
  for (let seed = 0; seed < 16; seed += 1) {
    let board = generateSigilBoard(seed * 13331, 5);
    for (const index of [9, 1, 14, 3, 9]) board = turnSigil(board, index);
    for (let attempt = 0; attempt < 100 && !traceSigilLight(board).complete; attempt += 1) {
      const hint = getSigilHint(board);
      assert.ok(hint, "unfinished board has a corrective hint");
      board = turnSigil(board, hint.index);
    }
    assert.equal(traceSigilLight(board).complete, true);
  }
});

test("rotations are clockwise, symmetric masks equivalent, and Undo snapshots unmodified", () => {
  assert.equal(rotateSigilMask(1, 1), 2);
  assert.equal(rotateSigilMask(2, 1), 4);
  assert.equal(rotateSigilMask(5, 2), 5);
  const board = generateSigilBoard(916);
  const before = JSON.stringify(board);
  const turned = turnSigil(board, 3);
  assert.equal(turned.moves, board.moves + 1);
  assert.equal(JSON.stringify(board), before);
  assert.equal(isSigilBoard(JSON.parse(JSON.stringify(turned))), true);
});

test("echo generation is reproducible and extensions preserve the known melody", () => {
  const echo = createEcho(923);
  assert.deepEqual(createEcho(923), echo);
  const extended = extendEcho(echo);
  assert.deepEqual(extended.sequence.slice(0, -1), echo.sequence);
  assert.equal(extended.sequence.length, echo.sequence.length + 1);
  assert.equal(isEchoState(JSON.parse(JSON.stringify(extended))), true);
});

test("echo input distinguishes prefixes, completed rounds, and mistakes", () => {
  assert.equal(checkEchoInput([0, 2, 1], [0]), "correct");
  assert.equal(checkEchoInput([0, 2, 1], [0, 2, 1]), "complete");
  assert.equal(checkEchoInput([0, 2, 1], [0, 1]), "wrong");
  assert.equal(checkEchoInput([0, 2, 1], [0, 2, 1, 0]), "wrong");
});

test("each completed echo round scores once and grows by exactly one note", () => {
  let echo = createEcho(700);
  for (let round = 1; round <= 15; round += 1) {
    echo = completeEchoRound(echo);
    assert.equal(echo.rounds, round);
    assert.equal(echo.sequence.length, round + 1);
    assert.equal(echo.score, 25 * round * (round + 1) / 2);
    assert.equal(echo.lives, 3);
  }
});
