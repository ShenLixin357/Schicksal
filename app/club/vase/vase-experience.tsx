"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { chatTimestamp } from "../chat-history";
import { VaseArtwork } from "./vase-art";
import { getVase, VASE_GROUPS, VASE_OPTIONS, type VaseChange, type VaseHistoryEntry, type VaseRoom } from "./vase-catalogue";
import "./vase-experience.css";

type Props = { room?: VaseRoom; citizenId: string; memberName: (id: string) => string; onRoomChange: (room: VaseRoom) => void };
type Draw = { phase: "shuffling" | "revealing"; frozen: string; result: VaseChange | null };
type HistoryPage = { items: VaseHistoryEntry[]; nextCursor: number | null; error?: string };

export function VaseExperience({ room, citizenId, memberName, onRoomChange }: Props) {
  const anchor = useRef<HTMLSpanElement>(null), hotspot = useRef<HTMLButtonElement>(null), dialog = useRef<HTMLElement>(null);
  const [hosts, setHosts] = useState<{ stage: HTMLElement; room: HTMLElement } | null>(null);
  const [pane, setPane] = useState<"menu" | "history" | null>(null);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [history, setHistory] = useState<VaseHistoryEntry[]>([]), [cursor, setCursor] = useState<number | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false), [historyLoaded, setHistoryLoaded] = useState(false);
  const [celebrated, setCelebrated] = useState("");
  const [pageVisible, setPageVisible] = useState(true);
  const alive = useRef(true), locked = useRef(false), skip = useRef(false), activeDraw = useRef<VaseChange | null>(null);
  const drawId = useRef<string | null>(null), request = useRef<AbortController | null>(null), historyRequest = useRef<AbortController | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null), timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gesture = useRef<{ x: number; y: number; consumed: boolean } | null>(null);
  const current = room?.vaseSelection ?? "autumn";

  function later(fn: () => void, milliseconds: number) { const timer = setTimeout(fn, milliseconds); timers.current.push(timer); return timer; }
  function cancelPress() { if (pressTimer.current) clearTimeout(pressTimer.current); pressTimer.current = null; }

  useEffect(() => {
    alive.current = true;
    const visibility = () => setPageVisible(!document.hidden);
    visibility(); document.addEventListener("visibilitychange", visibility);
    const stage = anchor.current?.closest<HTMLElement>(".club-room-stage"), parent = anchor.current?.closest<HTMLElement>(".committee-restroom");
    if (stage && parent) setHosts({ stage, room: parent });
    return () => {
      alive.current = false; request.current?.abort(); historyRequest.current?.abort(); cancelPress();
      document.removeEventListener("visibilitychange", visibility);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const open = pane !== null || draw !== null;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); if (locked.current) { skip.current = true; } else setPane(null); }
      if (event.key !== "Tab" || !element) return;
      const buttons = Array.from(element.querySelectorAll<HTMLElement>("button:not(:disabled),[tabindex='0']"));
      const first = buttons[0], last = buttons.at(-1);
      if (!first) { event.preventDefault(); element.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === element)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); if (previous?.isConnected) previous.focus(); else hotspot.current?.focus(); };
  }, [open, pane, Boolean(draw)]);

  async function loadHistory(before: number | null = null) {
    historyRequest.current?.abort(); const controller = new AbortController(); historyRequest.current = controller;
    setHistoryBusy(true); setError("");
    try {
      const response = await fetch(`/api/committee-club/vase-history${before ? `?before=${before}` : ""}`, { cache: "no-store", signal: controller.signal });
      const payload = await response.json() as HistoryPage;
      if (!response.ok) throw new Error(payload.error || "往事暂时没有展开。");
      if (!alive.current || controller.signal.aborted) return;
      setHistory(items => before ? [...items, ...payload.items.filter(item => !items.some(old => old.seq === item.seq))] : payload.items);
      setCursor(payload.nextCursor); setHistoryLoaded(true);
    } catch (reason) { if (alive.current && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : "往事暂时没有展开。"); }
    finally { if (alive.current && !controller.signal.aborted) setHistoryBusy(false); }
  }
  function showHistory() { if (locked.current) return; setError(""); setPane("history"); setHistoryLoaded(false); void loadHistory(); }

  async function save(action: "vase" | "vase-random", selection: string | undefined, id: string) {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    const response = await fetch("/api/committee-club", {
      method: "POST", headers: { "content-type": "application/json", "x-schicksal-member": citizenId },
      body: JSON.stringify({ action, vaseSelection: selection, requestId: id, citizenId }), signal: controller.signal,
    });
    const payload = await response.json() as VaseChange & { error?: string };
    if (!response.ok) throw new Error(payload.error || "花瓶暂时没有回应，请再试一次。");
    if (!payload.room || !VASE_OPTIONS.some(item => item.id === payload.room.vaseSelection)) throw new Error("花瓶暂时没有回应，请再试一次。");
    return payload;
  }

  async function select(selection: string) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try {
      const result = await save("vase", selection, crypto.randomUUID());
      if (!alive.current) return;
      drawId.current = null; // An explicit manual choice starts a fresh future draw.
      onRoomChange(result.room); setPane(null);
    } catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : "这次更换没有完成。"); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }

  function finishDraw() {
    const result = activeDraw.current;
    if (!result) { skip.current = true; return; }
    timers.current.forEach(clearTimeout); timers.current = [];
    onRoomChange(result.room); activeDraw.current = null; drawId.current = null;
    setCelebrated(result.draw?.vaseSelection ?? result.room.vaseSelection);
    later(() => setCelebrated(""), 2200);
    setDraw(null); setBusy(false); locked.current = false;
  }

  async function guess() {
    if (locked.current) return;
    locked.current = true; skip.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    activeDraw.current = null; setError(""); setPane(null); setBusy(true);
    const started = performance.now();
    setDraw({ phase: "shuffling", frozen: current, result: null });
    drawId.current ??= crypto.randomUUID();
    try {
      const result = await save("vase-random", undefined, drawId.current);
      if (!alive.current) return;
      activeDraw.current = result;
      if (skip.current) { finishDraw(); return; }
      const reveal = () => {
        if (!alive.current || !activeDraw.current) return;
        if (skip.current) { finishDraw(); return; }
        setDraw(value => value ? { ...value, phase: "revealing", result } : value);
        later(finishDraw, 1000);
      };
      later(reveal, Math.max(0, 500 - (performance.now() - started)));
    } catch (reason) {
      if (!alive.current) return;
      setDraw(null); setPane("menu"); setBusy(false); locked.current = false;
      setError(reason instanceof Error ? reason.message : "揭晓暂时中断，再点一次继续。");
      // Keep drawId on an uncertain network result: retry recovers the SAME draw.
    }
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || locked.current) return;
    gesture.current = { x: event.clientX, y: event.clientY, consumed: false };
    // Safari may reject pointer capture during portal / scene transitions.
    // Keep ordinary clicks and long-press history functional in that case.
    try { event.currentTarget.setPointerCapture(event.pointerId); }
    catch { /* A normal pointerup/click still completes the interaction. */ }
    cancelPress();
    pressTimer.current = setTimeout(() => { if (gesture.current) gesture.current.consumed = true; showHistory(); }, 600);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const start = gesture.current;
    if (start && Math.hypot(start.x - event.clientX, start.y - event.clientY) > 10) { start.consumed = true; cancelPress(); }
  }
  function shortClick() {
    cancelPress();
    if (gesture.current?.consumed) { gesture.current = null; return; }
    gesture.current = null;
    if (!locked.current) { setError(""); setPane(value => value === "menu" ? null : "menu"); }
  }

  const visible = draw ? draw.frozen : current;
  const drawnId = draw?.result?.draw?.vaseSelection ?? draw?.result?.room.vaseSelection;
  const royal = drawnId ? getVase(drawnId).group === "royal" : false;
  const historical = history.length ? history : historyLoaded && room?.updatedByCitizenId
    ? [{ seq: 0, citizenId: room.updatedByCitizenId, vaseSelection: room.vaseSelection, createdAt: room.updatedAt, method: "manual" as const }] : [];

  return <>
    <span ref={anchor} className="vase-anchor" />
    <div className={`club-vase-display vase-${visible}`} data-vase-paused={!pageVisible ? "true" : undefined} aria-hidden="true"><VaseArtwork key={visible} selection={visible} celebrated={celebrated === visible} /></div>
    {hosts && createPortal(<button ref={hotspot} className="club-hotspot vase vase-experience-hotspot" type="button"
      aria-label="更换桌上花瓶陈设；长按查看往事" aria-haspopup="dialog" aria-expanded={open} disabled={busy}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={cancelPress} onPointerCancel={() => { cancelPress(); gesture.current = null; }}
      onContextMenu={event => event.preventDefault()} onClick={shortClick}
      onKeyDown={event => { if (event.key === "ContextMenu" || (event.shiftKey && ["F10", "Enter"].includes(event.key))) { event.preventDefault(); showHistory(); } }}><i /><span>更换桌上花瓶</span></button>, hosts.stage)}
    {hosts && open && createPortal(<div className={`vase-experience-layer ${draw ? "has-draw" : ""}`}>
      {draw ? <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="抽取花瓶陈设" className={`vase-draw-dialog ${draw.phase} ${royal ? "royal" : ""} ${drawnId === "royal-rose" ? "diamond" : ""}`}>
        <button type="button" className="vase-draw-surface" aria-label={drawnId ? `${getVase(drawnId).label}，点击回到花瓶` : "揭晓花瓶陈设，点击可跳过动画"} onClick={finishDraw}>
          <span className="vase-draw-halo" aria-hidden="true" />
          <span className="vase-draw-stack" aria-hidden="true"><i /><i /></span>
          <span className="vase-draw-card"><span className="vase-card-back"><img src="/vase/guess-what.svg" alt="" /><b aria-hidden="true">✦</b></span>
            <span className="vase-card-front">{drawnId && <><small>{royal ? "A ROYAL LITTLE WONDER" : "A LITTLE WONDER"}</small><span className="vase-card-art"><VaseArtwork selection={drawnId} celebrated /></span><strong>{getVase(drawnId).label}</strong></>}</span></span>
        </button>
        <p className="vase-draw-announcement" aria-live="polite">{draw.phase === "revealing" && drawnId ? getVase(drawnId).label : ""}</p>
      </section> : <>
        <button type="button" className="vase-pane-backdrop" tabIndex={-1} aria-label="关闭花瓶菜单" onClick={() => { if (!locked.current) setPane(null); }} />
        <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="vase-pane-title" className="vase-experience-menu">
          <header><div><small>THE ENCHANTED VASE</small><h2 id="vase-pane-title">{pane === "history" ? "花瓶里的往事" : "今天插什么？"}</h2></div><button type="button" className="vase-close" aria-label="关闭花瓶菜单" disabled={busy} onClick={() => setPane(null)}>×</button></header>
          {error && <p className="vase-error" role="alert">{error}</p>}
          {pane === "history" ? <>
            <div className="vase-history-scroll" aria-busy={historyBusy}><ol>{historical.map(item => <li key={item.seq}>
              <div><strong>{memberName(item.citizenId)}</strong><span>{getVase(item.vaseSelection).label}</span></div>
              <time dateTime={item.createdAt}>{chatTimestamp(item.createdAt)}</time>
            </li>)}</ol>{!historical.length && !historyBusy && !error && <p className="vase-empty">这里的往事，会从下一次更换开始。</p>}
              {historyBusy && <p className="vase-empty" role="status">往事正在展开…</p>}
              {cursor && <button type="button" className="vase-quiet-button" disabled={historyBusy} onClick={() => void loadHistory(cursor)}>更早一些</button>}
              {error && <button type="button" className="vase-quiet-button" disabled={historyBusy} onClick={() => void loadHistory()}>重新展开</button>}
            </div><footer><button type="button" className="vase-quiet-button" onClick={() => { setError(""); setPane("menu"); }}>回到花瓶</button></footer>
          </> : <>
            <div className="vase-name-list" aria-busy={busy}>{VASE_GROUPS.map(group => <section key={group.id}><h3>{group.label}</h3><ul>{VASE_OPTIONS.filter(item => !item.hidden && item.group === group.id).map(item => <li key={item.id}><button type="button" className={current === item.id ? "selected" : ""} aria-pressed={current === item.id} disabled={busy} onClick={() => void select(item.id)}>{item.label}<span aria-hidden="true">{current === item.id ? "·" : ""}</span></button></li>)}</ul></section>)}</div>
            <footer><button className="vase-guess-button" type="button" onClick={() => void guess()} disabled={busy} aria-label="Guess What? 随机抽取陈设"><img src="/vase/guess-what.svg" alt="" /></button>
              <button className="vase-quiet-button vase-history-link" type="button" onClick={showHistory} disabled={busy}>往事</button></footer>
          </>}
        </section>
      </>}
    </div>, hosts.room)}
  </>;
}
