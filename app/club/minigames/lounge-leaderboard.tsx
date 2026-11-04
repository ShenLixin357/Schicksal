"use client";

import { useEffect, useRef, useState } from "react";
import { GAME_BOARDS, GAME_MEMBERS, gameTime, recordLabel, type GameBest } from "./game-records";
import type { MiniGameId } from "./mini-game-types";

export function LoungeLeaderboard({ citizenId, initialGame = "solitaire", initialBoard, onClose }: { citizenId: string; initialGame?: MiniGameId; initialBoard?: string; onClose: () => void }) {
  const [game, setGame] = useState(initialGame), [board, setBoard] = useState(initialBoard || GAME_BOARDS[initialGame].boards[0].id);
  const [rows, setRows] = useState<GameBest[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0), dialog = useRef<HTMLDivElement>(null), closeButton = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const policy = GAME_BOARDS[game], mine = rows.find((row) => row.citizenId === citizenId);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null; closeButton.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); closeRef.current(); }
      if (event.key === "Tab") {
        const elements = dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled]),select"); if (!elements?.length) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => { document.removeEventListener("keydown", handleKey, true); previous?.focus(); };
  }, []);
  useEffect(() => { const update = () => setRefresh((value) => value + 1); window.addEventListener("schicksal:game-records-updated", update); return () => window.removeEventListener("schicksal:game-records-updated", update); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setRows([]);
    void fetch(`/api/lounge-games?gameId=${game}&boardId=${board}`, { cache: "no-store", headers: { "X-Schicksal-Member": citizenId }, signal: controller.signal }).then(async (response) => {
      const payload = await response.json() as { rows?: GameBest[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "成绩簿暂时没有回应。");
      if (!controller.signal.aborted) setRows(payload.rows || []);
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "暂时无法读取排行榜。"); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [board, citizenId, game, refresh]);
  return <div className="lounge-leaderboard-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} className="lounge-leaderboard" role="dialog" aria-modal="true" aria-labelledby="lounge-record-title">
      <header><div><small>THE LOUNGE BOOK OF RECORDS</small><h2 id="lounge-record-title">月光成绩簿</h2><p>每位成员，只留自己最漂亮的一局。</p></div><button ref={closeButton} type="button" className="record-close" onClick={onClose} aria-label="关闭排行榜">×</button></header>
      <nav aria-label="选择游戏">{(Object.keys(GAME_BOARDS) as MiniGameId[]).map((id) => <button key={id} type="button" aria-pressed={game === id} onClick={() => { setGame(id); setBoard(GAME_BOARDS[id].boards[0].id); }}>{GAME_BOARDS[id].title}</button>)}</nav>
      <div className="record-board-choice"><label>榜单 <select aria-label="选择排行榜难度" value={board} onChange={(event) => setBoard(event.target.value)}>{policy.boards.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><button type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>刷新成绩</button></div>
      <p className="record-rule">{policy.score ? "最高分优先 · 同分共享名次" : "通关后上榜 · 总操作步数越少越好，同步数比较用时 · 撤回也计入操作"}</p>
      <div className="record-body" aria-live="polite" aria-busy={loading}>
        {loading ? <p className="record-empty">成绩正在月光中显现…</p> : error ? <p className="record-error">{error}</p> : <>
          {mine && <div className="record-personal"><small>你的个人最佳 · 第 {mine.rank} 名</small><strong>{recordLabel(mine)}</strong></div>}
          {rows.length === 0 && <p className="record-empty">这一页还没有留下纪录。下一局，写下你的名字。</p>}
          <ol>{rows.map((row) => { const member = GAME_MEMBERS.find((item) => item.id === row.citizenId); return <li key={row.citizenId} className={row.citizenId === citizenId ? "record-mine" : ""}><span className="record-place">{String(row.rank).padStart(2, "0")}</span><i style={{ color: member?.color }} aria-hidden="true">{member?.mark}</i><div><strong>{row.displayName}{row.citizenId === citizenId && <em>你</em>}</strong><small>{new Date(row.achievedAt).toLocaleDateString("zh-CN")}{game === "ember-echo" ? ` · 记住 ${row.rounds} 轮` : game === "merge-game" ? ` · 用时 ${gameTime(row.durationMs)}` : ""}</small></div><b>{policy.score ? row.score.toLocaleString() : row.moves}<small>{policy.score ? "分" : `步 · ${gameTime(row.durationMs)}`}</small></b></li>; })}</ol>
          <p className="record-awaiting">{GAME_MEMBERS.filter((member) => !rows.some((row) => row.citizenId === member.id)).map((member) => `${member.name} · 尚无纪录`).join("　/　")}</p>
        </>}
      </div>
      <footer>纪录绑定成员身份，修改面具名字后仍会保留。不同难度独立排名。</footer>
    </div>
  </div>;
}
