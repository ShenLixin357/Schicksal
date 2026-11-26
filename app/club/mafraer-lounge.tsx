"use client";

import Image from "next/image";
import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { MafraerMechanisms, MAFRAER_MECHANISM_ASSETS } from "./mafraer-mechanisms";
import { MAFRAER_ROOM_ASSETS } from "./mafraer-assets";

const StarObservatory = lazy(() => import("./observatory/star-observatory").then((module) => ({ default: module.StarObservatory })));

export { MAFRAER_ROOM_ASSETS } from "./mafraer-assets";
// Percent anchors measured against the final artwork. The whole stage, including
// art, hit areas and effects, shares one 1600 × 900 coordinate system while zooming.
const ANCHORS = {
  chandelier: { x: 59, y: 31.2, w: 16.5, h: 29.8 },
  moon: { x: 78, y: 43.8, w: 5.1, h: 9.2 },
  crystal: { x: 61.9, y: 68, w: 4.8, h: 8.5 },
  telescope: { x: 67.3, y: 68.9, w: 15, h: 28.8 },
  snowflake: { x: 63.4, y: 92.9, w: 38, h: 7 },
} as const;

// Room spells follow the same measured anchors as the hit areas.
const scenePoint = (anchor: keyof typeof ANCHORS) => ({ x: ANCHORS[anchor].x * 16, y: ANCHORS[anchor].y * 9 });
const CRYSTAL = scenePoint("crystal");
const MOON = scenePoint("moon");
const CHANDELIER = scenePoint("chandelier");
const FLOOR = scenePoint("snowflake");
const originStyle = (point: { x: number; y: number }) => ({ "--spell-origin": `${point.x}px ${point.y}px` } as CSSProperties);

type Magic = "moon" | "crystal" | "snowflake";
const DUST = Array.from({ length: 34 }, (_, i) => ({ x: (i * 37 + 7) % 100, y: (i * 53 + 11) % 100, size: 1.5 + i % 3, delay: i % 9 * .12 }));

function objectStyle(anchor: keyof typeof ANCHORS): CSSProperties {
  const item = ANCHORS[anchor];
  return { left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, height: `${item.h}%` };
}

export function MafraerLounge({ onBack, ownerName, visitorName, isOwner, ownerAvatar }: {
  onBack: () => void; ownerName: string; visitorName: string; isOwner: boolean; ownerAvatar: ReactNode;
}) {
  const [lighting, setLighting] = useState<"moonlit" | "loading" | "lit">("moonlit");
  const [lightSpell, setLightSpell] = useState(0);
  const [magic, setMagic] = useState<{ kind: Magic; token: number } | null>(null);
  const [observing, setObserving] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [mechanismsReady, setMechanismsReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [whisper, setWhisper] = useState(isOwner ? "冰晶月宫认出了玛法女巫。轻触窗外的扫帚、厚被子，或按住水晶球，让房间回应你的魔力。" : `月光认出了访客 ${visitorName}。轻触扫帚与被子，或按住水晶球，探索玛法女巫的小机关。`);
  const serial = useRef(0);
  const lightRequest = useRef(0);
  const lightTimer = useRef<number | null>(null);
  const magicTimer = useRef<number | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; pan: typeof pan } | null>(null);
  const telescopeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try { setSoundEnabled(window.localStorage.getItem("committee:mafraer:sound") !== "off"); } catch { /* Sound is optional without device storage. */ }
  }, []);
  const toggleSound = () => setSoundEnabled((enabled) => {
    try { window.localStorage.setItem("committee:mafraer:sound", enabled ? "off" : "on"); } catch { /* Keep the in-memory preference. */ }
    return !enabled;
  });

  useEffect(() => () => {
    lightRequest.current += 1;
    [lightTimer, magicTimer].forEach((timer) => { if (timer.current !== null) window.clearTimeout(timer.current); });
  }, []);

  const toggleLight = () => {
    if (lighting === "loading") return;
    setLightSpell((count) => count + 1);
    if (lighting === "lit") {
      setLighting("moonlit");
      setWhisper("你收回了吊灯中的魔力。地板上的冰晶折光慢慢消退，月光仍留在雪花纹样里。");
      return;
    }
    setLighting("loading");
    setWhisper("冰晶月亮把魔力送入吊灯，切面一枚枚醒来…");
    const request = ++lightRequest.current;
    const art = new window.Image();
    let settled = false;
    const finish = (loaded: boolean) => {
      if (settled || request !== lightRequest.current) return;
      settled = true;
      if (lightTimer.current !== null) window.clearTimeout(lightTimer.current);
      lightTimer.current = null;
      setLighting(loaded ? "lit" : "moonlit");
      setWhisper(loaded ? "巨大的冰晶吊灯被你的魔力点亮。细碎的银蓝与淡紫折光洒在地板上，围着中央雪花轻轻闪耀。" : "冰晶暂时没有聚起光线。房间仍留着月光，可以再试一次。");
    };
    lightTimer.current = window.setTimeout(() => finish(false), 12000);
    art.src = mechanismsReady ? MAFRAER_MECHANISM_ASSETS.lit : MAFRAER_ROOM_ASSETS.lit;
    void art.decode().then(() => finish(true), () => finish(false));
  };

  const cast = (kind: Magic) => {
    if (magicTimer.current !== null) window.clearTimeout(magicTimer.current);
    setMagic({ kind, token: ++serial.current });
    const notes: Record<Magic, string> = {
      moon: "月亮认出了冰晶印记。星尘沿着月光落入水晶球，银河在玻璃里缓缓舒展。",
      crystal: "悬浮水晶球里的魔力凝成星辰，把一缕冰蓝光送回窗外的冰晶弯月。",
      snowflake: "地板中央的巨大雪花回应了你。冰晶星轨沿着雕纹展开，又安静地融入紫色月光。",
    };
    setWhisper(notes[kind]);
    magicTimer.current = window.setTimeout(() => setMagic(null), 5600);
  };

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!zoomed || !event.isPrimary || (event.target as HTMLElement).closest("button") || (event.pointerType === "mouse" && event.button !== 0)) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, pan };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!zoomed || !start || event.pointerId !== start.id) return;
    const horizontal = event.currentTarget.clientWidth * .29;
    const vertical = event.currentTarget.clientWidth * .16;
    setPan({ x: Math.max(-horizontal, Math.min(horizontal, start.pan.x + event.clientX - start.x)), y: Math.max(-vertical, Math.min(vertical, start.pan.y + event.clientY - start.y)) });
  };
  const closeObservatory = () => { setObserving(false); telescopeRef.current?.focus(); };

  return <section className={`mafraer-lounge ${lighting === "lit" ? "crystal-lit" : "moonlit-palace"} ${zoomed ? "close-view" : "full-view"} ${mechanismsReady ? "palace-mechanisms-ready" : ""}`} aria-label="Lady Mafraer the Witch 的紫色冰晶城堡卧室 Lounge">
    <header className="mafraer-toolbar">
      <button type="button" onClick={onBack}>← 返回 Lounge</button>
      <div className="mafraer-room-heading"><small>PRIVATE LOUNGE · NO. 01</small><h1>MAFRAER’S <em>LOUNGE</em></h1></div>
      <div className="mafraer-room-actions"><button type="button" onClick={toggleLight} disabled={lighting === "loading"} aria-pressed={lighting === "lit"}>{lighting === "loading" ? "魔力凝聚中…" : lighting === "lit" ? "施法关灯" : "施法开灯"}</button><button type="button" aria-pressed={zoomed} onClick={() => { setZoomed((value) => !value); setPan({ x: 0, y: 0 }); }}>{zoomed ? "看全景" : "放大房间"}</button><button type="button" onClick={toggleSound} aria-pressed={soundEnabled}>{soundEnabled ? "声音开" : "声音关"}</button></div>
    </header>
    <div className="mafraer-scene-viewport" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
      <div className="mafraer-room-stage" style={{ "--palace-zoom": zoomed ? 1.7 : 1, "--palace-pan-x": `${pan.x}px`, "--palace-pan-y": `${pan.y}px` } as CSSProperties}>
        <Image className="mafraer-room-art palace-moonlit-art" src={MAFRAER_ROOM_ASSETS.moonlit} alt="紫色冰晶尖塔卧室：带纤细护栏的高床与长床纱、柱间帷帐遮掩的床下秘密空间、通透的雪花冰晶吊灯、小巧悬浮的绳降装置与停在蹦床上方的弹性曲线绳、延长缓坡的冰晶滑梯和厚地毯、反射望远镜、窗外冰晶弯月与细长冰棱尾端的女巫扫帚，以及雪花上方悬在半空的透明切面水晶球" fill sizes="(max-width: 760px) 100vw, calc(100vw - 248px)" priority unoptimized />
        <Image className="mafraer-room-art palace-lit-art" src={MAFRAER_ROOM_ASSETS.lit} alt="" aria-hidden="true" fill sizes="(max-width: 760px) 100vw, calc(100vw - 248px)" loading="eager" unoptimized />
        <Image className="mafraer-room-art palace-clean-moonlit" src={MAFRAER_MECHANISM_ASSETS.moonlit} alt="" aria-hidden="true" fill sizes="(max-width: 760px) 100vw, calc(100vw - 248px)" loading="eager" unoptimized />
        <Image className="mafraer-room-art palace-clean-lit" src={MAFRAER_MECHANISM_ASSETS.lit} alt="" aria-hidden="true" fill sizes="(max-width: 760px) 100vw, calc(100vw - 248px)" loading="eager" unoptimized />
        <div className="mafraer-room-vignette" aria-hidden="true" />
        <MafraerMechanisms lit={lighting === "lit"} paused={observing} resonance={magic && magic.kind !== "snowflake" ? magic.token : null} soundEnabled={soundEnabled} onReady={setMechanismsReady} onWhisper={setWhisper} onCrystalTap={() => cast("crystal")} />
        <button type="button" className="mafraer-object" style={objectStyle("chandelier")} onClick={toggleLight} disabled={lighting === "loading"} aria-pressed={lighting === "lit"} aria-label={lighting === "lit" ? "收回魔力，关掉冰晶吊灯" : "调动魔力，点亮巨大冰晶吊灯"}><span>{lighting === "lit" ? "收回吊灯魔力" : "以月亮魔力点灯"}</span></button>
        <button type="button" className="mafraer-object" style={objectStyle("moon")} onClick={() => cast("moon")} aria-label="触碰窗外的冰晶弯月，让星尘落进悬浮水晶球"><span>向冰晶弯月伸手</span></button>
        {!mechanismsReady && <button type="button" className="mafraer-object mafraer-crystal-object" style={objectStyle("crystal")} onClick={() => cast("crystal")} aria-label="让雪花中心上方的悬浮水晶球盛满星尘，与冰晶弯月共鸣"><span>凝聚水晶球中的星尘</span></button>}
        <button ref={telescopeRef} type="button" className="mafraer-object" style={objectStyle("telescope")} onClick={() => { setObserving(true); setWhisper("反射望远镜已对准北极星。拖动镜中的星空，寻找真正属于夜空的星辰。"); }} aria-label="使用大型牛顿式反射望远镜观测真实星表，默认对准北极星"><span>从北极星开始观星</span></button>
        <button type="button" className="mafraer-object" style={objectStyle("snowflake")} onClick={() => cast("snowflake")} aria-label="唤醒地板中央巨大雪花的冰晶星轨"><span>唤醒雪花星轨</span></button>
        {lightSpell > 0 && <svg key={`light-${lightSpell}`} className="mafraer-light-invocation" style={originStyle(CHANDELIER)} viewBox="0 0 1600 900" aria-hidden="true"><path d={`M${CRYSTAL.x} ${CRYSTAL.y} Q${CRYSTAL.x + 80} ${(CRYSTAL.y + CHANDELIER.y) / 2} ${CHANDELIER.x} ${CHANDELIER.y}`} /><circle cx={CHANDELIER.x} cy={CHANDELIER.y} r="76" /><circle cx={CHANDELIER.x} cy={CHANDELIER.y} r="95" /></svg>}
        {magic && <div key={magic.token} className={`mafraer-magic magic-${magic.kind}`} aria-hidden="true">
          {(magic.kind === "moon" || magic.kind === "crystal") && <><svg className="mafraer-moon-bridge" style={originStyle(MOON)} viewBox="0 0 1600 900"><path d={`M${CRYSTAL.x} ${CRYSTAL.y} C${CRYSTAL.x + 104} ${CRYSTAL.y - 75} ${MOON.x - 44} ${MOON.y + 153} ${MOON.x} ${MOON.y}`} /><circle cx={MOON.x} cy={MOON.y} r="40" /><circle cx={MOON.x} cy={MOON.y} r="54" /></svg><div className="mafraer-room-stardust">{DUST.slice(0, 24).map((dust, i) => <i key={i} style={{ left: `${dust.x}%`, top: `${dust.y}%`, width: dust.size, height: dust.size, animationDelay: `${dust.delay}s` }} />)}</div></>}
          {magic.kind === "snowflake" && <svg className="mafraer-floor-resonance" style={originStyle(FLOOR)} viewBox="0 0 1600 900"><ellipse cx={FLOOR.x} cy={FLOOR.y} rx="270" ry="48" /><ellipse cx={FLOOR.x} cy={FLOOR.y} rx="200" ry="36" /><path d={`M${FLOOR.x - 192} ${FLOOR.y + 10} ${FLOOR.x} ${FLOOR.y} ${FLOOR.x + 248} ${FLOOR.y + 7} M${FLOOR.x - 147} ${FLOOR.y + 38} ${FLOOR.x} ${FLOOR.y} ${FLOOR.x + 128} ${FLOOR.y + 40} M${FLOOR.x} ${FLOOR.y - 45} ${FLOOR.x} ${FLOOR.y + 45}`} /></svg>}
        </div>}
      </div>
    </div>
    {zoomed && <p className="mafraer-pan-hint">拖动画面，看看月宫的细节</p>}
    <aside className="mafraer-room-whisper"><div className="mafraer-owner-avatar">{ownerAvatar}</div><div><small>冰晶月宫 · BLUE CRYSTAL MOON</small><strong>{ownerName}</strong><p aria-live="polite">{whisper}</p></div></aside>
    {observing && <Suspense fallback={<div className="star-observatory-backdrop" onKeyDown={(event) => { if (event.key === "Escape") closeObservatory(); }}><div className="star-observatory-loading"><p role="status">正在打开观星镜…</p><button type="button" autoFocus onClick={closeObservatory}>返回房间</button></div></div>}><StarObservatory onClose={closeObservatory} /></Suspense>}
  </section>;
}
