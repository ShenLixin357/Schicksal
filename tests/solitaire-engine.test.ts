import assert from "node:assert/strict";
import test from "node:test";
import {
  applyMove,
  cloneGame,
  createCandidateGame,
  createVerifiedGame,
  faceDownCount,
  findHint,
  getLegalMoves,
  hashState,
  isWon,
  moveKey,
  scoreMove,
  solveGame,
  SUIT_ORDER,
  VERIFIED_DEALS,
  type Card,
  type GameMove,
  type GameState,
  type SuitId,
} from "../app/club/solitaire-engine.ts";

function card(suit: SuitId, rank: number, faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp };
}

function sparseGame(tableau: Card[][], waste: Card[] = []): GameState {
  return {
    seed: 999,
    stock: [],
    waste,
    foundations: { sun: [], crystal: [], moon: [], ember: [] },
    tableau: [...tableau, ...Array.from({ length: Math.max(0, 7 - tableau.length) }, () => [])],
    moves: 0,
    action: 0,
    stockPasses: 0,
    deal: { solverVerified: true, solutionLength: 0, nodesSearched: 0, source: "solver-cache" },
  };
}

function canRevealWithin(start: GameState, baselineHidden: number, depth: number) {
  const queue: Array<{ game: GameState; depth: number }> = [{ game: start, depth: 0 }];
  const seen = new Set([hashState(start)]);
  while (queue.length) {
    const current = queue.shift()!;
    if (faceDownCount(current.game) < baselineHidden) return true;
    if (current.depth >= depth) continue;
    for (const move of getLegalMoves(current.game)) {
      const next = applyMove(current.game, move)!;
      const hash = hashState(next);
      if (seen.has(hash)) continue;
      seen.add(hash);
      queue.push({ game: next, depth: current.depth + 1 });
    }
  }
  return false;
}

test("every cached deal is solver-verified", { timeout: 60000 }, () => {
  assert.ok(VERIFIED_DEALS.length >= 8);
  VERIFIED_DEALS.forEach((record, index) => {
    const game = createVerifiedGame(index);
    assert.equal(game.seed, record.seed);
    assert.equal(game.deal.solverVerified, true);
    const result = solveGame(game, { maxNodes: 50000, maxMs: 6000 });
    assert.equal(result.status, "solved", `seed ${record.seed} must remain solvable`);
    assert.ok(result.path.length > 0);
    let replay = game;
    result.path.forEach((move) => { replay = applyMove(replay, move)!; });
    assert.equal(isWon(replay), true, `seed ${record.seed} solution must replay to a win`);
  });
});

test("canonical hash ignores counters and tableau column permutations", () => {
  const game = createCandidateGame(2);
  const equivalent = cloneGame(game);
  equivalent.moves = 91;
  equivalent.action = 144;
  equivalent.stockPasses = 12;
  equivalent.tableau = [equivalent.tableau[3], equivalent.tableau[0], equivalent.tableau[6], equivalent.tableau[2], equivalent.tableau[5], equivalent.tableau[1], equivalent.tableau[4]];
  assert.equal(hashState(game), hashState(equivalent));

  const strategicallyDifferent = cloneGame(game);
  strategicallyDifferent.stock[strategicallyDifferent.stock.length - 1] = {
    ...strategicallyDifferent.stock[strategicallyDifferent.stock.length - 1],
    faceUp: true,
  };
  assert.notEqual(hashState(game), hashState(strategicallyDifferent));
});

test("hint rejects immediate A↔B reversal and a three-state A→B→C→A cycle", async () => {
  const stateA = sparseGame([
    [card("crystal", 8), card("moon", 7)],
    [card("sun", 8)],
    [card("crystal", 8)],
  ], [card("ember", 1)]);
  const moveAB: GameMove = { type: "transfer", source: { zone: "tableau", column: 0, cardIndex: 1 }, target: { zone: "tableau", column: 1 } };
  const stateB = applyMove(stateA, moveAB)!;
  const moveBC: GameMove = { type: "transfer", source: { zone: "tableau", column: 1, cardIndex: 1 }, target: { zone: "tableau", column: 2 } };
  const stateC = applyMove(stateB, moveBC)!;
  const cycleMove: GameMove = { type: "transfer", source: { zone: "tableau", column: 2, cardIndex: 1 }, target: { zone: "tableau", column: 0 } };
  assert.equal(hashState(applyMove(stateC, cycleMove)!), hashState(stateA));

  const hint = await findHint(stateC, {
    recentStateHashes: [hashState(stateA), hashState(stateB), hashState(stateC)],
    recentHintMoveKeys: [moveKey(moveAB), moveKey(moveBC)],
    recentHintResultHashes: [hashState(stateB), hashState(stateC)],
    solverMaxNodes: 1000,
    solverMaxMs: 100,
  });
  assert.equal(hint.status, "move");
  if (hint.status === "move") {
    assert.notEqual(moveKey(hint.move), moveKey(cycleMove));
    assert.notEqual(hint.resultHash, hashState(stateA));
  }
});

test("bounded hint search finds a preparatory move before a hidden-card reveal", { timeout: 10000 }, async () => {
  const initial = createCandidateGame(2);
  const solution = solveGame(initial, { maxNodes: 10000, maxMs: 5000 });
  assert.equal(solution.status, "solved");
  let position = initial;
  solution.path.slice(0, 19).forEach((move) => {
    position = applyMove(position, move)!;
  });

  const baselineHidden = faceDownCount(position);
  const hint = await findHint(position, { shallowDepth: 3, solverMaxNodes: 1000, solverMaxMs: 300 });
  assert.equal(hint.status, "move");
  if (hint.status !== "move") return;
  assert.equal(hint.source, "lookahead");
  assert.ok(scoreMove(position, hint.move) < 180, "the first move is deliberately not immediate progress");
  const afterFirst = applyMove(position, hint.move)!;
  assert.equal(canRevealWithin(afterFirst, baselineHidden, 2), true, "the preparatory hint reaches a reveal within two more moves");
});

test("verified deal metadata covers all four foundations", () => {
  const game = createVerifiedGame(0);
  assert.deepEqual(Object.keys(game.foundations), SUIT_ORDER);
  assert.equal(game.deal.source, "solver-cache");
});
