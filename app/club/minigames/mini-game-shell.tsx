"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EmblemBlade, MiniGameController, MiniGameRegistration, MiniGameSound } from "./mini-game-types";
import { useGameRecords } from "./use-game-records";
import { gameTime, recordLabel } from "./game-records";
import { LoungeLeaderboard } from "./lounge-leaderboard";

const SOUND_STORAGE_KEY = "committee:minigames:sound";

function createGameTone(context: AudioContext, sound: MiniGameSound) {
  const patterns: Record<MiniGameSound, Array<[number, number, number, OscillatorType]>> = {
    select: [[493.88, 0, .08, "sine"]],
    pour: [[392, 0, .22, "sine"], [523.25, .12, .25, "triangle"]],
    invalid: [[196, 0, .12, "square"], [155.56, .08, .15, "square"]],
    drop: [[261.63, 0, .1, "triangle"]],
    collision: [[174.61, 0, .055, "sine"]],
    merge: [[523.25, 0, .14, "triangle"], [783.99, .08, .2, "sine"]],
    win: [[523.25, 0, .2, "sine"], [659.25, .13, .24, "triangle"], [987.77, .27, .34, "sine"]],
    "rune-0": [[293.66, 0, .36, "triangle"], [587.33, 0, .2, "sine"]],
    "rune-1": [[369.99, 0, .36, "triangle"], [739.99, 0, .2, "sine"]],
    "rune-2": [[440, 0, .36, "triangle"], [880, 0, .2, "sine"]],
    "rune-3": [[587.33, 0, .36, "triangle"], [1174.66, 0, .2, "sine"]],
  };
  const now = context.currentTime;
  patterns[sound].forEach(([frequency, offset, duration, type]) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now + offset);
    if (sound === "pour") oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.18, now + offset + duration);
    gain.gain.setValueAtTime(.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(sound === "invalid" ? .022 : .032, now + offset + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, now + offset + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + duration + .02);
  });
}

export function MiniGameShell({ registration, citizenId, emblemBlades, onClose, loungeTitle = "Committee Lounge", backLabel }: {
  registration: MiniGameRegistration;
  citizenId: string;
  emblemBlades: readonly EmblemBlade[];
  onClose: () => void;
  loungeTitle?: string;
  backLabel?: string;
}) {
  const [paused, setPaused] = useState(false);
  const [rankingsOpen, setRankingsOpen] = useState(false);
  const [inputLocked, setInputLocked] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [score, setScore] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => typeof window === "undefined" || window.localStorage.getItem(SOUND_STORAGE_KEY) !== "off");
  const controllerRef = useRef<MiniGameController>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const Component = registration.component;
  const records = useGameRecords(registration.id, citizenId, paused || inputLocked || rankingsOpen);
  const persist = records.onSnapshot;
  const closeRankings = useCallback(() => setRankingsOpen(false), []);

  const playSound = useCallback((sound: MiniGameSound) => {
    if (!soundEnabled) return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = audioRef.current ?? new AudioContextClass();
    audioRef.current = context;
    if (context.state === "suspended") void context.resume();
    createGameTone(context, sound);
  }, [soundEnabled]);

  const updateScore = useCallback((next: number) => setScore(next), []);

  const close = useCallback(() => {
    if (leaving) return;
    const snapshot = controllerRef.current?.serializeState();
    if (snapshot !== undefined) persist(snapshot);
    setPaused(true);
    setLeaving(true);
    closeTimerRef.current = window.setTimeout(onClose, 330);
  }, [leaving, onClose, persist]);

  useEffect(() => {
    const timer = window.setTimeout(() => setInputLocked(false), 460);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onVisibility = () => {
      if (document.hidden) setPaused(true);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [close]);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    const snapshot = controllerRef.current?.serializeState();
    if (snapshot !== undefined) persist(snapshot);
    const context = audioRef.current;
    audioRef.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => {});
  }, [persist]);

  const restart = () => {
    controllerRef.current?.resetGame();
    setPaused(false);
    setScore(0);
  };

  const toggleSound = () => {
    setSoundEnabled((current) => {
      const next = !current;
      try { window.localStorage.setItem(SOUND_STORAGE_KEY, next ? "on" : "off"); } catch { /* Non-critical. */ }
      return next;
    });
  };

  if (!Component) return null;

  return <section className={`mini-game-shell camera-${registration.preferredCameraMode} ${registration.theme ? `theme-${registration.theme}` : ""} ${leaving ? "leaving" : "entering"}`} aria-label={registration.title}>
    <header className="mini-game-header">
      <button type="button" className="mini-game-close" onClick={close} aria-label={backLabel ?? `返回 ${loungeTitle}`}><span aria-hidden="true">←</span><b>{backLabel ?? (registration.theme === "jade" ? "返回书房" : "LOUNGE")}</b></button>
      <div className="mini-game-title"><i>{registration.icon}</i><div><small>{loungeTitle.toUpperCase()} · PRIVATE TABLE</small><h1>{registration.title}</h1><p>{registration.description}</p></div></div>
      <div className="mini-game-score" aria-live="polite">
        {registration.scoreType !== "none" && <span><small>{registration.scoreType === "moves" ? "MOVES" : "SCORE"}</small><strong>{registration.scoreType === "moves" ? records.totalMoves : score}</strong></span>}
        <span title={records.best ? recordLabel(records.best) : "完成一局，留下你的第一条纪录"}><small>PERSONAL BEST</small><strong>{records.best ? registration.scoreType === "score" ? records.best.score.toLocaleString() : `${records.best.moves} 步` : "—"}</strong></span>
        <span><small>TIME</small><strong>{gameTime(records.elapsedMs)}</strong></span>
      </div>
      <nav className="mini-game-controls" aria-label="游戏控制">
        <button type="button" onClick={() => { void records.flush(); setRankingsOpen(true); }}>排行榜</button>
        {registration.supportsUndo && <button type="button" onClick={() => controllerRef.current?.undo?.()} disabled={!canUndo || paused || inputLocked}>撤回</button>}
        <button type="button" onClick={() => setPaused((current) => !current)}>{paused ? "继续" : "暂停"}</button>
        <button type="button" onClick={restart}>重开</button>
        <button type="button" className={soundEnabled ? "active" : ""} onClick={toggleSound} aria-pressed={soundEnabled}>{soundEnabled ? "声音开" : "声音关"}</button>
      </nav>
    </header>
    <p className="game-records-status" role="status">{records.syncStatus}<button type="button" onClick={() => void records.flush()}>同步纪录</button></p>

    <main className="mini-game-stage" style={{ "--game-aspect": registration.preferredAspectRatio } as React.CSSProperties}>
      <Component
        ref={controllerRef}
        initialState={records.initialSnapshot}
        paused={paused || rankingsOpen}
        inputLocked={inputLocked}
        soundEnabled={soundEnabled}
        emblemBlades={emblemBlades}
        onSnapshot={persist}
        onNewRun={records.beginRun}
        onScoreChange={updateScore}
        onUndoAvailabilityChange={setCanUndo}
        playSound={playSound}
      />
      {paused && <div className="mini-game-paused"><small>THE SPELL IS HELD</small><strong>游戏已暂停</strong><button type="button" onClick={() => setPaused(false)}>继续</button></div>}
    </main>
    {rankingsOpen && <LoungeLeaderboard citizenId={citizenId} initialGame={registration.id} initialBoard={records.boardId} onClose={closeRankings} />}
  </section>;
}

