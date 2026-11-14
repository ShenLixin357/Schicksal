"use client";

import Image from "next/image";
import { CelloCorner } from "./cello/cello-corner";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MiniGameSystem, useMiniGameSystem } from "./minigames/mini-game-system";
import type { EmblemBlade, MiniGameId } from "./minigames/mini-game-types";

const ROOM_STORAGE_KEY = "committee:chryser:study:v1";
const MECHANISMS = [
  { id: "hearth", name: "翡翠壁炉", note: "拨动炉栏，让阴燃的余烬骤然苏醒。" },
  { id: "sigil", name: "炉楣宝石", note: "转动翡翠嵌饰，展开导光刻盘。" },
  { id: "music", name: "翡翠音乐匣", note: "书桌上的音乐匣保存着余烬的旋律。" },
  { id: "window", name: "拱窗夜雨", note: "触碰窗玻璃，在星夜和细雨之间切换。" },
  { id: "decanter", name: "草木酒壶", note: "轻触圆桌上的绿瓶，释放一种草木香气。" },
  { id: "clock", name: "炉台座钟", note: "拨动座钟，让四枚音符在石墙间回响。" },
  { id: "books", name: "藏书密笺", note: "拉动书脊，翻开这本书房札记。" },
  { id: "chair", name: "翡翠扶手椅", note: "坐进丝绒椅子，暂时只留壁炉的呼吸。" },
] as const;
type MechanismId = typeof MECHANISMS[number]["id"];
type RoomMemory = { rain: boolean; moonlit: boolean; discovered: MechanismId[] };
const SCENTS = ["雪松与苔藓", "迷迭香与月桂", "佛手柑与白茶"];

function readRoomMemory(): RoomMemory {
  const fallback: RoomMemory = { rain: false, moonlit: false, discovered: [] };
  if (typeof window === "undefined") return fallback;
  try {
    const value = JSON.parse(window.localStorage.getItem(ROOM_STORAGE_KEY) || "null") as Partial<RoomMemory> | null;
    if (!value) return fallback;
    return { rain: Boolean(value.rain), moonlit: Boolean(value.moonlit), discovered: Array.isArray(value.discovered) ? [...new Set(value.discovered.filter((id) => MECHANISMS.some((item) => item.id === id)))] : [] };
  } catch { return fallback; }
}

export function ChryserLounge({ onBack, emblemBlades, citizenId }: { onBack: () => void; emblemBlades: readonly EmblemBlade[]; citizenId: string }) {
  const [memory, setMemory] = useState(readRoomMemory);
  const [journalOpen, setJournalOpen] = useState(false);
  const [seated, setSeated] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [effect, setEffect] = useState<{ kind: "hearth" | "decanter" | "clock"; token: number } | null>(null);
  const [whisper, setWhisper] = useState("书房安静得恰好。炉楣的翡翠、书桌的音乐匣和窗玻璃，都可以轻轻碰一碰。");
  const scentRef = useRef(0);
  const effectTimerRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const journalCloseRef = useRef<HTMLButtonElement>(null);
  const miniGames = useMiniGameSystem();

  useEffect(() => {
    try { window.localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(memory)); } catch { /* The room still works when device storage is unavailable. */ }
  }, [memory]);

  useEffect(() => {
    if (journalOpen) journalCloseRef.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setJournalOpen(false); setSeated(false); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [journalOpen]);

  useEffect(() => () => {
    if (effectTimerRef.current !== null) window.clearTimeout(effectTimerRef.current);
    if (audioRef.current) void audioRef.current.close();
  }, []);

  const discover = (id: MechanismId) => setMemory((current) => current.discovered.includes(id) ? current : { ...current, discovered: [...current.discovered, id] });

  const chime = (melody: readonly number[], low = false) => {
    if (!soundEnabled) return;
    const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const context = audioRef.current ?? new Context();
    audioRef.current = context;
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    melody.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = low ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001, now + index * .18);
      gain.gain.exponentialRampToValueAtTime(.035, now + index * .18 + .02);
      gain.gain.exponentialRampToValueAtTime(.0001, now + index * .18 + .8);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + index * .18);
      oscillator.stop(now + index * .18 + .85);
    });
  };

  const answerWith = (kind: "hearth" | "decanter" | "clock") => {
    if (effectTimerRef.current !== null) window.clearTimeout(effectTimerRef.current);
    setEffect({ kind, token: Date.now() });
    effectTimerRef.current = window.setTimeout(() => setEffect(null), kind === "hearth" ? 4500 : 3500);
  };

  const launch = (id: MiniGameId) => {
    discover(id === "jade-sigils" ? "sigil" : "music");
    setJournalOpen(false);
    miniGames.launchMiniGame(id);
  };

  const activate = (id: MechanismId) => {
    discover(id);
    if (id !== "books") setJournalOpen(false);
    if (id === "sigil") return launch("jade-sigils");
    if (id === "music") return launch("ember-echo");
    if (id === "hearth") {
      answerWith("hearth");
      chime([146.83, 220, 293.66], true);
      setWhisper("一粒翡翠余烬骤然燃起，绿色火舌卷过炉栏。暖意沿着石壁慢慢散开。");
    } else if (id === "window") {
      setMemory((current) => ({ ...current, rain: !current.rain }));
      setWhisper(memory.rain ? "雨滴退回夜色，拱窗外重新露出安静的星空。" : "窗外下起细雨。雨丝顺着玻璃滑落，书房依旧温暖。");
    } else if (id === "decanter") {
      const scent = SCENTS[scentRef.current++ % SCENTS.length];
      answerWith("decanter");
      chime([369.99, 493.88]);
      setWhisper(`瓶塞轻轻松开，一缕 ${scent} 的魔法香雾从壶口升起。`);
    } else if (id === "clock") {
      answerWith("clock");
      chime([293.66, 369.99, 440, 587.33]);
      setWhisper("座钟没有报时，只奏出四枚音符。音乐匣似乎记住了这段旋律。");
    } else if (id === "books") {
      setJournalOpen(true);
      chime([392, 523.25]);
      setWhisper("一本旧书往外退了半寸，露出 Lord Chryser 留下的书房札记。");
    } else if (id === "chair") {
      setSeated((current) => !current);
      setWhisper(seated ? "你离开了扶手椅，烛光再次照亮整间书房。" : "你坐进翡翠丝绒里。四周暗下一点，壁炉的呼吸变得清晰。");
    }
  };

  if (miniGames.activeGame) return <MiniGameSystem citizenId={citizenId} gameId={miniGames.activeGame} emblemBlades={emblemBlades} onClose={miniGames.closeMiniGame} loungeTitle="Lord Chryser’s Lounge" />;

  return <section className={`chryser-lounge ${memory.rain ? "night-rain" : "star-night"} ${memory.moonlit ? "moonlit-study" : "candlelit-study"} ${seated ? "seated" : ""} ${effect ? `answer-${effect.kind}` : ""}`} aria-label="Lord Chryser the Jade Ember 的私人 Lounge">
    <header className="chryser-lounge-toolbar">
      <button type="button" onClick={onBack}>返回 Committee Lounge</button>
      <div className="chryser-toolbar-actions"><button type="button" aria-pressed={memory.moonlit} onClick={() => { setMemory((current) => ({ ...current, moonlit: !current.moonlit })); setWhisper(memory.moonlit ? "古金色烛光重新铺开。" : "月色落在翡翠丝绒上，夜雨也显得更轻了。"); }}>{memory.moonlit ? "留烛光" : "留月光"}</button><button type="button" aria-pressed={soundEnabled} onClick={() => setSoundEnabled((current) => !current)}>{soundEnabled ? "声音开" : "声音关"}</button><button type="button" className="chryser-journal-button" onClick={() => { setJournalOpen((current) => !current); discover("books"); }}>书房札记 <small>{memory.discovered.length}/{MECHANISMS.length}</small></button></div>
    </header>
    <div className="chryser-lounge-stage">
      <Image className="chryser-lounge-art" src="/chryser-private-lounge.png" alt="暗翡翠与古金色的欧洲古典私人 Lounge：壁炉、炉台座钟、翡翠扶手椅、书桌与拱窗" fill sizes="(max-width: 760px) 100vw, calc(100vw - 248px)" priority unoptimized />
      <div className="chryser-lounge-shade" aria-hidden="true" />
      <CelloCorner citizenId={citizenId} soundEnabled={soundEnabled} />
      <div className="chryser-lounge-title"><small>PRIVATE LOUNGE · ROOM NO. 02</small><h1>LORD CHRYSER’S <em>LOUNGE</em></h1><p>The Jade Ember · 翡翠余烬</p></div>
      <div className="chryser-rain-window" aria-hidden="true">{Array.from({ length: 26 }, (_, index) => <i key={index} style={{ "--rain-index": index, left: `${(index * 37) % 100}%`, animationDelay: `${-index * .29}s`, animationDuration: `${1.6 + index % 5 * .25}s` } as CSSProperties} />)}</div>
      <div className="chryser-window-mist" aria-hidden="true" />
      {effect?.kind === "hearth" && <div className="chryser-hearth-answer" key={effect.token} aria-hidden="true"><Image src="/jade-ember-flame-v2.png" width={1437} height={1095} alt="" unoptimized /><div className="chryser-ember-drift">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--ember-index": index } as CSSProperties} />)}</div></div>}
      {effect?.kind === "decanter" && <div className="chryser-botanical-mist" key={effect.token} aria-hidden="true"><i /><i /><i /></div>}
      {effect?.kind === "clock" && <div className="chryser-clock-answer" key={effect.token} aria-hidden="true"><i /><i /></div>}
      <button className="chryser-object chryser-hearth" type="button" onClick={() => activate("hearth")} aria-label="拨动翡翠壁炉的炉栏，唤醒余烬"><span>拨动炉栏</span></button>
      <button className="chryser-object chryser-mantel-sigil" type="button" onClick={() => activate("sigil")} aria-label="旋转炉楣上的翡翠宝石，打开翡翠导光阵"><span>转动炉楣翡翠</span></button>
      <button className="chryser-object chryser-mantel-clock" type="button" onClick={() => activate("clock")} aria-label="拨动炉台座钟，聆听四枚音符"><span>拨动座钟</span></button>
      <button className="chryser-object chryser-bookcase" type="button" onClick={() => activate("books")} aria-label="拉动书架上的旧书，查看藏书密笺"><span>拉动旧书书脊</span></button>
      <button className="chryser-object chryser-decanter" type="button" onClick={() => activate("decanter")} aria-label="开启圆桌上的草木酒壶，释放魔法香雾"><span>轻触草木酒壶</span></button>
      <button className="chryser-object chryser-window" type="button" onClick={() => activate("window")} aria-pressed={memory.rain} aria-label="触碰拱窗，在夜雨与星空之间切换"><span>{memory.rain ? "让雨停下" : "唤来夜雨"}</span></button>
      <button className="chryser-object chryser-armchair" type="button" onClick={() => activate("chair")} aria-pressed={seated} aria-label={seated ? "离开翡翠扶手椅" : "坐进翡翠扶手椅"}><span>{seated ? "离开扶手椅" : "坐进丝绒里"}</span></button>
      <a className="chryser-aquarium" href="/games/aquarium" aria-label="进入透明大鱼缸，打开怪怪水族馆" title="怪怪水族馆 · Insaniquarium Deluxe">
        <span className="chryser-aquarium-water" aria-hidden="true"><i /><i /><i /><b /><b /><b /></span>
        <span className="chryser-aquarium-caption">怪怪水族馆 <small>INSANIQUARIUM DELUXE</small></span>
      </a>
      <button className="chryser-music-box" type="button" onClick={() => activate("music")} aria-label="打开书桌上的翡翠音乐匣，游玩余烬回声"><Image src="/chryser-emerald-music-box.png" width={1536} height={1024} alt="古金与翡翠镶嵌的洛可可音乐匣" unoptimized /><span>打开翡翠音乐匣</span></button>
    </div>
    <footer className="chryser-whisper" aria-live="polite"><small>LORD CHRYSER’S STUDY</small><p>{whisper}</p></footer>
    {journalOpen && <aside className="chryser-journal" aria-label="Lord Chryser 的书房札记">
      <header><div><small>A NOTE IN THE MARGIN</small><h2>书房札记</h2></div><button type="button" ref={journalCloseRef} onClick={() => setJournalOpen(false)} aria-label="合上札记">×</button></header>
      <p className="chryser-journal-quote">“余烬记得火焰遗忘的事。”</p>
      <div className="chryser-journal-games"><button type="button" onClick={() => launch("jade-sigils")}><strong>翡翠导光阵</strong><span>转动刻盘，接通整幅余烬纹路</span></button><button type="button" onClick={() => launch("ember-echo")}><strong>余烬回声</strong><span>聆听音乐匣，复奏越来越长的旋律</span></button></div>
      <h3>书房里的八个小秘密</h3><ul>{MECHANISMS.map((mechanism) => <li key={mechanism.id} className={memory.discovered.includes(mechanism.id) ? "found" : ""}><button type="button" onClick={() => activate(mechanism.id)}><strong>{mechanism.name}</strong><span>{mechanism.note}</span><small>{memory.discovered.includes(mechanism.id) ? "已发现" : "尚未触碰"}</small></button></li>)}</ul>
      {memory.discovered.length === MECHANISMS.length && <p className="chryser-journal-secret">八个机关都已回应你。今晚，这间书房不再有陌生角落。</p>}
      <footer>机关发现与游戏进度保存在当前设备。</footer>
    </aside>}
  </section>;
}

