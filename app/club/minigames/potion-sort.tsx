"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from "react";
import {
  applyPotionMove,
  generatePotionLevel,
  getPotionPour,
  isPotionComplete,
  isPotionPuzzle,
  POTION_COLORS,
  POTION_DIFFICULTIES,
  type PotionDifficultyId,
  type PotionPuzzle,
} from "./potion-sort-engine";
import type { MiniGameComponentProps, MiniGameController } from "./mini-game-types";

type PotionSnapshot = {
  version: 1;
  puzzle: PotionPuzzle;
  initialPuzzle: PotionPuzzle;
  history: PotionPuzzle[];
};

type PourAnimation = {
  from: number;
  to: number;
  color: keyof typeof POTION_COLORS;
  count: number;
  left: number;
  top: number;
  width: number;
  angle: number;
  direction: 1 | -1;
};

function clonePuzzle(puzzle: PotionPuzzle): PotionPuzzle {
  return {
    ...puzzle,
    bottles: puzzle.bottles.map((bottle) => [...bottle]),
    knownSolution: puzzle.knownSolution.map((move) => ({ ...move })),
  };
}

function restoreSnapshot(value: unknown): PotionSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Partial<PotionSnapshot>;
  if (snapshot.version !== 1 || !isPotionPuzzle(snapshot.puzzle) || !isPotionPuzzle(snapshot.initialPuzzle) || !Array.isArray(snapshot.history)) return null;
  return {
    version: 1,
    puzzle: clonePuzzle(snapshot.puzzle),
    initialPuzzle: clonePuzzle(snapshot.initialPuzzle),
    history: snapshot.history.filter(isPotionPuzzle).map(clonePuzzle),
  };
}

function freshPuzzle(difficulty: PotionDifficultyId, offset = 0) {
  return generatePotionLevel(difficulty, (Date.now() + offset * 0x9e3779b9) >>> 0);
}

export const PotionSortGame = forwardRef<MiniGameController, MiniGameComponentProps>(function PotionSortGame({
  initialState,
  paused,
  inputLocked,
  onSnapshot,
  onNewRun,
  onScoreChange,
  onUndoAvailabilityChange,
  playSound,
}, ref) {
  const restored = useRef(restoreSnapshot(initialState));
  const firstPuzzle = restored.current?.puzzle ?? freshPuzzle("apprentice");
  const [puzzle, setPuzzle] = useState<PotionPuzzle>(() => clonePuzzle(firstPuzzle));
  const [difficulty, setDifficulty] = useState<PotionDifficultyId>(firstPuzzle.difficulty);
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<PotionPuzzle[]>(() => restored.current?.history ?? []);
  const [animation, setAnimation] = useState<PourAnimation | null>(null);
  const [invalidBottle, setInvalidBottle] = useState<number | null>(null);
  const playfieldRef = useRef<HTMLDivElement>(null);
  const bottleRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const initialPuzzleRef = useRef<PotionPuzzle>(restored.current?.initialPuzzle ?? clonePuzzle(firstPuzzle));
  const pourTimerRef = useRef<number | null>(null);
  const invalidTimerRef = useRef<number | null>(null);
  const levelCounterRef = useRef(0);
  const celebratedRef = useRef(puzzle.complete);

  const makeSnapshot = useCallback(() => ({
    version: 1 as const,
    puzzle: clonePuzzle(puzzle),
    initialPuzzle: clonePuzzle(initialPuzzleRef.current),
    history: history.map(clonePuzzle),
  }), [history, puzzle]);

  const resetGame = () => {
    onNewRun();
    if (pourTimerRef.current !== null) window.clearTimeout(pourTimerRef.current);
    setAnimation(null);
    setSelected(null);
    setHistory([]);
    setPuzzle(clonePuzzle(initialPuzzleRef.current));
    celebratedRef.current = false;
    playSound("select");
  };

  const undo = () => {
    if (animation || !history.length) return;
    const previous = history.at(-1)!;
    setHistory((current) => current.slice(0, -1));
    setPuzzle(clonePuzzle(previous));
    setSelected(null);
    celebratedRef.current = false;
    playSound("select");
  };

  useImperativeHandle(ref, () => ({ serializeState: makeSnapshot, resetGame, undo }));

  useEffect(() => {
    onScoreChange(puzzle.moves);
    onUndoAvailabilityChange(history.length > 0 && !animation);
    onSnapshot(makeSnapshot());
  }, [animation, history, makeSnapshot, onScoreChange, onSnapshot, onUndoAvailabilityChange, puzzle.moves]);

  useEffect(() => {
    if (puzzle.complete && !celebratedRef.current) {
      celebratedRef.current = true;
      playSound("win");
    }
  }, [playSound, puzzle.complete]);

  useEffect(() => () => {
    if (pourTimerRef.current !== null) window.clearTimeout(pourTimerRef.current);
    if (invalidTimerRef.current !== null) window.clearTimeout(invalidTimerRef.current);
  }, []);

  const reject = (bottle: number) => {
    setInvalidBottle(bottle);
    playSound("invalid");
    if (invalidTimerRef.current !== null) window.clearTimeout(invalidTimerRef.current);
    invalidTimerRef.current = window.setTimeout(() => setInvalidBottle(null), 430);
  };

  const beginPour = (from: number, to: number) => {
    const move = getPotionPour(puzzle.bottles, from, to, puzzle.capacity);
    if (!move) {
      reject(to);
      setSelected(null);
      return;
    }
    const field = playfieldRef.current?.getBoundingClientRect();
    const source = bottleRefs.current[from]?.getBoundingClientRect();
    const target = bottleRefs.current[to]?.getBoundingClientRect();
    if (!field || !source || !target) return;
    const startX = source.left + source.width / 2 - field.left;
    const startY = source.top + source.height * .18 - field.top;
    const endX = target.left + target.width / 2 - field.left;
    const endY = target.top + target.height * .22 - field.top;
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.hypot(dx, dy);
    setAnimation({
      ...move,
      left: startX,
      top: startY,
      width: distance,
      angle: Math.atan2(dy, dx) * 180 / Math.PI,
      direction: dx >= 0 ? 1 : -1,
    });
    setSelected(null);
    playSound("pour");
    pourTimerRef.current = window.setTimeout(() => {
      const result = applyPotionMove(puzzle.bottles, move, puzzle.capacity);
      if (result) {
        setHistory((current) => [...current.slice(-79), clonePuzzle(puzzle)]);
        setPuzzle((current) => ({
          ...current,
          bottles: result.bottles,
          moves: current.moves + 1,
          complete: isPotionComplete(result.bottles, current.capacity),
        }));
      }
      setAnimation(null);
      pourTimerRef.current = null;
    }, 620);
  };

  const chooseBottle = (index: number) => {
    if (paused || inputLocked || animation || puzzle.complete) return;
    if (selected === null) {
      if (!puzzle.bottles[index].length) return reject(index);
      setSelected(index);
      playSound("select");
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    beginPour(selected, index);
  };

  const newLevel = (nextDifficulty = difficulty) => {
    onNewRun();
    levelCounterRef.current += 1;
    const next = freshPuzzle(nextDifficulty, levelCounterRef.current);
    initialPuzzleRef.current = clonePuzzle(next);
    setDifficulty(nextDifficulty);
    setPuzzle(next);
    setHistory([]);
    setSelected(null);
    setAnimation(null);
    celebratedRef.current = false;
    playSound("select");
  };

  return <div className={`potion-sort-game ${puzzle.complete ? "complete" : ""}`}>
    <div className="potion-game-copy">
      <div><small>ALCHEMICAL ORDER</small><h2>让每只瓶子只保留一种魔药</h2></div>
      <div className="potion-difficulty" aria-label="难度">
        {(Object.keys(POTION_DIFFICULTIES) as PotionDifficultyId[]).map((id) => <button type="button" key={id} className={difficulty === id ? "active" : ""} onClick={() => newLevel(id)} disabled={paused || inputLocked || Boolean(animation)}>{POTION_DIFFICULTIES[id].label}</button>)}
        <button type="button" className="new-level" onClick={() => newLevel()} disabled={paused || inputLocked || Boolean(animation)}>新关卡</button>
      </div>
    </div>

    <div className="potion-playfield" ref={playfieldRef}>
      <div className="potion-cabinet-arch" aria-hidden="true" />
      <div className="potion-bottles" style={{ "--bottle-count": puzzle.bottles.length } as CSSProperties}>
        {puzzle.bottles.map((bottle, index) => <button
          type="button"
          key={index}
          ref={(element) => { bottleRefs.current[index] = element; }}
          className={`potion-bottle ${selected === index ? "selected" : ""} ${animation?.from === index ? `pouring direction-${animation.direction > 0 ? "right" : "left"}` : ""} ${animation?.to === index ? "receiving" : ""} ${invalidBottle === index ? "invalid" : ""}`}
          onClick={() => chooseBottle(index)}
          disabled={paused || inputLocked}
          aria-label={`第 ${index + 1} 只魔药瓶，${bottle.length ? `${bottle.length} 层` : "空瓶"}`}
        >
          <span className="potion-bottle-lip" />
          <span className="potion-glass">
            <span className="potion-glass-shine" />
            {bottle.map((color, layer) => <i key={`${layer}-${color}`} className="potion-layer" style={{ "--layer": layer, "--potion-color": POTION_COLORS[color].hex, "--potion-highlight": POTION_COLORS[color].highlight } as CSSProperties} />)}
          </span>
          <span className="potion-bottle-foot" />
        </button>)}
      </div>

      {animation && <span className="potion-pour-stream" style={{ left: animation.left, top: animation.top, width: animation.width, transform: `rotate(${animation.angle}deg)`, "--stream-color": POTION_COLORS[animation.color].hex, "--stream-highlight": POTION_COLORS[animation.color].highlight } as CSSProperties}><i /></span>}
      {puzzle.complete && <div className="potion-complete" role="status"><span>✦</span><small>THE CABINET IS IN ORDER</small><strong>魔药已经归于纯净</strong><p>{puzzle.moves} 次倾倒</p></div>}
    </div>

    <footer className="potion-game-note">先选择来源瓶，再选择目标瓶 · 相连的同色液层会一起倾倒</footer>
  </div>;
});
