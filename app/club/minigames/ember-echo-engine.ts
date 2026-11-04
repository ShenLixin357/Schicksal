export const ECHO_RUNES = [
  { name: "余烬", tone: 293.66, color: "#b6d280", path: "M32 7C39 21 22 24 28 36C34 26 40 29 43 21C58 43 42 58 31 57C11 55 9 36 23 24C20 17 25 10 32 7Z" },
  { name: "常春藤", tone: 369.99, color: "#6fbf9f", path: "M12 48C9 23 26 9 53 11C53 39 37 55 12 48ZM14 48L44 20M26 35L25 21M26 35L41 36" },
  { name: "月镜", tone: 440, color: "#92c9cc", path: "M40 8C20 5 8 20 10 35C13 54 35 61 50 48C28 53 14 25 40 8Z" },
  { name: "封印", tone: 587.33, color: "#d6b566", path: "M32 7L50 17L53 41L32 56L11 41L14 17Z M32 18L43 32L32 46L21 32Z" },
] as const;

export type EchoState = { version: 1; seed: number; sequence: number[]; rounds: number; score: number; lives: number };

export function extendEcho(state: EchoState): EchoState {
  const seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return { ...state, seed, sequence: [...state.sequence, seed >>> 30] };
}

export function createEcho(seed: number): EchoState {
  return extendEcho({ version: 1, seed: seed >>> 0, sequence: [], rounds: 0, score: 0, lives: 3 });
}

export function checkEchoInput(sequence: readonly number[], input: readonly number[]) {
  if (input.length > sequence.length || input.some((rune, index) => rune !== sequence[index])) return "wrong" as const;
  return input.length === sequence.length ? "complete" as const : "correct" as const;
}

export function completeEchoRound(state: EchoState) {
  return extendEcho({ ...state, rounds: state.rounds + 1, score: state.score + state.sequence.length * 25 });
}

export function isEchoState(value: unknown): value is EchoState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<EchoState>;
  return state.version === 1 && typeof state.seed === "number" && Number.isInteger(state.rounds) && state.rounds! >= 0
    && Number.isInteger(state.score) && state.score! >= 0 && Number.isInteger(state.lives) && state.lives! >= 0 && state.lives! <= 3
    && Array.isArray(state.sequence) && state.sequence.length > 0 && state.sequence.length <= 256
    && state.sequence.every((rune) => Number.isInteger(rune) && rune >= 0 && rune < 4);
}
