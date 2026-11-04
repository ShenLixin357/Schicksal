import { isPotionComplete, isPotionPuzzle, POTION_DIFFICULTIES } from "./potion-sort-engine.ts";
import { isSigilBoard, traceSigilLight } from "./jade-sigil-engine.ts";
import { isEchoState } from "./ember-echo-engine.ts";
import { MERGE_TIERS } from "./merge-game-engine.ts";
import type { MiniGameId } from "./mini-game-types";

export const GAME_MEMBERS = [
  { id: "amberina", name: "玛法女巫", color: "#bedff4", mark: "☾" },
  { id: "zxy", name: "Lord Chryser", color: "#9cc797", mark: "♨" },
  { id: "truth", name: "Nishujiade", color: "#ddc58c", mark: "⟲" },
] as const;
export const GAME_BOARDS: Record<MiniGameId, { title: string; score: boolean; boards: { id: string; label: string }[] }> = {
  solitaire: { title: "天命纸牌", score: false, boards: [{ id: "classic", label: "经典翻一张" }] },
  "potion-sort": { title: "魔药分层", score: false, boards: [{ id: "apprentice", label: "学徒" }, { id: "alchemist", label: "炼金师" }, { id: "oracle", label: "秘仪师" }] },
  "merge-game": { title: "天命遗物合成", score: true, boards: [{ id: "classic", label: "经典合成" }] },
  "jade-sigils": { title: "翡翠导光阵", score: false, boards: [{ id: "4x4", label: "古典 · 4×4" }, { id: "5x5", label: "秘仪 · 5×5" }] },
  "ember-echo": { title: "余烬回声", score: true, boards: [{ id: "classic", label: "记忆试炼" }] },
};
export type GamePerformance = { gameId: MiniGameId; boardId: string; score: number; moves: number; durationMs: number; rounds: number; maxTier: number; rankPrimary: number; rankSecondary: number };
export type GameBest = GamePerformance & { citizenId: string; displayName: string; runId: string; achievedAt: string; rank?: number };
export type GameSubmission = { gameId: MiniGameId; runId: string; snapshot: unknown; durationMs: number; effortMoves: number };
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const count = (value: unknown, max = 100000) => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max;
export const isGameId = (id: unknown): id is MiniGameId => typeof id === "string" && Object.hasOwn(GAME_BOARDS, id);
export const isGameMember = (id: unknown): id is typeof GAME_MEMBERS[number]["id"] => GAME_MEMBERS.some((member) => member.id === id);
export const validBoard = (gameId: MiniGameId, boardId: string) => GAME_BOARDS[gameId].boards.some((board) => board.id === boardId);

export function snapshotBoard(gameId: MiniGameId, snapshot: unknown): string {
  const value = object(snapshot);
  if (gameId === "potion-sort") return String(object(value.puzzle).difficulty ?? "apprentice");
  if (gameId === "jade-sigils") return `${object(value.board).size ?? 4}x${object(value.board).size ?? 4}`;
  return "classic";
}
export function snapshotMoves(gameId: MiniGameId, snapshot: unknown): number {
  const value = object(snapshot), board = gameId === "potion-sort" ? object(value.puzzle) : gameId === "jade-sigils" ? object(value.board) : value;
  return count(board.moves) ? Number(board.moves) : 0;
}

// Strip histories and UI state before storing a small offline result envelope.
export function resultSnapshot(gameId: MiniGameId, snapshot: unknown): unknown {
  const value = object(snapshot);
  if (gameId === "potion-sort") return { version: 1, puzzle: value.puzzle, initialPuzzle: value.initialPuzzle };
  if (gameId === "jade-sigils") return { version: 1, board: value.board, initial: value.initial };
  return snapshot;
}

// Derive the result on both sides from the actual game snapshot. Client-sent
// score/rank/member fields are never used by the API. This validates a result
// state; it is not presented as a tamper-proof replay or competitive anti-cheat.
export function performanceFromSnapshot(gameId: MiniGameId, snapshot: unknown, elapsedMs: number, effortMoves = 0): GamePerformance | null {
  if (!count(elapsedMs, 604800000) || !count(effortMoves)) return null;
  const value = object(snapshot), boardId = snapshotBoard(gameId, snapshot);
  if (!validBoard(gameId, boardId)) return null;
  let score = 0, moves = 0, rounds = 0, maxTier = 0;
  if (gameId === "potion-sort") {
    const puzzle = value.puzzle, initial = value.initialPuzzle;
    if (!isPotionPuzzle(puzzle) || !isPotionPuzzle(initial) || !count(puzzle.moves) || puzzle.moves < 1 || puzzle.capacity !== 4 || initial.capacity !== 4 || puzzle.seed !== initial.seed || puzzle.difficulty !== initial.difficulty) return null;
    const settings = POTION_DIFFICULTIES[puzzle.difficulty];
    if (!settings || puzzle.bottles.length !== settings.colors + settings.emptyBottles || initial.bottles.length !== puzzle.bottles.length || !isPotionComplete(puzzle.bottles, 4) || isPotionComplete(initial.bottles, 4)) return null;
    const inventory = (bottles: readonly string[][]) => bottles.flat().reduce<Record<string, number>>((all, color) => { all[color] = (all[color] ?? 0) + 1; return all; }, {});
    const before = inventory(initial.bottles), after = inventory(puzzle.bottles);
    if (Object.keys(before).length !== settings.colors || Object.keys(after).length !== settings.colors || Object.keys(before).some((color) => before[color] !== 4 || after[color] !== 4)) return null;
    moves = puzzle.moves;
  } else if (gameId === "jade-sigils") {
    const board = value.board, initial = value.initial;
    if (!isSigilBoard(board) || !isSigilBoard(initial) || board.moves < 1 || board.moves > 100000 || initial.size !== board.size || initial.seed !== board.seed || initial.cells.some((cell, i) => cell.mask !== board.cells[i].mask) || !traceSigilLight(board).complete || traceSigilLight(initial).complete) return null;
    moves = board.moves;
  } else if (gameId === "solitaire") {
    if (!count(value.moves) || Number(value.moves) < 52 || !Array.isArray(value.stock) || value.stock.length || !Array.isArray(value.waste) || value.waste.length || !Array.isArray(value.tableau) || value.tableau.length !== 7 || value.tableau.some((pile) => !Array.isArray(pile) || pile.length)) return null;
    const foundations = object(value.foundations), ids = new Set<string>();
    for (const suit of ["sun", "crystal", "moon", "ember"]) {
      const pile = foundations[suit]; if (!Array.isArray(pile) || pile.length !== 13) return null;
      for (let rank = 1; rank <= 13; rank++) { const card = object(pile[rank - 1]); if (card.suit !== suit || card.rank !== rank || typeof card.id !== "string" || ids.has(card.id)) return null; ids.add(card.id); }
    }
    if (object(value.deal).solverVerified !== true) return null;
    moves = Number(value.moves);
  } else if (gameId === "ember-echo") {
    if (!isEchoState(value) || value.rounds < 1 || value.rounds > 255 || value.sequence.length !== value.rounds + 1 || value.score !== 25 * value.rounds * (value.rounds + 1) / 2) return null;
    score = value.score; rounds = value.rounds;
  } else {
    if (value.version !== 1 || !count(value.score, 100000000) || Number(value.score) < 1 || Number(value.score) % 20 !== 0 || !count(value.nextId, 1000000) || Number(value.nextId) < 2 || !Array.isArray(value.bodies) || !value.bodies.length || value.bodies.length > 200) return null;
    const ids = new Set<number>();
    for (const bodyValue of value.bodies) {
      const body = object(bodyValue);
      if (!count(body.id, 1000000) || ids.has(Number(body.id)) || !count(body.tier, MERGE_TIERS.length - 1) || ![body.x, body.y, body.vx, body.vy].every((item) => typeof item === "number" && Number.isFinite(item))) return null;
      ids.add(Number(body.id)); maxTier = Math.max(maxTier, Number(body.tier));
    }
    score = Number(value.score);
    if (maxTier < 1) return null;
  }
  moves = Math.max(moves, effortMoves);
  const durationMs = Math.max(1000, Math.floor(elapsedMs / 1000) * 1000), scored = GAME_BOARDS[gameId].score;
  return { gameId, boardId, score, moves, durationMs, rounds, maxTier, rankPrimary: scored ? -score : moves, rankSecondary: scored ? 0 : durationMs };
}
export function comparePerformance(a: Pick<GamePerformance, "rankPrimary" | "rankSecondary">, b: Pick<GamePerformance, "rankPrimary" | "rankSecondary">) {
  return a.rankPrimary - b.rankPrimary || a.rankSecondary - b.rankSecondary;
}
export function rankBests(rows: readonly GameBest[]): GameBest[] {
  const sorted = [...rows].sort((a, b) => comparePerformance(a, b) || a.achievedAt.localeCompare(b.achievedAt) || a.citizenId.localeCompare(b.citizenId));
  return sorted.map((row, i) => ({ ...row, rank: i && comparePerformance(row, sorted[i - 1]) === 0 ? sorted.findIndex((other) => comparePerformance(other, row) === 0) + 1 : i + 1 }));
}
export function gameTime(ms: number) { const seconds = Math.floor(ms / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
export function recordLabel(row: GamePerformance) { return GAME_BOARDS[row.gameId].score ? `${row.score.toLocaleString()} 分` : `${row.moves} 步 · ${gameTime(row.durationMs)}`; }

export const BEST_UPSERT_SQL = `INSERT INTO lounge_game_bests
  (game_id, board_id, citizen_id, run_id, score, moves, duration_ms, rounds, max_tier, rank_primary, rank_secondary, achieved_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(game_id, board_id, citizen_id) DO UPDATE SET
    run_id=excluded.run_id, score=excluded.score, moves=excluded.moves, duration_ms=excluded.duration_ms,
    rounds=excluded.rounds, max_tier=excluded.max_tier, rank_primary=excluded.rank_primary,
    rank_secondary=excluded.rank_secondary, achieved_at=excluded.achieved_at
  WHERE excluded.rank_primary < lounge_game_bests.rank_primary
    OR (excluded.rank_primary = lounge_game_bests.rank_primary AND excluded.rank_secondary < lounge_game_bests.rank_secondary)`;
