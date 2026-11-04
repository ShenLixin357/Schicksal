"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from "react";
import { generateSigilBoard, getSigilHint, isSigilBoard, SIGIL_PORTS, traceSigilLight, turnSigil, type SigilBoard } from "./jade-sigil-engine";
import type { MiniGameComponentProps, MiniGameController } from "./mini-game-types";

type SigilSnapshot = { version: 1; board: SigilBoard; initial: SigilBoard; history: SigilBoard[] };
const PORT_LINES = ["M50 50V0", "M50 50H100", "M50 50V100", "M50 50H0"];

function cloneBoard(board: SigilBoard): SigilBoard {
  return { ...board, cells: board.cells.map((cell) => ({ ...cell })) };
}

function restore(value: unknown): SigilSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Partial<SigilSnapshot>;
  if (snapshot.version !== 1 || !isSigilBoard(snapshot.board) || !isSigilBoard(snapshot.initial) || !Array.isArray(snapshot.history)) return null;
  return { version: 1, board: cloneBoard(snapshot.board), initial: cloneBoard(snapshot.initial), history: snapshot.history.filter(isSigilBoard).slice(-100).map(cloneBoard) };
}

export const JadeSigilsGame = forwardRef<MiniGameController, MiniGameComponentProps>(function JadeSigilsGame({ initialState, paused, inputLocked, onSnapshot, onNewRun, onScoreChange, onUndoAvailabilityChange, playSound }, ref) {
  const [startup] = useState(() => restore(initialState));
  const [board, setBoard] = useState(() => startup?.board ?? generateSigilBoard(Date.now() >>> 0));
  const [history, setHistory] = useState<SigilBoard[]>(() => startup?.history ?? []);
  const [hint, setHint] = useState<{ index: number; turns: number } | null>(null);
  const initialRef = useRef(startup?.initial ?? cloneBoard(board));
  const celebratedRef = useRef(false);
  const trace = traceSigilLight(board);
  const lit = new Set(trace.lit);
  const serializeState = useCallback((): SigilSnapshot => ({ version: 1, board: cloneBoard(board), initial: cloneBoard(initialRef.current), history: history.map(cloneBoard) }), [board, history]);

  const resetGame = () => {
    onNewRun();
    setBoard(cloneBoard(initialRef.current));
    setHistory([]);
    setHint(null);
    celebratedRef.current = false;
    playSound("select");
  };
  const undo = () => {
    if (paused || inputLocked || !history.length) return;
    setBoard(cloneBoard(history.at(-1)!));
    setHistory((current) => current.slice(0, -1));
    setHint(null);
    celebratedRef.current = false;
    playSound("select");
  };
  useImperativeHandle(ref, () => ({ serializeState, resetGame, undo }));

  useEffect(() => {
    onSnapshot(serializeState());
    onScoreChange(board.moves);
    onUndoAvailabilityChange(history.length > 0);
  }, [board.moves, history.length, onScoreChange, onSnapshot, onUndoAvailabilityChange, serializeState]);

  useEffect(() => {
    if (trace.complete && !celebratedRef.current) {
      celebratedRef.current = true;
      playSound("win");
    }
  }, [playSound, trace.complete]);

  const turn = (index: number) => {
    if (paused || inputLocked || trace.complete) return;
    setHistory((current) => [...current.slice(-99), cloneBoard(board)]);
    setBoard(turnSigil(board, index));
    setHint(null);
    playSound("select");
  };

  const newBoard = (size = board.size) => {
    onNewRun();
    const next = generateSigilBoard((Date.now() + board.seed) >>> 0, size);
    initialRef.current = cloneBoard(next);
    celebratedRef.current = false;
    setBoard(next);
    setHistory([]);
    setHint(null);
    playSound("select");
  };

  return <div className="jade-sigil-game">
    <header className="jade-game-intro"><div><small>THE VERDANT CIRCUIT</small><h2>翡翠导光阵</h2><p>旋转刻盘，让左上角的余烬贯通所有纹路。</p></div><span className="jade-game-progress"><strong>{trace.lit.length}/{board.cells.length}</strong><small>刻盘已接通</small></span></header>
    <div className="jade-game-actions">
      <div className="jade-board-size"><button type="button" className={board.size === 4 ? "active" : ""} onClick={() => newBoard(4)} disabled={paused || inputLocked}>古典 · 4×4</button><button type="button" className={board.size === 5 ? "active" : ""} onClick={() => newBoard(5)} disabled={paused || inputLocked}>秘仪 · 5×5</button></div>
      <button type="button" onClick={() => { setHint(getSigilHint(board)); playSound("select"); }} disabled={paused || inputLocked || trace.complete}>请余烬指路</button>
      <button type="button" onClick={() => newBoard()} disabled={paused || inputLocked}>新的封印</button>
    </div>
    <div className={`jade-sigil-board ${trace.complete ? "sealed" : ""}`} style={{ "--sigil-size": board.size } as CSSProperties}>
      {board.cells.map((cell, index) => <button key={index} type="button" className={`jade-sigil-cell ${lit.has(index) ? "lit" : ""} ${hint?.index === index ? "hinted" : ""} ${index === 0 ? "source" : ""}`} onClick={() => turn(index)} disabled={paused || inputLocked || trace.complete} aria-label={`第 ${Math.floor(index / board.size) + 1} 行，第 ${index % board.size + 1} 列刻盘，${lit.has(index) ? "已接通" : "未接通"}，点击顺时针旋转`}>
        <svg viewBox="0 0 100 100" aria-hidden="true"><rect className="sigil-enamel" x="5" y="5" width="90" height="90" rx="9" /><path className="sigil-engraving" d="M12 30V12H30 M70 12H88V30 M88 70V88H70 M30 88H12V70" /><g className="sigil-dial" style={{ transform: `rotate(${cell.rotation * 90}deg)` }}>
          {SIGIL_PORTS.map((port, direction) => cell.mask & port ? <path key={port} className="sigil-channel-shadow" d={PORT_LINES[direction]} /> : null)}
          {SIGIL_PORTS.map((port, direction) => cell.mask & port ? <path key={port} className="sigil-channel" d={PORT_LINES[direction]} /> : null)}
        </g><circle className="sigil-rivet" cx="50" cy="50" r="8" />{index === 0 && <path className="sigil-source" d="M49 42Q61 47 54 57Q43 64 45 52Q52 49 49 42Z" />}</svg>
        {hint?.index === index && <span className="sigil-hint-count">↻ {hint.turns}</span>}
      </button>)}
    </div>
    <p className="jade-game-status" role="status">{trace.complete ? "封印已打开。所有刻盘都归于同一缕翡翠余烬。" : hint ? `第 ${Math.floor(hint.index / board.size) + 1} 行、第 ${hint.index % board.size + 1} 列：顺时针再转 ${hint.turns} 次。` : `已接通 ${trace.lit.length} 枚刻盘 · ${trace.leaks} 处纹路尚未对齐`}</p>
    {trace.complete && <div className="jade-game-completion"><span>封印完成 · {board.moves} 次旋转</span><button type="button" onClick={() => newBoard()}>再解一局</button></div>}
  </div>;
});
