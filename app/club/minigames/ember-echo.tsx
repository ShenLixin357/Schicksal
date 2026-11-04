"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from "react";
import { checkEchoInput, completeEchoRound, createEcho, ECHO_RUNES, isEchoState, type EchoState } from "./ember-echo-engine";
import type { MiniGameComponentProps, MiniGameController, MiniGameSound } from "./mini-game-types";

type EchoPhase = "ready" | "listening" | "answering" | "success" | "mistake" | "finished";

export const EmberEchoGame = forwardRef<MiniGameController, MiniGameComponentProps>(function EmberEchoGame({ initialState, paused, inputLocked, onSnapshot, onNewRun, onScoreChange, onUndoAvailabilityChange, playSound }, ref) {
  const [echo, setEcho] = useState<EchoState>(() => isEchoState(initialState) ? { ...initialState, sequence: [...initialState.sequence] } : createEcho(Date.now() >>> 0));
  const [phase, setPhase] = useState<EchoPhase>(() => echo.lives === 0 ? "finished" : "ready");
  const [input, setInput] = useState<number[]>([]);
  const [cueStep, setCueStep] = useState(0);
  const [pressed, setPressed] = useState<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const activeRune = phase === "listening" && cueStep % 2 === 0 ? echo.sequence[Math.floor(cueStep / 2)] : pressed;
  const serializeState = useCallback(() => ({ ...echo, sequence: [...echo.sequence] }), [echo]);
  const resetGame = () => {
    onNewRun();
    setEcho(createEcho(Date.now() >>> 0));
    setPhase("ready");
    setInput([]);
    setCueStep(0);
    setPressed(null);
    playSound("select");
  };
  useImperativeHandle(ref, () => ({ serializeState, resetGame }));

  useEffect(() => {
    onSnapshot(serializeState());
    onScoreChange(echo.score);
    onUndoAvailabilityChange(false);
  }, [echo.score, onScoreChange, onSnapshot, onUndoAvailabilityChange, serializeState]);

  useEffect(() => {
    if (paused || inputLocked) return;
    if (phase === "success") {
      const timer = window.setTimeout(() => { setPhase("ready"); setInput([]); }, 750);
      return () => window.clearTimeout(timer);
    }
    if (phase !== "listening") return;
    if (cueStep >= echo.sequence.length * 2) {
      const timer = window.setTimeout(() => { setPhase("answering"); setInput([]); }, 120);
      return () => window.clearTimeout(timer);
    }
    if (cueStep % 2 === 0) playSound(`rune-${echo.sequence[Math.floor(cueStep / 2)]}` as MiniGameSound);
    const duration = cueStep % 2 === 0 ? Math.max(330, 650 - echo.rounds * 18) : 180;
    const timer = window.setTimeout(() => setCueStep((step) => step + 1), duration);
    return () => window.clearTimeout(timer);
  }, [cueStep, echo.rounds, echo.sequence, inputLocked, paused, phase, playSound]);

  useEffect(() => () => { if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current); }, []);

  const listen = () => {
    if (paused || inputLocked || !echo.lives) return;
    setCueStep(0);
    setInput([]);
    setPressed(null);
    setPhase("listening");
  };

  const answer = useCallback((rune: number) => {
    if (phase !== "answering" || paused || inputLocked) return;
    const nextInput = [...input, rune];
    const result = checkEchoInput(echo.sequence, nextInput);
    setInput(nextInput);
    setPressed(rune);
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setPressed(null), 230);
    playSound(`rune-${rune}` as MiniGameSound);
    if (result === "wrong") {
      const lives = Math.max(0, echo.lives - 1);
      setEcho((state) => ({ ...state, lives }));
      setPhase(lives ? "mistake" : "finished");
      playSound("invalid");
    } else if (result === "complete") {
      setEcho(completeEchoRound(echo));
      setPhase("success");
      playSound("merge");
    }
  }, [echo, input, inputLocked, paused, phase, playSound]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const rune = Number(event.key) - 1;
      if (phase !== "answering" || paused || inputLocked || event.repeat || event.altKey || event.metaKey || event.ctrlKey) return;
      if (rune >= 0 && rune <= 3) { event.preventDefault(); answer(rune); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, inputLocked, paused, phase]);

  const status = phase === "ready" ? "音乐匣会奏出一段新的余烬记忆。" : phase === "listening" ? "先听、先看。记住刻纹回应的顺序。" : phase === "answering" ? `轮到你了 · ${input.length}/${echo.sequence.length}` : phase === "success" ? "记忆吻合。下一轮会多一枚刻纹。" : phase === "mistake" ? "余烬轻轻熄了一次。再听一遍这段旋律。" : `本次记住了 ${echo.rounds} 轮。余烬仍会等你。`;

  return <div className={`ember-echo-game phase-${phase}`}>
    <header className="jade-game-intro"><div><small>THE MUSIC OF THE JADE EMBER</small><h2>余烬回声</h2><p>记住亮起的顺序，再用四枚刻纹复奏。</p></div><span className="jade-game-progress"><strong>{echo.rounds + 1}</strong><small>当前轮次</small></span></header>
    <div className="echo-instrument">
      <div className="echo-instrument-border" aria-hidden="true" />
      <div className="echo-runes">{ECHO_RUNES.map((rune, index) => <button type="button" key={rune.name} className={`echo-rune ${activeRune === index ? "active" : ""}`} style={{ "--rune-color": rune.color } as CSSProperties} onClick={() => answer(index)} disabled={paused || inputLocked || phase !== "answering"} aria-label={rune.name} aria-pressed={activeRune === index}><svg viewBox="0 0 64 64" aria-hidden="true"><path d={rune.path} /></svg><span>{rune.name}</span><kbd>{index + 1}</kbd></button>)}</div>
      <div className="echo-seal" aria-hidden="true"><svg viewBox="0 0 64 64"><path d={ECHO_RUNES[0].path} /></svg></div>
    </div>
    <div className="echo-lives" aria-label={`剩余 ${echo.lives} 次机会`}>{[0, 1, 2].map((index) => <i key={index} className={index < echo.lives ? "whole" : "spent"} />)}<span>余烬尚存 {echo.lives} 次</span></div>
    <p className="jade-game-status" role="status">{status}</p>
    <div className="echo-controls">
      {(phase === "ready" || phase === "mistake") && <button type="button" onClick={listen} disabled={paused || inputLocked}>{echo.rounds === 0 && phase === "ready" ? "唤醒音乐匣" : "聆听这一轮"}</button>}
      {phase === "answering" && <button type="button" onClick={listen} disabled={paused || inputLocked}>再听一遍</button>}
      {phase === "finished" && <button type="button" onClick={resetGame}>重新点燃</button>}
    </div>
  </div>;
});
