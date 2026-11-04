/** Clockwise ports: north, east, south, west. */
export const SIGIL_PORTS = [1, 2, 4, 8] as const;
const DELTAS = [[-1, 0], [0, 1], [1, 0], [0, -1]] as const;

export type SigilCell = { mask: number; rotation: number };
export type SigilBoard = { version: 1; seed: number; size: number; cells: SigilCell[]; moves: number };

export function rotateSigilMask(mask: number, rotation: number) {
  const steps = ((rotation % 4) + 4) % 4;
  return ((mask << steps) | (mask >> (4 - steps))) & 15;
}

export function traceSigilLight(board: SigilBoard) {
  const lit = new Set<number>([0]);
  const queue = [0];
  let leaks = 0;
  while (queue.length) {
    const index = queue.shift()!;
    const row = Math.floor(index / board.size);
    const column = index % board.size;
    const mask = rotateSigilMask(board.cells[index].mask, board.cells[index].rotation);
    DELTAS.forEach(([dr, dc], direction) => {
      if (!(mask & SIGIL_PORTS[direction])) return;
      const nextRow = row + dr;
      const nextColumn = column + dc;
      if (nextRow < 0 || nextRow >= board.size || nextColumn < 0 || nextColumn >= board.size) {
        leaks += 1;
        return;
      }
      const nextIndex = nextRow * board.size + nextColumn;
      const nextMask = rotateSigilMask(board.cells[nextIndex].mask, board.cells[nextIndex].rotation);
      if (!(nextMask & SIGIL_PORTS[(direction + 2) % 4])) {
        leaks += 1;
        return;
      }
      if (!lit.has(nextIndex)) {
        lit.add(nextIndex);
        queue.push(nextIndex);
      }
    });
  }
  return { lit: [...lit], leaks, complete: lit.size === board.cells.length && leaks === 0 };
}

function randomFactory(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/** A randomized spanning tree provides an exact valid solution before scrambling. */
export function generateSigilBoard(seed: number, size = 4): SigilBoard {
  const dimension = Math.max(3, Math.min(5, Math.floor(size)));
  const random = randomFactory(seed);
  const masks = Array<number>(dimension * dimension).fill(0);
  const visited = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const index = stack.at(-1)!;
    const row = Math.floor(index / dimension);
    const column = index % dimension;
    const options = DELTAS.map(([dr, dc], direction) => ({ row: row + dr, column: column + dc, direction }))
      .filter((option) => option.row >= 0 && option.row < dimension && option.column >= 0 && option.column < dimension && !visited.has(option.row * dimension + option.column));
    if (!options.length) { stack.pop(); continue; }
    const chosen = options[Math.floor(random() * options.length)];
    const next = chosen.row * dimension + chosen.column;
    masks[index] |= SIGIL_PORTS[chosen.direction];
    masks[next] |= SIGIL_PORTS[(chosen.direction + 2) % 4];
    visited.add(next);
    stack.push(next);
  }
  const board: SigilBoard = { version: 1, seed: seed >>> 0, size: dimension, cells: masks.map((mask) => ({ mask, rotation: Math.floor(random() * 4) })), moves: 0 };
  if (traceSigilLight(board).complete) board.cells[0].rotation = (board.cells[0].rotation + 1) % 4;
  return board;
}

export function turnSigil(board: SigilBoard, index: number): SigilBoard {
  if (!board.cells[index] || traceSigilLight(board).complete) return board;
  return { ...board, cells: board.cells.map((cell, position) => position === index ? { ...cell, rotation: (cell.rotation + 1) % 4 } : { ...cell }), moves: board.moves + 1 };
}

export function getSigilHint(board: SigilBoard) {
  if (traceSigilLight(board).complete) return null;
  const lit = new Set(traceSigilLight(board).lit);
  const candidates = board.cells.map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => rotateSigilMask(cell.mask, cell.rotation) !== cell.mask)
    .sort((a, b) => Number(lit.has(b.index)) - Number(lit.has(a.index)) || a.index - b.index);
  const selected = candidates[0];
  if (!selected) return null;
  let turns = 1;
  while (turns < 4 && rotateSigilMask(selected.cell.mask, selected.cell.rotation + turns) !== selected.cell.mask) turns += 1;
  return { index: selected.index, turns };
}

export function isSigilBoard(value: unknown): value is SigilBoard {
  if (!value || typeof value !== "object") return false;
  const board = value as Partial<SigilBoard>;
  return board.version === 1 && Number.isInteger(board.size) && board.size! >= 3 && board.size! <= 5
    && typeof board.seed === "number" && Number.isInteger(board.moves) && board.moves! >= 0
    && Array.isArray(board.cells) && board.cells.length === board.size! ** 2
    && board.cells.every((cell) => Number.isInteger(cell.mask) && cell.mask > 0 && cell.mask <= 15 && Number.isInteger(cell.rotation) && cell.rotation >= 0 && cell.rotation < 4);
}
