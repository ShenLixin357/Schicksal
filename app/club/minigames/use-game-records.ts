"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { comparePerformance, GAME_BOARDS, GAME_MEMBERS, performanceFromSnapshot, resultSnapshot, snapshotBoard, snapshotMoves, type GameBest, type GameSubmission } from "./game-records";
import type { MiniGameId } from "./mini-game-types";

type RunSave = { id: string; elapsed: number; moves: number; lastMoves: number; finished: boolean };
type SavedGame = { version: 1; snapshot: unknown; run: RunSave };
type Run = RunSave & { started: number | null };
type Outbox = Record<string, GameSubmission>;
const savedKey = (member: string, game: string) => `committee:member:${member}:${game}:state:v2`;
const outboxKey = (member: string) => `committee:member:${member}:game-outbox:v1`;
const bestKey = (member: string, game: string, board: string) => `committee:member:${member}:${game}:${board}:best:v1`;
function read<T>(key: string, fallback: T): T { try { return JSON.parse(window.localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function write(key: string, data: unknown) { try { window.localStorage.setItem(key, JSON.stringify(data)); return true; } catch { return false; } }
function freshRun(paused: boolean): Run {
  const id = [...crypto.getRandomValues(new Uint8Array(16))].map((value) => value.toString(16).padStart(2, "0")).join("");
  return { id, elapsed: 0, moves: 0, lastMoves: 0, finished: false, started: paused ? null : performance.now() };
}
function savedGame(member: string, game: MiniGameId): SavedGame | null {
  if (game === "solitaire" || typeof window === "undefined") return null;
  const saved = read<SavedGame | null>(savedKey(member, game), null);
  return saved?.version === 1 && typeof saved.run?.id === "string" && Number.isFinite(saved.run.elapsed) && saved.run.elapsed >= 0 && saved.run.elapsed <= 604800000 && Number.isInteger(saved.run.moves) && saved.run.moves >= 0 ? saved : null;
}

export function useGameRecords(gameId: MiniGameId, citizenId: string, paused: boolean) {
  const [startup] = useState(() => savedGame(citizenId, gameId));
  const [boardId, setBoardId] = useState(() => startup ? snapshotBoard(gameId, startup.snapshot) : GAME_BOARDS[gameId].boards[0].id);
  const [best, setBest] = useState<GameBest | null>(() => read(bestKey(citizenId, gameId, boardId), null));
  const [syncStatus, setSyncStatus] = useState("正在连接成绩簿…");
  const [elapsedMs, setElapsedMs] = useState(startup?.run.elapsed ?? 0);
  const [totalMoves, setTotalMoves] = useState(startup?.run.moves ?? 0);
  const run = useRef<Run>(startup ? { ...startup.run, started: null } : freshRun(true));
  const board = useRef(boardId), lastSnapshot = useRef<unknown>(null), bestRef = useRef<GameBest | null>(best);
  const pausedRef = useRef(paused), alive = useRef(true), inFlight = useRef(false);
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCandidate = useRef<Record<string, { rankPrimary: number; rankSecondary: number }>>({});
  const volatileOutbox = useRef<Outbox>({});
  const elapsed = useCallback(() => run.current.elapsed + (run.current.started === null ? 0 : performance.now() - run.current.started), []);

  const flush = useCallback(async () => {
    if (inFlight.current || typeof window === "undefined" || !navigator.onLine) return;
    inFlight.current = true;
    try {
      const entries = Object.entries({ ...read<Outbox>(outboxKey(citizenId), {}), ...volatileOutbox.current });
      for (const [key, submission] of entries) {
        const response = await fetch("/api/lounge-games", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Schicksal-Member": citizenId }, body: JSON.stringify(submission), keepalive: true });
        const payload = await response.json() as { personalBest?: GameBest; error?: string };
        if (!response.ok) {
          if (response.status === 400 || response.status === 413) { const current = read<Outbox>(outboxKey(citizenId), {}); if (current[key]?.runId === submission.runId) { delete current[key]; write(outboxKey(citizenId), current); } if (volatileOutbox.current[key]?.runId === submission.runId) delete volatileOutbox.current[key]; }
          if (alive.current) setSyncStatus(payload.error || "成绩已留在本机，稍后重试同步。");
          break;
        }
        const current = read<Outbox>(outboxKey(citizenId), {}), queued = current[key];
        if (queued && JSON.stringify(queued) === JSON.stringify(submission)) { delete current[key]; write(outboxKey(citizenId), current); }
        if (JSON.stringify(volatileOutbox.current[key]) === JSON.stringify(submission)) delete volatileOutbox.current[key];
        const cloudBest = payload.personalBest;
        window.dispatchEvent(new Event("schicksal:game-records-updated"));
        if (cloudBest) write(bestKey(citizenId, cloudBest.gameId, cloudBest.boardId), cloudBest);
        if (alive.current && cloudBest?.gameId === gameId && cloudBest.boardId === board.current && (!bestRef.current || comparePerformance(cloudBest, bestRef.current) <= 0)) { bestRef.current = cloudBest; setBest(cloudBest); }
      }
      if (alive.current) {
        const pending = Object.keys({ ...read<Outbox>(outboxKey(citizenId), {}), ...volatileOutbox.current }).length;
        if (!pending) setSyncStatus("个人纪录已同步到成绩簿");
      }
    } catch { if (alive.current) setSyncStatus("成绩已留在本机，联网后会自动同步。"); }
    finally { inFlight.current = false; }
  }, [citizenId, gameId]);

  const persist = useCallback(() => {
    if (lastSnapshot.current === null || gameId === "solitaire") return;
    const { started: _started, ...data } = run.current;
    write(savedKey(citizenId, gameId), { version: 1, snapshot: lastSnapshot.current, run: { ...data, elapsed: Math.round(elapsed()) } });
  }, [citizenId, elapsed, gameId]);
  const beginRun = useCallback(() => {
    run.current = freshRun(pausedRef.current); lastSnapshot.current = null; lastCandidate.current = {};
    setElapsedMs(0); setTotalMoves(0);
  }, []);
  const onSnapshot = useCallback((snapshot: unknown) => {
    const nextBoard = snapshotBoard(gameId, snapshot);
    if (board.current !== nextBoard) { beginRun(); board.current = nextBoard; const cached = read<GameBest | null>(bestKey(citizenId, gameId, nextBoard), null); bestRef.current = cached; setBest(cached); setBoardId(nextBoard); }
    const moves = snapshotMoves(gameId, snapshot), change = moves - run.current.lastMoves;
    run.current.moves += change >= 0 ? change : 1; run.current.lastMoves = moves;
    setTotalMoves(run.current.moves);
    lastSnapshot.current = snapshot;
    const durationMs = Math.round(elapsed()), result = performanceFromSnapshot(gameId, snapshot, durationMs, run.current.moves);
    if (result && !GAME_BOARDS[gameId].score && !run.current.finished) { run.current.elapsed = durationMs; run.current.started = null; run.current.finished = true; setElapsedMs(durationMs); }
    else if (!result && run.current.finished) { run.current.finished = false; run.current.started = pausedRef.current ? null : performance.now(); }
    persist();
    if (!result) return;
    const key = `${gameId}:${result.boardId}`, previous = lastCandidate.current[key];
    if (previous && comparePerformance(result, previous) >= 0) return;
    lastCandidate.current[key] = result;
    if (bestRef.current && bestRef.current.boardId === result.boardId && comparePerformance(result, bestRef.current) >= 0) return;
    const submission: GameSubmission = { gameId, runId: run.current.id, snapshot: resultSnapshot(gameId, snapshot), durationMs, effortMoves: run.current.moves };
    const outbox = { ...read<Outbox>(outboxKey(citizenId), {}), ...volatileOutbox.current }, old = outbox[key];
    const oldResult = old ? performanceFromSnapshot(gameId, old.snapshot, old.durationMs, old.effortMoves) : null;
    if (!oldResult || comparePerformance(result, oldResult) < 0) { outbox[key] = submission; volatileOutbox.current[key] = submission; }
    const stored = write(outboxKey(citizenId), outbox);
    const preferred = oldResult && comparePerformance(oldResult, result) < 0 ? oldResult : result;
    const localBest: GameBest = { ...preferred, citizenId, displayName: GAME_MEMBERS.find((member) => member.id === citizenId)?.name || citizenId, runId: outbox[key]?.runId || run.current.id, achievedAt: new Date().toISOString() };
    bestRef.current = localBest; setBest(localBest);
    write(bestKey(citizenId, gameId, nextBoard), localBest);
    setSyncStatus(stored ? "新个人纪录 · 等待同步" : "本机空间不足，联网同步前请保留此页");
    if (sendTimer.current !== null) clearTimeout(sendTimer.current);
    sendTimer.current = setTimeout(() => { void flush(); }, 950);
  }, [beginRun, citizenId, elapsed, flush, gameId, persist]);

  useEffect(() => {
    pausedRef.current = paused;
    if (paused && run.current.started !== null) { run.current.elapsed = elapsed(); run.current.started = null; persist(); }
    else if (!paused && !run.current.finished && run.current.started === null) run.current.started = performance.now();
  }, [elapsed, paused, persist]);
  useEffect(() => {
    alive.current = true;
    const tick = setInterval(() => { if (!pausedRef.current && !run.current.finished) setElapsedMs(Math.round(elapsed())); }, 1000);
    const sync = () => { void flush(); }, save = () => { persist(); void flush(); };
    window.addEventListener("online", sync); window.addEventListener("focus", sync); window.addEventListener("pagehide", save);
    void flush();
    return () => { alive.current = false; clearInterval(tick); window.removeEventListener("online", sync); window.removeEventListener("focus", sync); window.removeEventListener("pagehide", save); if (sendTimer.current !== null) clearTimeout(sendTimer.current); persist(); void flush(); };
  }, [elapsed, flush, persist]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/lounge-games?gameId=${encodeURIComponent(gameId)}&boardId=${encodeURIComponent(boardId)}`, { cache: "no-store", headers: { "X-Schicksal-Member": citizenId }, signal: controller.signal }).then(async (response) => {
      const payload = await response.json() as { personalBest?: GameBest; error?: string };
      if (controller.signal.aborted) return;
      if (!response.ok) { setSyncStatus(payload.error || "成绩簿暂时没有回应。"); return; }
      if (payload.personalBest && (!bestRef.current || comparePerformance(payload.personalBest, bestRef.current) <= 0)) { bestRef.current = payload.personalBest; setBest(payload.personalBest); write(bestKey(citizenId, gameId, boardId), payload.personalBest); }
      setSyncStatus(Object.keys(read<Outbox>(outboxKey(citizenId), {})).length ? "本机有待同步纪录" : "纪录随成员身份保存");
    }).catch(() => { if (!controller.signal.aborted) setSyncStatus("暂时离线，新的纪录会留在本机等待同步。"); });
    return () => controller.abort();
  }, [boardId, citizenId, gameId]);
  return { initialSnapshot: startup?.snapshot ?? null, boardId, best, syncStatus, elapsedMs, totalMoves, onSnapshot, beginRun, flush };
}
