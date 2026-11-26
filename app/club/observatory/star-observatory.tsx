"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { DEG, POLARIS_HIP, STRIDE, cameraBasis, clamp, directionAt, equatorialCoordinates, horizontalCoordinates, localBasis, panCamera, parseCatalog, prepareDirections, toHorizontal, type CatalogMetadata, type Observer, type StarCatalog, type Vec3 } from "./sky-engine";
import { paintSky, type SkyHit } from "./sky-renderer";

let catalogPromise: Promise<StarCatalog> | null = null;
function loadCatalog() {
  if (catalogPromise) return catalogPromise;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20000);
  catalogPromise = Promise.all([
    fetch("/data/mafraer-hyg-v41.bin", { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error("Star data unavailable"); return response.arrayBuffer(); }),
    fetch("/data/mafraer-hyg-v41.json", { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error("Star names unavailable"); return response.json(); }),
  ]).then(([buffer, metadata]) => parseCatalog(buffer, metadata as CatalogMetadata)).catch((error) => { controller.abort(); catalogPromise = null; throw error; }).finally(() => window.clearTimeout(timer));
  return catalogPromise;
}

const LOCATIONS: Observer[] = [
  { label: "新加坡", latitude: 1.35, longitude: 103.82 },
  { label: "济宁", latitude: 35.4, longitude: 116.6 },
  { label: "北京", latitude: 39.9, longitude: 116.4 },
];
const TARGETS = [
  { hip: 11767, name: "北极星 · Polaris", fov: 14 },
  { hip: 54061, name: "北斗七星", fov: 44 },
  { hip: 3179, name: "仙后座", fov: 32 },
  { hip: 91262, name: "织女星 · Vega", fov: 12 },
  { hip: 32349, name: "天狼星 · Sirius", fov: 12 },
];
const CONSTELLATIONS: Record<string, string> = { UMi: "小熊座", UMa: "大熊座", Cas: "仙后座", Lyr: "天琴座", CMa: "大犬座", Cep: "仙王座", Dra: "天龙座" };
const chineseName = (hip: number) => hip === 11767 ? "北极星" : hip === 91262 ? "织女星" : hip === 32349 ? "天狼星" : "";
const localTimeInput = (timestamp: number) => new Date(timestamp - new Date(timestamp).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const formatRA = (hours: number) => `${Math.floor(hours)}h ${String(Math.floor(hours % 1 * 60)).padStart(2, "0")}m`;
const validObserver = (value: unknown): value is Observer => {
  if (!value || typeof value !== "object") return false;
  const point = value as Observer;
  return typeof point.label === "string" && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
};
type Gesture = { forward: Vec3; fov: number; x: number; y: number; distance: number; moved: boolean };

export function StarObservatory({ onClose }: { onClose: () => void }) {
  const [catalog, setCatalog] = useState<StarCatalog | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [observer, setObserver] = useState<Observer>(LOCATIONS[0]);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [latitudeInput, setLatitudeInput] = useState("1.35");
  const [longitudeInput, setLongitudeInput] = useState("103.82");
  const [locationNote, setLocationNote] = useState("");
  const [baseTime, setBaseTime] = useState(() => Date.now());
  const [hourOffset, setHourOffset] = useState(0);
  const [live, setLive] = useState(true);
  const [fov, setFov] = useState(14);
  const [tracked, setTracked] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [manualDirection, setManualDirection] = useState<Vec3>([0, 1, .03]);
  const [horizon, setHorizon] = useState(true);
  const [lines, setLines] = useState(false);
  const [grid, setGrid] = useState(false);
  const [size, setSize] = useState(520);
  const [visibleStars, setVisibleStars] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const hitsRef = useRef<SkyHit[]>([]);
  const points = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const closeCallback = useRef(onClose);
  const locationRequest = useRef(0);
  closeCallback.current = onClose;

  const time = baseTime + hourOffset * 3600000;
  const directions = useMemo(() => catalog ? prepareDirections(catalog, time) : null, [catalog, time]);
  const local = useMemo(() => localBasis(time, observer), [time, observer]);
  const forward = tracked !== null && directions ? toHorizontal(directionAt(directions, tracked), local) : manualDirection;
  const forwardRef = useRef(forward);
  forwardRef.current = forward;
  const selectedIndex = selected ?? catalog?.byHip.get(POLARIS_HIP) ?? null;
  const selectedHorizontal = selectedIndex !== null && directions ? horizontalCoordinates(toHorizontal(directionAt(directions, selectedIndex), local)) : null;
  const selectedEquatorial = selectedIndex !== null && directions ? equatorialCoordinates(directionAt(directions, selectedIndex)) : null;
  const selectedRecord = selectedIndex !== null && catalog ? selectedIndex * STRIDE : null;
  const hip = selectedRecord !== null && catalog ? catalog.data[selectedRecord + 1] : 0;
  const hygId = selectedRecord !== null && catalog ? catalog.data[selectedRecord] : 0;
  const starName = catalog?.metadata.names[String(hygId)];
  const title = !catalog ? "北极星" : chineseName(hip) || starName?.name || starName?.designation || (hip ? `HIP ${hip}` : `HYG ${hygId}`);
  const subtitle = !catalog ? "Polaris · 小熊座" : `${starName?.name && chineseName(hip) ? starName.name : starName?.designation || (hip ? `HIP ${hip}` : `HYG ${hygId}`)}${starName?.constellation ? ` · ${CONSTELLATIONS[starName.constellation] || starName.constellation}` : ""}`;

  useEffect(() => {
    let active = true;
    setStatus("loading");
    void loadCatalog().then((value) => {
      if (!active) return;
      const polaris = value.byHip.get(POLARIS_HIP)!;
      setCatalog(value); setTracked(polaris); setSelected(polaris); setStatus("ready");
    }, () => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem("mafraer-observatory-location") || "null");
      if (validObserver(saved)) setObserver(saved);
    } catch { /* Local storage is optional; observation still works. */ }
    setPreferencesReady(true);
  }, []);
  useEffect(() => {
    setLatitudeInput(String(observer.latitude)); setLongitudeInput(String(observer.longitude));
    if (preferencesReady) try { localStorage.setItem("mafraer-observatory-location", JSON.stringify(observer)); } catch { /* Optional local preference. */ }
  }, [observer, preferencesReady]);
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => setBaseTime(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [live]);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeCallback.current(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, a[href], [tabindex='0']") ?? [])].filter((element) => element.getClientRects().length > 0);
      const first = focusable[0], last = focusable.at(-1);
      const outside = !dialogRef.current?.contains(document.activeElement);
      if (first && (outside || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last))) {
        event.preventDefault(); (event.shiftKey ? last : first)?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => { locationRequest.current++; document.removeEventListener("keydown", handleKey); };
  }, []);
  useEffect(() => {
    const element = lensRef.current;
    if (!element) return;
    const measure = () => setSize(Math.max(180, element.clientWidth));
    measure();
    const resize = new ResizeObserver(measure); resize.observe(element);
    return () => resize.disconnect();
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => { event.preventDefault(); setFov((value) => clamp(value * Math.exp(event.deltaY * .0015), 2, 100)); };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, []);

  useEffect(() => {
    if (!catalog || !directions || !canvasRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(size * pixelRatio); canvas.height = Math.round(size * pixelRatio);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const hits = paintSky(context, catalog, directions, { size, fieldOfView: fov, selected: selectedIndex ?? -1, horizon, lines, grid, camera: cameraBasis(forward), local });
      hitsRef.current = hits; setVisibleStars(hits.length);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [catalog, directions, size, fov, selectedIndex, horizon, lines, grid, forward[0], forward[1], forward[2], local]);

  const focusStar = (index: number, fieldOfView?: number) => { setTracked(index); setSelected(index); if (fieldOfView) setFov(fieldOfView); };
  const returnToPolaris = () => { const index = catalog?.byHip.get(POLARIS_HIP); if (index !== undefined) focusStar(index, 14); };
  const chooseStar = (x: number, y: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (x - rect.left) * size / rect.width, py = (y - rect.top) * size / rect.height;
    const nearest = hitsRef.current.map((hit) => ({ ...hit, distance: Math.hypot(hit.x - px, hit.y - py) })).filter((hit) => hit.distance < 14).sort((a, b) => a.distance - b.distance)[0];
    if (nearest) setSelected(nearest.index);
  };
  const startGesture = () => {
    const active = [...points.current.values()];
    if (!active.length) { gesture.current = null; return; }
    const a = active[0], b = active[1] || a;
    gesture.current = { forward: forwardRef.current, fov, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: active.length > 1 ? Math.hypot(a.x - b.x, a.y - b.y) : 0, moved: active.length > 1 };
  };
  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (status !== "ready" || (event.pointerType === "mouse" && event.button !== 0)) return;
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId); startGesture();
  };
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!points.current.has(event.pointerId) || !gesture.current) return;
    points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const active = [...points.current.values()], a = active[0], b = active[1] || a, start = gesture.current;
    const dx = (a.x + b.x) / 2 - start.x, dy = (a.y + b.y) / 2 - start.y;
    if (Math.hypot(dx, dy) > 4) start.moved = true;
    if (!start.moved) return;
    if (active.length > 1 && start.distance > 0) setFov(clamp(2 * Math.atan(Math.tan(start.fov * DEG / 2) * start.distance / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))) / DEG, 2, 100));
    if (Math.hypot(dx, dy) > 4) { setManualDirection(panCamera(start.forward, dx, dy, size, start.fov)); setTracked(null); }
  };
  const finishPointer = (event: PointerEvent<HTMLCanvasElement>, canceled = false) => {
    if (!points.current.has(event.pointerId)) return;
    if (!canceled && points.current.size === 1 && gesture.current && !gesture.current.moved) chooseStar(event.clientX, event.clientY);
    points.current.delete(event.pointerId); startGesture();
    if (gesture.current) gesture.current.moved = true;
  };
  const canvasKey = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const deltas: Record<string, [number, number]> = { ArrowLeft: [size * .08, 0], ArrowRight: [-size * .08, 0], ArrowUp: [0, size * .08], ArrowDown: [0, -size * .08] };
    if (deltas[event.key]) { event.preventDefault(); setManualDirection(panCamera(forward, ...deltas[event.key], size, fov)); setTracked(null); }
    if (event.key === "+" || event.key === "=") { event.preventDefault(); setFov((value) => clamp(value * .75, 2, 100)); }
    if (event.key === "-") { event.preventDefault(); setFov((value) => clamp(value / .75, 2, 100)); }
    if (event.key === "Home") { event.preventDefault(); returnToPolaris(); }
  };
  const useLocation = () => {
    if (!navigator.geolocation) { setLocationNote("可以直接填写观测地点的经纬度。"); return; }
    setLocationNote("正在取得观测地点…");
    const request = ++locationRequest.current;
    navigator.geolocation.getCurrentPosition((position) => {
      if (request !== locationRequest.current) return;
      setObserver({ label: "我的位置", latitude: Number(position.coords.latitude.toFixed(4)), longitude: Number(position.coords.longitude.toFixed(4)) }); setLocationNote("");
    }, () => { if (request === locationRequest.current) setLocationNote("未取得定位，可以选择城市或手动填写坐标。"); }, { timeout: 10000, maximumAge: 300000 });
  };
  const applyCoordinates = () => {
    const latitude = Number(latitudeInput), longitude = Number(longitudeInput);
    if (!latitudeInput.trim() || !longitudeInput.trim() || !validObserver({ latitude, longitude, label: "自定地点" })) { setLocationNote("纬度范围 −90°～90°，经度范围 −180°～180°。"); return; }
    locationRequest.current++; setObserver({ latitude, longitude, label: "自定地点" }); setLocationNote("");
  };

  return <div className="star-observatory-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} className="star-observatory" role="dialog" aria-modal="true" aria-labelledby="star-observatory-title">
      <header className="star-observatory-heading"><div><small>MAFRAER’S CELESTIAL OBSERVATORY</small><h2 id="star-observatory-title">把目光交给星空</h2><p>暗空模拟 · 真实恒星位置</p></div><button ref={closeRef} type="button" className="star-close" onClick={onClose} aria-label="离开望远镜，返回房间">×</button></header>
      <div className="star-observatory-body">
        <div className="star-observation">
          <div className="star-lens-status"><span>{status === "loading" ? "校准星空中" : tracked === null ? "自由观测" : hip === POLARIS_HIP && tracked === selectedIndex ? "北极星已锁定" : "恒星跟踪中"}</span><span>视野 {fov.toFixed(1)}°</span></div>
          <div ref={lensRef} className="star-lens">
            <canvas ref={canvasRef} tabIndex={0} role="img" aria-label={`真实恒星观测镜，当前可见 ${visibleStars} 颗星，已选 ${title}。方向键探索，加减键缩放，Home 返回北极星。`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={(event) => finishPointer(event)} onPointerCancel={(event) => finishPointer(event, true)} onLostPointerCapture={(event) => finishPointer(event, true)} onKeyDown={canvasKey} />
            <span className="star-lens-ornament" aria-hidden="true" />
            {status !== "ready" && <div className="star-lens-message" role="status">{status === "loading" ? <><span className="star-loading-ring" />正在校准星空…</> : <><p>星表暂时未能载入。</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>重新载入星表</button></>}</div>}
          </div>
          <p className="star-gesture-hint">拖动探索 · 滚轮 / 双指缩放 · 点击恒星</p>
          <div className="star-view-controls"><button type="button" onClick={() => setFov((value) => clamp(value / .75, 2, 100))} aria-label="缩小观测倍率">−</button><input type="range" min="2" max="100" step=".2" value={fov} onChange={(event) => setFov(Number(event.target.value))} aria-label="观测视野，单位度" /><button type="button" onClick={() => setFov((value) => clamp(value * .75, 2, 100))} aria-label="放大观测倍率">＋</button></div>
          <div className="star-view-presets"><button type="button" disabled={!catalog} onClick={returnToPolaris}>返回北极星</button><button type="button" onClick={() => setFov(60)}>广角找星</button><button type="button" onClick={() => setFov(4)}>望远镜视野</button></div>
        </div>
        <aside className="star-observatory-panel">
          <section className="star-information" aria-live="polite"><small>镜中恒星</small><h3>{status === "ready" ? title : "北极星"}</h3><p>{subtitle}</p>
            {selectedHorizontal && selectedEquatorial && catalog && selectedRecord !== null && <><dl><div><dt>亮度</dt><dd>{catalog.data[selectedRecord + 8].toFixed(2)} 等</dd></div><div><dt>高度角</dt><dd>{selectedHorizontal.altitude.toFixed(2)}°</dd></div><div><dt>方位角</dt><dd>{selectedHorizontal.azimuth.toFixed(2)}°</dd></div><div><dt>赤经 / 赤纬</dt><dd>{formatRA(selectedEquatorial.ra)} / {selectedEquatorial.dec.toFixed(2)}°</dd></div></dl><p className="star-position-note">{selectedHorizontal.altitude < 0 ? "这颗星此时位于该地点的地平线下。" : selectedHorizontal.altitude < 5 ? "贴近地平线；现实观测需要开阔的视线。" : "位于此刻的地平线上方。"}</p><button type="button" onClick={() => focusStar(selectedIndex!)}>让望远镜跟踪此星</button></>}
          </section>
          <label className="star-target-select">跳转天区<select defaultValue="" disabled={!catalog} onChange={(event) => { const target = TARGETS.find((item) => item.hip === Number(event.target.value)); const index = target && catalog?.byHip.get(target.hip); if (index !== undefined && target) focusStar(index, target.fov); event.target.value = ""; }}><option value="">选择要寻找的星空</option>{TARGETS.map((target) => <option key={target.hip} value={target.hip}>{target.name}</option>)}</select></label>
          <div className="star-map-options"><button type="button" aria-pressed={lines} onClick={() => setLines((value) => !value)}>星座连线</button><button type="button" aria-pressed={grid} onClick={() => setGrid((value) => !value)}>坐标网格</button><button type="button" aria-pressed={horizon} onClick={() => setHorizon((value) => !value)}>地平线</button></div>
          <details className="star-observer-settings"><summary>观测时间与地点 <span>{observer.label}</span></summary><div className="star-settings-content"><label>地点<select value={LOCATIONS.some((place) => place.label === observer.label) ? observer.label : "custom"} onChange={(event) => { const place = LOCATIONS.find((item) => item.label === event.target.value); if (place) { locationRequest.current++; setObserver(place); setLocationNote(""); } }}>{LOCATIONS.map((place) => <option key={place.label}>{place.label}</option>)}{!LOCATIONS.some((place) => place.label === observer.label) && <option value="custom">{observer.label}</option>}</select></label><button type="button" onClick={useLocation}>使用我的位置</button><div className="star-coordinate-inputs"><label>纬度<input type="number" min="-90" max="90" step=".0001" value={latitudeInput} onChange={(event) => setLatitudeInput(event.target.value)} /></label><label>经度<input type="number" min="-180" max="180" step=".0001" value={longitudeInput} onChange={(event) => setLongitudeInput(event.target.value)} /></label></div><button type="button" onClick={applyCoordinates}>应用坐标</button>{locationNote && <p role="status">{locationNote}</p>}<label>时间（设备当地时间）<input type="datetime-local" min="2000-01-01T00:00" max="2100-12-31T23:59" value={localTimeInput(time)} onChange={(event) => { const date = new Date(event.target.value); if (Number.isFinite(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100) { setBaseTime(date.getTime()); setHourOffset(0); setLive(false); } }} /></label><button type="button" onClick={() => { setLive(true); setBaseTime(Date.now()); setHourOffset(0); }}>当前时间</button></div></details>
          <label className="star-time-slider">时间偏移 <span>{hourOffset > 0 ? "+" : ""}{hourOffset} 小时</span><input type="range" min="-12" max="12" step=".5" value={hourOffset} onChange={(event) => setHourOffset(Number(event.target.value))} /></label>
          <p className="star-observer-readout">{observer.label} · {new Date(time).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}<br />{observer.latitude.toFixed(2)}° 纬度 / {observer.longitude.toFixed(2)}° 经度</p>
        </aside>
      </div>
      <footer className="star-observatory-footer"><p>真实星表，按时间与地点计算恒星位置。理想暗空模拟，不含天气、光污染与行星。</p><small><a href="https://github.com/astronexus/HYG-Database" target="_blank" rel="noreferrer">HYG 4.1 · David Nash / AstroNexus</a> · <a href="/data/MAFRAER-STAR-DATA-LICENSE.txt" target="_blank" rel="noreferrer">CC BY-SA 4.0</a></small></footer>
    </div>
  </div>;
}

