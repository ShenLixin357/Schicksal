import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { BEST_UPSERT_SQL, comparePerformance, GAME_BOARDS, isGameId, performanceFromSnapshot, rankBests, type GameBest, type GamePerformance } from "../app/club/minigames/game-records.ts";
import { applyPotionMove, generatePotionLevel, isPotionComplete } from "../app/club/minigames/potion-sort-engine.ts";
import { generateSigilBoard, traceSigilLight } from "../app/club/minigames/jade-sigil-engine.ts";
import { completeEchoRound, createEcho } from "../app/club/minigames/ember-echo-engine.ts";
import { cookieToken, digest, sameOrigin, sessionCookie } from "../app/member-session-core.ts";

function db() {
  const database = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../drizzle", import.meta.url)).filter((name) => name.endsWith(".sql")).sort()) database.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  return database;
}
function potion(seed = 1729) {
  const initial = generatePotionLevel("apprentice", seed); let bottles = initial.bottles.map((bottle) => [...bottle]);
  for (const move of initial.knownSolution) { const next = applyPotionMove(bottles, move, 4); assert.ok(next); bottles = next.bottles; }
  assert.ok(isPotionComplete(bottles, 4));
  return { version: 1, puzzle: { ...initial, bottles, moves: initial.knownSolution.length, complete: true }, initialPuzzle: initial };
}
function echo(rounds: number) { let state = createEcho(77); for (let i = 0; i < rounds; i++) state = completeEchoRound(state); return state; }
function merge(score: number) { return { version: 1, score, nextTier: 1, rngSeed: 1, nextId: 4, gameOver: false, bodies: [{ id: 3, tier: 1, x: 180, y: 500, vx: 0, vy: 0, bornAt: 0, popUntil: 0 }] }; }
function put(database: DatabaseSync, performance: GamePerformance, citizen = "amberina", runId = "run-000001") {
  return database.prepare(BEST_UPSERT_SQL).run(performance.gameId, performance.boardId, citizen, runId, performance.score, performance.moves, performance.durationMs, performance.rounds, performance.maxTier, performance.rankPrimary, performance.rankSecondary, "2026-11-04T01:00:00.000Z");
}
const bestRow = (performance: GamePerformance, citizenId: string): GameBest => ({ ...performance, citizenId, displayName: citizenId, runId: "test-run-1", achievedAt: "2026-11-04T01:00:00.000Z" });

test("all five games have explicit board rules; unavailable and prototype names cannot select a game", () => {
  assert.equal(Object.keys(GAME_BOARDS).length, 5); assert.equal(isGameId("__proto__"), false); assert.equal(isGameId("constructor"), false);
  assert.deepEqual(GAME_BOARDS["potion-sort"].boards.map((board) => board.id), ["apprentice", "alchemist", "oracle"]);
  assert.deepEqual(GAME_BOARDS["jade-sigils"].boards.map((board) => board.id), ["4x4", "5x5"]);
});

test("a genuinely solved potion game is accepted, while unfinished and empty boards never rank", () => {
  const snapshot = potion(); const result = performanceFromSnapshot("potion-sort", snapshot, 45001, snapshot.puzzle.moves + 2);
  assert.ok(result); assert.equal(result.moves, snapshot.puzzle.moves + 2); assert.equal(result.durationMs, 45000);
  assert.equal(performanceFromSnapshot("potion-sort", { ...snapshot, puzzle: snapshot.initialPuzzle }, 45000), null);
  assert.equal(performanceFromSnapshot("potion-sort", { ...snapshot, puzzle: { ...snapshot.puzzle, bottles: [] } }, 45000), null);
  assert.equal(performanceFromSnapshot("potion-sort", { ...snapshot, puzzle: { ...snapshot.puzzle, bottles: snapshot.puzzle.bottles.map(() => []) } }, 45000), null);
});

test("both actual sigil sizes produce separate, validated completion results", () => {
  for (const size of [4, 5]) {
    const initial = generateSigilBoard(131, size), board = { ...initial, cells: initial.cells.map((cell) => ({ ...cell, rotation: 0 })), moves: 30 };
    assert.ok(traceSigilLight(board).complete);
    assert.equal(performanceFromSnapshot("jade-sigils", { initial, board }, 60000)?.boardId, `${size}x${size}`);
    assert.equal(performanceFromSnapshot("jade-sigils", { initial, board: initial }, 60000), null);
  }
});

test("Solitaire requires all 52 unique, correctly ordered cards, a verified deal and a completed table", () => {
  const foundations = Object.fromEntries(["sun", "crystal", "moon", "ember"].map((suit) => [suit, Array.from({ length: 13 }, (_, i) => ({ id: `${suit}-${i + 1}`, suit, rank: i + 1, faceUp: true }))]));
  const snapshot = { foundations, stock: [], waste: [], tableau: Array.from({ length: 7 }, () => []), moves: 120, deal: { solverVerified: true } };
  assert.ok(performanceFromSnapshot("solitaire", snapshot, 300000));
  assert.equal(performanceFromSnapshot("solitaire", { ...snapshot, moves: 1 }, 300000), null);
  assert.equal(performanceFromSnapshot("solitaire", { ...snapshot, stock: [foundations.sun[0]] }, 300000), null);
  const invalid = structuredClone(snapshot); invalid.foundations.sun[3].rank = 1;
  assert.equal(performanceFromSnapshot("solitaire", invalid, 300000), null);
});

test("echo scores follow actual completed rounds; changed score fields and unfinished runs are rejected", () => {
  const snapshot = echo(4), result = performanceFromSnapshot("ember-echo", snapshot, 100000);
  assert.equal(result?.score, 250); assert.equal(result.rounds, 4);
  assert.equal(performanceFromSnapshot("ember-echo", { ...snapshot, score: 999999 }, 100000), null);
  assert.equal(performanceFromSnapshot("ember-echo", createEcho(77), 100000), null);
});

test("score states reject NaN, impossible tiers, zero points and invalid clocks", () => {
  assert.equal(performanceFromSnapshot("merge-game", merge(0), 1000), null);
  assert.equal(performanceFromSnapshot("merge-game", merge(21), 1000), null);
  const invalid = merge(80); invalid.bodies[0].tier = 999;
  assert.equal(performanceFromSnapshot("merge-game", invalid, 1000), null);
  assert.equal(performanceFromSnapshot("merge-game", merge(80), NaN), null);
  assert.equal(performanceFromSnapshot("merge-game", merge(80), -100), null);
  assert.equal(performanceFromSnapshot("merge-game", merge(80), 9999999999), null);
});

test("real migrations plus conditional UPSERT retain the best score regardless of retry / arrival order", () => {
  for (const sequence of [[40, 120, 80, 120, 20], [120, 80, 40, 20, 120], [20, 40, 80, 120, 40]]) {
    const database = db();
    for (const score of sequence) { const result = performanceFromSnapshot("merge-game", merge(score), 60000)!; put(database, result); }
    const row = database.prepare("SELECT score, COUNT(*) AS count FROM lounge_game_bests").get();
    assert.equal(row?.score, 120); assert.equal(row?.count, 1); database.close();
  }
});

test("a slower or worse puzzle never replaces a best, and the same moves with a faster time do", () => {
  const database = db(), snapshot = potion(), base = performanceFromSnapshot("potion-sort", snapshot, 70000, 40)!;
  assert.equal(put(database, base).changes, 1);
  assert.equal(put(database, { ...base, durationMs: 90000, rankSecondary: 90000 }).changes, 0);
  assert.equal(put(database, { ...base, moves: 41, rankPrimary: 41, rankSecondary: 1000 }).changes, 0);
  assert.equal(put(database, { ...base, durationMs: 60000, rankSecondary: 60000 }).changes, 1);
  assert.equal(database.prepare("SELECT duration_ms AS time FROM lounge_game_bests").get()?.time, 60000); database.close();
});

test("member identity and difficulty stay isolated, and changing a mask preserves the same record", () => {
  const database = db(), result = performanceFromSnapshot("merge-game", merge(80), 60000)!;
  put(database, result, "amberina"); put(database, { ...result, score: 120, rankPrimary: -120 }, "zxy");
  const puzzle = performanceFromSnapshot("potion-sort", potion(), 60000)!;
  put(database, puzzle); put(database, { ...puzzle, boardId: "oracle" });
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM lounge_game_bests").get()?.count, 4);
  database.prepare("INSERT INTO committee_club_profiles (citizen_id, mask_name, avatar, updated_at) VALUES (?, ?, ?, ?)").run("amberina", "新的女巫面具", "crystal_ball", "2026-11-04");
  const row = database.prepare("SELECT b.score, p.mask_name AS name FROM lounge_game_bests b JOIN committee_club_profiles p ON p.citizen_id=b.citizen_id WHERE game_id='merge-game' AND b.citizen_id='amberina'").get();
  assert.equal(row?.score, 80); assert.equal(row?.name, "新的女巫面具"); database.close();
});

test("equal scores share competition ranks and do not get separated by a hidden timestamp", () => {
  const result = performanceFromSnapshot("merge-game", merge(120), 60000)!;
  const rows = rankBests([bestRow(result, "zxy"), bestRow({ ...result, score: 40, rankPrimary: -40 }, "truth"), bestRow(result, "amberina")]);
  assert.deepEqual(rows.map((row) => row.rank), [1, 1, 3]);
  assert.equal(comparePerformance(rows[0], rows[1]), 0);
});

test("member cookies are HTTP-only, secure in production, and untrusted cookie values are rejected", async () => {
  const token = "ab".repeat(32), request = new Request("https://example.test/", { headers: { cookie: `other=x; schicksal_member=${token}` } });
  assert.equal(cookieToken(request), token); assert.match(sessionCookie(request, token), /HttpOnly/); assert.match(sessionCookie(request, token), /Secure/); assert.match(sessionCookie(request, token), /SameSite=Lax/);
  assert.equal(cookieToken(new Request("https://example.test", { headers: { cookie: "schicksal_member=amberina" } })), null);
  assert.equal(sameOrigin(new Request("https://example.test/", { headers: { origin: "https://evil.test" } })), false);
  assert.equal(sameOrigin(new Request("https://example.test/", { headers: { origin: "https://example.test" } })), true);
  assert.equal((await digest(token)).length, 64); assert.notEqual(await digest(token), token);
});
