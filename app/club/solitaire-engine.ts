export type SuitId = "sun" | "crystal" | "moon" | "ember";
export type ColorFamily = "warm" | "cool";
export type Card = { id: string; suit: SuitId; rank: number; faceUp: boolean };
export type FoundationMap = Record<SuitId, Card[]>;

export type DealMetadata = {
  solverVerified: boolean;
  solutionLength: number;
  nodesSearched: number;
  source: "solver-cache" | "constructed-fallback";
};

export type GameState = {
  seed: number;
  stock: Card[];
  waste: Card[];
  foundations: FoundationMap;
  tableau: Card[][];
  moves: number;
  action: number;
  stockPasses: number;
  deal: DealMetadata;
};

export type Source =
  | { zone: "waste" }
  | { zone: "foundation"; suit: SuitId }
  | { zone: "tableau"; column: number; cardIndex: number };

export type Target =
  | { zone: "foundation"; suit: SuitId }
  | { zone: "tableau"; column: number };

export type TransferMove = { type: "transfer"; source: Source; target: Target };
export type DrawMove = { type: "draw" };
export type GameMove = TransferMove | DrawMove;

export type SolverResult = {
  status: "solved" | "unsolved" | "limit";
  path: GameMove[];
  nodesSearched: number;
  elapsedMs: number;
};

export type HintContext = {
  recentStateHashes?: readonly string[];
  recentHintMoveKeys?: readonly string[];
  recentHintResultHashes?: readonly string[];
  shallowDepth?: number;
  solverMaxNodes?: number;
  solverMaxMs?: number;
  requireSolvableContinuation?: boolean;
};

export type HintResult =
  | {
      status: "move";
      move: GameMove;
      reason: string;
      resultHash: string;
      score: number;
      source: "immediate" | "lookahead" | "solver";
      solver?: SolverResult;
    }
  | {
      status: "won" | "unsolved" | "limit";
      reason: string;
      solver?: SolverResult;
    };

export const SUIT_ORDER: SuitId[] = ["sun", "crystal", "moon", "ember"];
export const SUITS: Record<SuitId, { symbol: string; name: string; shortName: string; family: ColorFamily }> = {
  sun: { symbol: "☀", name: "日冕", shortName: "SOL", family: "warm" },
  crystal: { symbol: "◆", name: "紫晶", shortName: "CRYSTAL", family: "warm" },
  moon: { symbol: "☾", name: "冰月", shortName: "MOON", family: "cool" },
  ember: { symbol: "♠", name: "翡翠余烬", shortName: "EMBER", family: "cool" },
};

export const rankLabel = (rank: number) => rank === 1 ? "A" : rank === 11 ? "J" : rank === 12 ? "Q" : rank === 13 ? "K" : String(rank);

const DEFAULT_DEAL: DealMetadata = {
  solverVerified: false,
  solutionLength: 0,
  nodesSearched: 0,
  source: "solver-cache",
};

function emptyFoundations(): FoundationMap {
  return { sun: [], crystal: [], moon: [], ember: [] };
}

function randomFactory(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ next >>> 15, next | 1);
    next ^= next + Math.imul(next ^ next >>> 7, next | 61);
    return ((next ^ next >>> 14) >>> 0) / 4294967296;
  };
}

function fullDeck(): Card[] {
  return SUIT_ORDER.flatMap((suit) => Array.from({ length: 13 }, (_, index) => ({
    id: `${suit}-${index + 1}`,
    suit,
    rank: index + 1,
    faceUp: false,
  })));
}

export function createCandidateGame(seed: number): GameState {
  const normalizedSeed = seed >>> 0;
  const deck = fullDeck();
  const random = randomFactory(normalizedSeed);
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }
  const tableau = Array.from({ length: 7 }, (_, column) => Array.from({ length: column + 1 }, (_, row) => ({
    ...deck.pop()!,
    faceUp: row === column,
  })));
  return {
    seed: normalizedSeed,
    stock: deck,
    waste: [],
    foundations: emptyFoundations(),
    tableau,
    moves: 0,
    action: 0,
    stockPasses: 0,
    deal: { ...DEFAULT_DEAL },
  };
}

/**
 * Deterministic safety net used only if the checked-in verified pool is ever
 * unavailable. Cards are distributed from a random interleaving that preserves
 * A→K order inside each suit, so a legal foundation path is known by construction.
 */
export function createConstructedSolvableGame(seed: number): GameState {
  const normalizedSeed = seed >>> 0;
  const random = randomFactory(normalizedSeed);
  const nextRank: Record<SuitId, number> = { sun: 1, crystal: 1, moon: 1, ember: 1 };
  const ordered: Card[] = [];
  while (ordered.length < 52) {
    const available = SUIT_ORDER.filter((suit) => nextRank[suit] <= 13);
    const suit = available[Math.floor(random() * available.length)];
    const rank = nextRank[suit]++;
    ordered.push({ id: `${suit}-${rank}`, suit, rank, faceUp: false });
  }

  const capacities = [1, 2, 3, 4, 5, 6, 7, 24];
  const queues: Card[][] = Array.from({ length: 8 }, () => []);
  ordered.forEach((card) => {
    const available = capacities.map((capacity, index) => queues[index].length < capacity ? index : -1).filter((index) => index >= 0);
    const weighted = available.flatMap((index) => Array.from({ length: capacities[index] - queues[index].length }, () => index));
    const target = weighted[Math.floor(random() * weighted.length)];
    queues[target].push(card);
  });

  const tableau = queues.slice(0, 7).map((queue) => queue.slice().reverse().map((card, index, pile) => ({
    ...card,
    faceUp: index === pile.length - 1,
  })));
  const stock = queues[7].slice().reverse().map((card) => ({ ...card, faceUp: false }));
  return {
    seed: normalizedSeed,
    stock,
    waste: [],
    foundations: emptyFoundations(),
    tableau,
    moves: 0,
    action: 0,
    stockPasses: 0,
    deal: { solverVerified: true, solutionLength: 76, nodesSearched: 0, source: "constructed-fallback" },
  };
}

export function cloneGame(game: GameState): GameState {
  return {
    ...game,
    deal: { ...game.deal },
    stock: game.stock.map((card) => ({ ...card })),
    waste: game.waste.map((card) => ({ ...card })),
    foundations: Object.fromEntries(SUIT_ORDER.map((suit) => [suit, game.foundations[suit].map((card) => ({ ...card }))])) as FoundationMap,
    tableau: game.tableau.map((column) => column.map((card) => ({ ...card }))),
  };
}

export function sameSource(a: Source | null, b: Source) {
  if (!a || a.zone !== b.zone) return false;
  if (a.zone === "waste") return true;
  if (a.zone === "foundation" && b.zone === "foundation") return a.suit === b.suit;
  return a.zone === "tableau" && b.zone === "tableau" && a.column === b.column && a.cardIndex === b.cardIndex;
}

export function selectedCards(game: GameState, source: Source) {
  if (source.zone === "waste") return game.waste.length ? [game.waste[game.waste.length - 1]] : [];
  if (source.zone === "foundation") {
    const pile = game.foundations[source.suit];
    return pile.length ? [pile[pile.length - 1]] : [];
  }
  return game.tableau[source.column]?.slice(source.cardIndex) ?? [];
}

export function isValidRun(cards: Card[]) {
  return cards.every((card, index) => card.faceUp && (index === 0 || (
    cards[index - 1].rank === card.rank + 1 && SUITS[cards[index - 1].suit].family !== SUITS[card.suit].family
  )));
}

function canMoveToTableau(card: Card, destination: Card[]) {
  const top = destination.at(-1);
  if (!top) return card.rank === 13;
  return top.faceUp && top.rank === card.rank + 1 && SUITS[top.suit].family !== SUITS[card.suit].family;
}

function canMoveToFoundation(game: GameState, card: Card, suit: SuitId) {
  return card.suit === suit && card.rank === game.foundations[suit].length + 1;
}

export function tryMove(game: GameState, source: Source, target: Target): GameState | null {
  return applyMove(game, { type: "transfer", source, target });
}

export function applyMove(game: GameState, move: GameMove): GameState | null {
  if (move.type === "draw") {
    if (!game.stock.length && !game.waste.length) return null;
    const next = cloneGame(game);
    if (next.stock.length) {
      next.waste.push({ ...next.stock.pop()!, faceUp: true });
    } else {
      next.stock = next.waste.reverse().map((card) => ({ ...card, faceUp: false }));
      next.waste = [];
      next.stockPasses += 1;
    }
    next.moves += 1;
    next.action += 1;
    return next;
  }

  const { source, target } = move;
  if (source.zone === "tableau" && target.zone === "tableau" && source.column === target.column) return null;
  const moving = selectedCards(game, source);
  if (!moving.length || !isValidRun(moving)) return null;
  const lead = moving[0];
  if (target.zone === "foundation") {
    if (moving.length !== 1 || !canMoveToFoundation(game, lead, target.suit)) return null;
  } else if (!canMoveToTableau(lead, game.tableau[target.column])) {
    return null;
  }

  const next = cloneGame(game);
  if (source.zone === "waste") next.waste.pop();
  if (source.zone === "foundation") next.foundations[source.suit].pop();
  if (source.zone === "tableau") next.tableau[source.column].splice(source.cardIndex);
  if (target.zone === "foundation") next.foundations[target.suit].push(...moving.map((card) => ({ ...card, faceUp: true })));
  else next.tableau[target.column].push(...moving.map((card) => ({ ...card, faceUp: true })));

  if (source.zone === "tableau") {
    const exposed = next.tableau[source.column].at(-1);
    if (exposed && !exposed.faceUp) exposed.faceUp = true;
  }
  next.moves += 1;
  next.action += 1;
  return next;
}

function cardCode(card: Card) {
  return `${SUIT_ORDER.indexOf(card.suit).toString(36)}${card.rank.toString(36)}${card.faceUp ? "u" : "d"}`;
}

/**
 * Canonical strategic state. Tableau columns are sorted because columns are
 * interchangeable; moves, action counters and the seed are intentionally absent.
 * Draw-one permits unlimited redeals, so the raw pass count is strategically
 * irrelevant and is normalized to the D1U rule marker. The stock/waste split and
 * exact orders fully encode the current stock cursor.
 */
export function hashState(game: GameState) {
  const foundations = SUIT_ORDER.map((suit) => game.foundations[suit].length.toString(36)).join(".");
  const tableau = game.tableau.map((pile) => pile.map(cardCode).join(",")).sort().join("/");
  const stock = game.stock.map(cardCode).join(",");
  const waste = game.waste.map(cardCode).join(",");
  return `D1U|F:${foundations}|T:${tableau}|S:${stock}|W:${waste}`;
}

export function moveKey(move: GameMove) {
  if (move.type === "draw") return "draw";
  const source = move.source.zone === "waste" ? "w" : move.source.zone === "foundation" ? `f${move.source.suit}` : `t${move.source.column}:${move.source.cardIndex}`;
  const target = move.target.zone === "foundation" ? `f${move.target.suit}` : `t${move.target.column}`;
  return `${source}>${target}`;
}

export function cardForMove(game: GameState, move: GameMove) {
  return move.type === "draw" ? game.stock.at(-1) ?? null : selectedCards(game, move.source)[0] ?? null;
}

export function getLegalMoves(game: GameState): GameMove[] {
  const moves: GameMove[] = [];
  const emptyTarget = game.tableau.findIndex((pile) => pile.length === 0);
  const addTableauTargets = (source: Source, card: Card) => {
    game.tableau.forEach((pile, column) => {
      if (source.zone === "tableau" && source.column === column) return;
      if (!pile.length && column !== emptyTarget) return;
      if (canMoveToTableau(card, pile)) moves.push({ type: "transfer", source, target: { zone: "tableau", column } });
    });
  };

  const wasteCard = game.waste.at(-1);
  if (wasteCard) {
    const source: Source = { zone: "waste" };
    if (canMoveToFoundation(game, wasteCard, wasteCard.suit)) moves.push({ type: "transfer", source, target: { zone: "foundation", suit: wasteCard.suit } });
    addTableauTargets(source, wasteCard);
  }

  game.tableau.forEach((pile, column) => {
    pile.forEach((card, cardIndex) => {
      if (!card.faceUp) return;
      const run = pile.slice(cardIndex);
      if (!isValidRun(run)) return;
      const source: Source = { zone: "tableau", column, cardIndex };
      if (cardIndex === pile.length - 1 && canMoveToFoundation(game, card, card.suit)) {
        moves.push({ type: "transfer", source, target: { zone: "foundation", suit: card.suit } });
      }
      addTableauTargets(source, card);
    });
  });

  SUIT_ORDER.forEach((suit) => {
    const card = game.foundations[suit].at(-1);
    if (card) addTableauTargets({ zone: "foundation", suit }, card);
  });

  if (game.stock.length || game.waste.length) moves.push({ type: "draw" });
  return moves;
}

export function isWon(game: GameState) {
  return SUIT_ORDER.every((suit) => game.foundations[suit].length === 13);
}

export function faceDownCount(game: GameState) {
  return game.tableau.reduce((sum, pile) => sum + pile.filter((card) => !card.faceUp).length, 0);
}

function foundationCount(game: GameState) {
  return SUIT_ORDER.reduce((sum, suit) => sum + game.foundations[suit].length, 0);
}

function emptyColumnCount(game: GameState) {
  return game.tableau.filter((pile) => pile.length === 0).length;
}

export function isSafeFoundationCard(game: GameState, card: Card) {
  if (card.rank <= 2) return true;
  const family = SUITS[card.suit].family;
  const opposite = SUIT_ORDER.filter((suit) => SUITS[suit].family !== family);
  const sibling = SUIT_ORDER.find((suit) => suit !== card.suit && SUITS[suit].family === family)!;
  return opposite.every((suit) => game.foundations[suit].length >= card.rank - 1)
    && game.foundations[sibling].length >= card.rank - 2;
}

function isSafeFoundationMove(game: GameState, move: GameMove) {
  if (move.type !== "transfer" || move.target.zone !== "foundation") return false;
  const card = cardForMove(game, move);
  return Boolean(card && isSafeFoundationCard(game, card));
}

function usefulMoveCount(game: GameState) {
  return getLegalMoves(game).reduce((count, move) => {
    if (move.type === "draw") return count;
    const next = applyMove(game, move);
    if (!next) return count;
    const reveals = faceDownCount(next) < faceDownCount(game);
    const empties = emptyColumnCount(next) > emptyColumnCount(game);
    return count + (reveals || empties || isSafeFoundationMove(game, move) ? 1 : 0);
  }, 0);
}

export function scoreMove(game: GameState, move: GameMove, next = applyMove(game, move)) {
  if (!next) return Number.NEGATIVE_INFINITY;
  const hiddenDelta = faceDownCount(game) - faceDownCount(next);
  const foundationDelta = foundationCount(next) - foundationCount(game);
  const emptyDelta = emptyColumnCount(next) - emptyColumnCount(game);
  let score = hiddenDelta * 2200 + emptyDelta * 520;

  if (foundationDelta > 0) score += isSafeFoundationMove(game, move) ? 520 : -240;
  if (foundationDelta < 0) score -= 760;
  if (move.type === "draw") {
    score += game.stock.length ? 18 : -90;
    if (usefulMoveCount(next) > usefulMoveCount(game)) score += 230;
  } else if (move.source.zone === "tableau" && move.target.zone === "tableau" && hiddenDelta === 0 && emptyDelta === 0) {
    score -= 135;
  }
  score += (usefulMoveCount(next) - usefulMoveCount(game)) * 24;
  if (isWon(next)) score += 100000;
  return score;
}

function immediateReason(game: GameState, move: GameMove, next: GameState) {
  if (faceDownCount(next) < faceDownCount(game)) return "翻开一张隐藏牌";
  if (emptyColumnCount(next) > emptyColumnCount(game)) return "腾出这一列，为 K 留出座位";
  if (move.type === "transfer" && move.target.zone === "foundation" && isSafeFoundationMove(game, move)) return "这张牌现在可以安全归入命运塔";
  if (move.type === "draw") return "翻开牌库，露出一张有用的牌";
  return "先移动这张牌，打开下一步路径";
}

type SearchNode = {
  game: GameState;
  hash: string;
  parent: number;
  parentHash: string | null;
  move: GameMove | null;
  depth: number;
};

type HeapEntry = { node: number; priority: number };

class MaxHeap {
  private values: HeapEntry[] = [];
  get size() { return this.values.length; }
  push(value: HeapEntry) {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.values[parent].priority >= value.priority) break;
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.values[index] = value;
  }
  pop() {
    if (!this.values.length) return null;
    const root = this.values[0];
    const last = this.values.pop()!;
    if (this.values.length) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= this.values.length) break;
        const child = right < this.values.length && this.values[right].priority > this.values[left].priority ? right : left;
        if (this.values[child].priority <= last.priority) break;
        this.values[index] = this.values[child];
        index = child;
      }
      this.values[index] = last;
    }
    return root;
  }
}

function stateQuality(game: GameState) {
  return foundationCount(game) * 1050 - faceDownCount(game) * 430 + emptyColumnCount(game) * 90 + usefulMoveCount(game) * 26;
}

class SolverSearch {
  private readonly heap = new MaxHeap();
  private readonly nodes: SearchNode[] = [];
  private readonly visited = new Map<string, number>();
  private readonly startedAt = Date.now();
  private final: SolverResult | null = null;
  nodesSearched = 0;

  constructor(private readonly initial: GameState, private readonly maxNodes: number, private readonly maxMs: number) {
    const hash = hashState(initial);
    this.nodes.push({ game: cloneGame(initial), hash, parent: -1, parentHash: null, move: null, depth: 0 });
    this.visited.set(hash, 0);
    this.heap.push({ node: 0, priority: stateQuality(initial) });
    if (isWon(initial)) this.final = this.result("solved", 0);
  }

  private path(nodeIndex: number) {
    const path: GameMove[] = [];
    let index = nodeIndex;
    while (index > 0) {
      const node = this.nodes[index];
      if (node.move) path.push(node.move);
      index = node.parent;
    }
    return path.reverse();
  }

  private result(status: SolverResult["status"], nodeIndex = -1): SolverResult {
    return {
      status,
      path: status === "solved" ? this.path(nodeIndex) : [],
      nodesSearched: this.nodesSearched,
      elapsedMs: Date.now() - this.startedAt,
    };
  }

  step(iterations: number): SolverResult | null {
    if (this.final) return this.final;
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      if (this.nodesSearched >= this.maxNodes || Date.now() - this.startedAt >= this.maxMs) {
        this.final = this.result("limit");
        return this.final;
      }
      const entry = this.heap.pop();
      if (!entry) {
        this.final = this.result("unsolved");
        return this.final;
      }
      const node = this.nodes[entry.node];
      this.nodesSearched += 1;
      const candidates = getLegalMoves(node.game).map((move) => {
        const next = applyMove(node.game, move)!;
        return { move, next, score: scoreMove(node.game, move, next) };
      }).sort((a, b) => b.score - a.score);

      for (const candidate of candidates) {
        const nextHash = hashState(candidate.next);
        if (nextHash === node.parentHash) continue;
        const depth = node.depth + 1;
        const visitedDepth = this.visited.get(nextHash);
        if (visitedDepth !== undefined && visitedDepth <= depth) continue;
        this.visited.set(nextHash, depth);
        const childIndex = this.nodes.length;
        this.nodes.push({ game: candidate.next, hash: nextHash, parent: entry.node, parentHash: node.hash, move: candidate.move, depth });
        if (isWon(candidate.next)) {
          this.final = this.result("solved", childIndex);
          return this.final;
        }
        const priority = stateQuality(candidate.next) + candidate.score * .32 - depth * 3.5;
        this.heap.push({ node: childIndex, priority });
      }
    }
    return null;
  }
}

export function solveGame(game: GameState, options: { maxNodes?: number; maxMs?: number } = {}): SolverResult {
  const search = new SolverSearch(game, options.maxNodes ?? 250000, options.maxMs ?? 10000);
  let result: SolverResult | null = null;
  while (!result) result = search.step(1000);
  return result;
}

export async function solveGameAsync(game: GameState, options: { maxNodes?: number; maxMs?: number; chunkSize?: number } = {}) {
  const search = new SolverSearch(game, options.maxNodes ?? 180000, options.maxMs ?? 4500);
  let result: SolverResult | null = null;
  while (!result) {
    result = search.step(options.chunkSize ?? 260);
    if (!result) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return result;
}

type LookaheadResult = { path: GameMove[]; score: number; reason: string };

function boundedProgressSearch(
  game: GameState,
  baseline: GameState,
  depth: number,
  seen: Set<string>,
): LookaheadResult | null {
  if (depth <= 0) return null;
  let best: LookaheadResult | null = null;
  const baselineHidden = faceDownCount(baseline);
  const baselineFoundations = foundationCount(baseline);
  const baselineEmpty = emptyColumnCount(baseline);

  for (const move of getLegalMoves(game)) {
    const next = applyMove(game, move)!;
    const hash = hashState(next);
    if (seen.has(hash)) continue;
    const localSeen = new Set(seen).add(hash);
    const revealed = baselineHidden - faceDownCount(next);
    const emptied = emptyColumnCount(next) - baselineEmpty;
    const founded = foundationCount(next) - baselineFoundations;
    const meaningful = revealed > 0 || emptied > 0 || founded > 0 && isSafeFoundationMove(game, move) || isWon(next);
    if (meaningful) {
      const score = revealed * 2200 + emptied * 520 + founded * 380 - (4 - depth) * 80;
      const candidate = { path: [move], score, reason: immediateReason(game, move, next) };
      if (!best || candidate.score > best.score) best = candidate;
      continue;
    }
    const child = boundedProgressSearch(next, baseline, depth - 1, localSeen);
    if (child) {
      const candidate = { path: [move, ...child.path], score: child.score - 85, reason: child.reason };
      if (!best || candidate.score > best.score) best = candidate;
    }
  }
  return best;
}

function solverReason(game: GameState, move: GameMove, path: readonly GameMove[]) {
  const next = applyMove(game, move)!;
  const direct = immediateReason(game, move, next);
  if (direct !== "先移动这张牌，打开下一步路径") return `${direct} · 已验证可胜`;
  const preview = path.slice(1, 4).reduce<{ game: GameState; reason: string | null }>((state, futureMove) => {
    if (state.reason) return state;
    const future = applyMove(state.game, futureMove);
    if (!future) return state;
    const reason = immediateReason(state.game, futureMove, future);
    return { game: future, reason: reason === "先移动这张牌，打开下一步路径" ? null : reason };
  }, { game: next, reason: null });
  return preview.reason ? `先走这一步，随后可以${preview.reason}` : "沿已验证的可胜路径继续";
}

export async function findHint(game: GameState, context: HintContext = {}): Promise<HintResult> {
  if (isWon(game)) return { status: "won", reason: "四座命运塔已经完整。" };
  if (context.requireSolvableContinuation) {
    const solver = await solveGameAsync(game, {
      maxNodes: context.solverMaxNodes,
      maxMs: context.solverMaxMs,
    });
    if (solver.status === "solved" && solver.path.length) {
      const move = solver.path[0];
      const next = applyMove(game, move)!;
      return {
        status: "move",
        move,
        reason: solverReason(game, move, solver.path),
        resultHash: hashState(next),
        score: scoreMove(game, move, next),
        source: "solver",
        solver,
      };
    }
    if (solver.status === "unsolved") {
      return { status: "unsolved", reason: "当前牌局似乎已经没有可胜延续；可撤回到最近的可解状态。", solver };
    }
    return { status: "limit", reason: "尚未找到可验证的胜路；可撤回到最近的已验证状态。", solver };
  }
  const recentStates = new Set(context.recentStateHashes ?? []);
  const recentMoves = new Set(context.recentHintMoveKeys ?? []);
  const recentResults = new Set(context.recentHintResultHashes ?? []);
  const legal = getLegalMoves(game).map((move) => {
    const next = applyMove(game, move)!;
    return { move, next, hash: hashState(next), score: scoreMove(game, move, next) };
  });

  const immediate = legal
    .filter((candidate) => !recentStates.has(candidate.hash) && !recentResults.has(candidate.hash))
    .filter((candidate) => !recentMoves.has(moveKey(candidate.move)))
    .filter((candidate) => candidate.score >= 180)
    .sort((a, b) => b.score - a.score)[0];
  if (immediate) {
    return {
      status: "move",
      move: immediate.move,
      reason: immediateReason(game, immediate.move, immediate.next),
      resultHash: immediate.hash,
      score: immediate.score,
      source: "immediate",
    };
  }

  let bestLookahead: { first: typeof legal[number]; search: LookaheadResult } | null = null;
  for (const candidate of legal) {
    const repeated = recentMoves.has(moveKey(candidate.move)) || recentResults.has(candidate.hash) || recentStates.has(candidate.hash);
    if (repeated) continue;
    const search = boundedProgressSearch(candidate.next, game, context.shallowDepth ?? 3, new Set([hashState(game), candidate.hash]));
    if (!search) continue;
    const adjusted = search.score + candidate.score * .25;
    if (!bestLookahead || adjusted > bestLookahead.search.score) {
      bestLookahead = { first: candidate, search: { ...search, score: adjusted } };
    }
  }
  if (bestLookahead && bestLookahead.search.score > 0) {
    return {
      status: "move",
      move: bestLookahead.first.move,
      reason: `先走这一步，${bestLookahead.search.reason}`,
      resultHash: bestLookahead.first.hash,
      score: bestLookahead.search.score,
      source: "lookahead",
    };
  }

  const solver = await solveGameAsync(game, {
    maxNodes: context.solverMaxNodes,
    maxMs: context.solverMaxMs,
  });
  if (solver.status === "solved" && solver.path.length) {
    const move = solver.path[0];
    const next = applyMove(game, move)!;
    return {
      status: "move",
      move,
      reason: solverReason(game, move, solver.path),
      resultHash: hashState(next),
      score: scoreMove(game, move, next),
      source: "solver",
      solver,
    };
  }
  if (solver.status === "unsolved") {
    return { status: "unsolved", reason: "当前牌局似乎已经没有可胜延续；可撤回到最近的可解状态。", solver };
  }
  return { status: "limit", reason: "这一步没有找到可靠提示；可撤回到最近的已验证状态。", solver };
}

export type VerifiedDealRecord = { seed: number; solutionLength: number; nodesSearched: number };

// Generated offline by this engine and re-verified by tests. New Deal only draws
// from this cache, so no unverified candidate is ever presented to the player.
export const VERIFIED_DEALS: readonly VerifiedDealRecord[] = [
  { seed: 2, solutionLength: 132, nodesSearched: 287 },
  { seed: 3, solutionLength: 163, nodesSearched: 341 },
  { seed: 4, solutionLength: 151, nodesSearched: 812 },
  { seed: 8, solutionLength: 195, nodesSearched: 597 },
  { seed: 10, solutionLength: 139, nodesSearched: 169 },
  { seed: 11, solutionLength: 200, nodesSearched: 518 },
  { seed: 16, solutionLength: 156, nodesSearched: 2170 },
  { seed: 17, solutionLength: 144, nodesSearched: 373 },
  { seed: 21, solutionLength: 163, nodesSearched: 1053 },
  { seed: 22, solutionLength: 161, nodesSearched: 367 },
  { seed: 24, solutionLength: 167, nodesSearched: 1487 },
  { seed: 27, solutionLength: 151, nodesSearched: 1742 },
  { seed: 29, solutionLength: 116, nodesSearched: 164 },
  { seed: 32, solutionLength: 161, nodesSearched: 889 },
  { seed: 33, solutionLength: 164, nodesSearched: 3190 },
  { seed: 34, solutionLength: 172, nodesSearched: 8416 },
  { seed: 35, solutionLength: 171, nodesSearched: 3942 },
  { seed: 36, solutionLength: 154, nodesSearched: 1300 },
  { seed: 42, solutionLength: 155, nodesSearched: 335 },
  { seed: 47, solutionLength: 186, nodesSearched: 740 },
];

export function createVerifiedGame(index = Math.floor(Math.random() * Math.max(1, VERIFIED_DEALS.length))) {
  const record = VERIFIED_DEALS[index % Math.max(1, VERIFIED_DEALS.length)];
  if (!record) return createConstructedSolvableGame((0x51f15e ^ index * 0x9e3779b9) >>> 0);
  const game = createCandidateGame(record.seed);
  game.deal = {
    solverVerified: true,
    solutionLength: record.solutionLength,
    nodesSearched: record.nodesSearched,
    source: "solver-cache",
  };
  return game;
}
