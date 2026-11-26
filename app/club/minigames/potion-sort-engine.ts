export type PotionColorId = "garnet" | "amber" | "amethyst" | "moon" | "jade" | "rose";
export type PotionDifficultyId = "apprentice" | "alchemist" | "oracle";

export type PotionMove = {
  from: number;
  to: number;
  color: PotionColorId;
  count: number;
};

export type PotionPuzzle = {
  version: 1;
  seed: number;
  difficulty: PotionDifficultyId;
  capacity: number;
  bottles: PotionColorId[][];
  moves: number;
  complete: boolean;
  knownSolution: PotionMove[];
};

export const POTION_COLORS: Record<PotionColorId, { label: string; hex: string; highlight: string }> = {
  garnet: { label: "石榴", hex: "#8f2949", highlight: "#dc6686" },
  amber: { label: "琥珀", hex: "#b76726", highlight: "#f3ae55" },
  amethyst: { label: "紫晶", hex: "#65408f", highlight: "#ae83df" },
  moon: { label: "月霜", hex: "#477ba4", highlight: "#8fc9e8" },
  jade: { label: "翡翠", hex: "#2f765f", highlight: "#6bc49b" },
  rose: { label: "暮玫", hex: "#9a496f", highlight: "#e28db3" },
};

export const POTION_DIFFICULTIES: Record<PotionDifficultyId, { label: string; colors: number; emptyBottles: number; scrambleDepth: number }> = {
  apprentice: { label: "学徒", colors: 4, emptyBottles: 2, scrambleDepth: 14 },
  alchemist: { label: "炼金师", colors: 5, emptyBottles: 2, scrambleDepth: 24 },
  oracle: { label: "秘仪师", colors: 6, emptyBottles: 2, scrambleDepth: 36 },
};

const COLOR_ORDER = Object.keys(POTION_COLORS) as PotionColorId[];

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

export function potionStateHash(bottles: readonly (readonly PotionColorId[])[]) {
  return bottles.map((bottle) => bottle.join(".")).join("/");
}

function topRunLength(bottle: readonly PotionColorId[]) {
  const color = bottle.at(-1);
  if (!color) return 0;
  let count = 0;
  for (let index = bottle.length - 1; index >= 0 && bottle[index] === color; index -= 1) count += 1;
  return count;
}

export function getPotionPour(bottles: readonly (readonly PotionColorId[])[], from: number, to: number, capacity = 4): PotionMove | null {
  if (from === to) return null;
  const source = bottles[from];
  const destination = bottles[to];
  if (!source?.length || !destination || destination.length >= capacity) return null;
  const color = source.at(-1)!;
  const destinationColor = destination.at(-1);
  if (destinationColor && destinationColor !== color) return null;
  const count = Math.min(topRunLength(source), capacity - destination.length);
  return count > 0 ? { from, to, color, count } : null;
}

export function applyPotionMove(bottles: readonly (readonly PotionColorId[])[], move: Pick<PotionMove, "from" | "to">, capacity = 4) {
  const legal = getPotionPour(bottles, move.from, move.to, capacity);
  if (!legal) return null;
  const next = bottles.map((bottle) => [...bottle]);
  next[legal.from].splice(next[legal.from].length - legal.count, legal.count);
  next[legal.to].push(...Array.from({ length: legal.count }, () => legal.color));
  return { bottles: next, move: legal };
}

export function isPotionComplete(bottles: readonly (readonly PotionColorId[])[], capacity = 4) {
  return bottles.every((bottle) => !bottle.length || bottle.length === capacity && bottle.every((color) => color === bottle[0]));
}

type ReverseMove = PotionMove;

function reverseCandidates(bottles: readonly PotionColorId[][], capacity: number) {
  const candidates: ReverseMove[] = [];
  bottles.forEach((source, from) => {
    const color = source.at(-1);
    if (!color) return;
    const run = topRunLength(source);
    bottles.forEach((destination, to) => {
      if (from === to || destination.length >= capacity || destination.at(-1) === color) return;
      const max = Math.min(run, capacity - destination.length);
      for (let count = 1; count <= max; count += 1) {
        // After this reverse step, the normal forward pour must restore this
        // exact state: the source must be empty or still expose the same color.
        if (count < run || count === source.length) candidates.push({ from, to, color, count });
      }
    });
  });
  return candidates;
}

function applyReverseMove(bottles: readonly PotionColorId[][], move: ReverseMove) {
  const next = bottles.map((bottle) => [...bottle]);
  next[move.from].splice(next[move.from].length - move.count, move.count);
  next[move.to].push(...Array.from({ length: move.count }, () => move.color));
  return next;
}

export function verifyPotionSolution(puzzle: PotionPuzzle) {
  let bottles = puzzle.bottles.map((bottle) => [...bottle]);
  for (const move of puzzle.knownSolution) {
    const result = applyPotionMove(bottles, move, puzzle.capacity);
    if (!result || result.move.color !== move.color || result.move.count !== move.count) return false;
    bottles = result.bottles;
  }
  return isPotionComplete(bottles, puzzle.capacity);
}

export function generatePotionLevel(difficulty: PotionDifficultyId, seed: number): PotionPuzzle {
  const preset = POTION_DIFFICULTIES[difficulty];
  const normalizedSeed = seed >>> 0;
  const random = randomFactory(normalizedSeed);
  const capacity = 4;
  let bottles: PotionColorId[][] = [
    ...COLOR_ORDER.slice(0, preset.colors).map((color) => Array.from({ length: capacity }, () => color)),
    ...Array.from({ length: preset.emptyBottles }, () => [] as PotionColorId[]),
  ];
  const inverseMoves: PotionMove[] = [];
  const recent = new Set([potionStateHash(bottles)]);

  for (let step = 0; step < preset.scrambleDepth; step += 1) {
    const candidates = reverseCandidates(bottles, capacity).map((move) => {
      const next = applyReverseMove(bottles, move);
      const mixedDestination = bottles[move.to].length > 0;
      const emptiesSource = move.count === bottles[move.from].length;
      return { move, next, hash: potionStateHash(next), weight: mixedDestination ? 5 : emptiesSource ? 1 : 2 };
    }).filter((candidate) => !recent.has(candidate.hash));
    if (!candidates.length) break;
    const weighted = candidates.flatMap((candidate) => Array.from({ length: candidate.weight }, () => candidate));
    const chosen = weighted[Math.floor(random() * weighted.length)];
    bottles = chosen.next;
    recent.add(chosen.hash);
    inverseMoves.push({ from: chosen.move.to, to: chosen.move.from, color: chosen.move.color, count: chosen.move.count });
    if (recent.size > 12) recent.delete(recent.values().next().value!);
  }

  const puzzle: PotionPuzzle = {
    version: 1,
    seed: normalizedSeed,
    difficulty,
    capacity,
    bottles,
    moves: 0,
    complete: false,
    knownSolution: inverseMoves.reverse(),
  };
  if (!verifyPotionSolution(puzzle) || isPotionComplete(puzzle.bottles, capacity)) {
    return generatePotionLevel(difficulty, (normalizedSeed + 0x9e3779b9) >>> 0);
  }
  return puzzle;
}

export function isPotionPuzzle(value: unknown): value is PotionPuzzle {
  if (!value || typeof value !== "object") return false;
  const puzzle = value as Partial<PotionPuzzle>;
  return puzzle.version === 1 && typeof puzzle.seed === "number" && typeof puzzle.capacity === "number"
    && typeof puzzle.moves === "number" && Array.isArray(puzzle.bottles)
    && puzzle.bottles.every((bottle) => Array.isArray(bottle) && bottle.every((color) => COLOR_ORDER.includes(color)));
}
