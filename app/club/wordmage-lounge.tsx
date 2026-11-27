"use client";
import {recordExploration} from "../guide/exploration";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { MysticSigil } from "./mystic-marks";

type Spell = "words" | "field" | "atlas" | "stars";
const PRESET_SPELLS = ["愿文字轻盈如风", "让星辰为我引路", "万千知识，循声而来"];
const ATLAS_CHAPTERS = [
  { title: "风之航路", words: "风随言行，海为书页", note: "纬线间浮出一条航路。海风把它的名字送到了书页上。" },
  { title: "群星索引", words: "群星为字，夜为藏书", note: "地图翻到了星辰的一页。每一座城，都有一颗属于它的星。" },
  { title: "无名国度", words: "未见之地，待言而生", note: "地球仪记起一片还没有名字的大陆。下一句言灵，也许就是它的名字。" },
];

export function WordmageGlobePassage() {
  return <div className="wordmage-passage" role="status" aria-live="polite">
    <div className="wordmage-passage-instrument" aria-hidden="true"><MysticSigil memberId="truth" />
      <div className="wordmage-passage-letters">{"言灵万象知识风星".split("").map((letter, index) => <span key={index} style={{ "--letter-index": index } as CSSProperties}>{letter}</span>)}</div>
    </div>
    <small>THE WORDMAGE’S PASSAGE</small><p>经纬成环，言语成门。</p><span>正在进入言灵师的 Lounge…</span>
  </div>;
}

export function WordmageLounge({ onBack }: { onBack: () => void }) {
  const [bookOpen, setBookOpen] = useState(false);
  useEffect(()=>{void recordExploration("lounge:room:wordmage");},[]);
  const [incantation, setIncantation] = useState(PRESET_SPELLS[0]);
  const [effect, setEffect] = useState<{ kind: Spell; text: string; token: number } | null>(null);
  const [moonlit, setMoonlit] = useState(false);
  const [atlasChapter, setAtlasChapter] = useState(-1);
  const [whisper, setWhisper] = useState("知识安静地等着被唤醒。触碰地球仪、悬挂的磁场仪，或翻开桌上的言灵书。");
  const effectTimer = useRef<number | null>(null);
  const spellSerial = useRef(0);
  const bookRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bookTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => { if (effectTimer.current !== null) window.clearTimeout(effectTimer.current); }, []);

  useEffect(() => {
    if (!bookOpen) return;
    void recordExploration("lounge:wordmage:book");
    inputRef.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setBookOpen(false); bookTriggerRef.current?.focus(); }
      if (event.key !== "Tab") return;
      const controls = bookRef.current?.querySelectorAll<HTMLElement>("button, input");
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [bookOpen]);

  const cast = (kind: Spell, text: string, message: string) => {
    if (effectTimer.current !== null) window.clearTimeout(effectTimer.current);
    setEffect({ kind, text, token: ++spellSerial.current });
    void recordExploration("lounge:wordmage:"+kind);
    setWhisper(message);
    effectTimer.current = window.setTimeout(() => { setEffect(null); effectTimer.current = null; }, 5600);
  };

  const turnAtlas = () => {
    const next = (atlasChapter + 1) % ATLAS_CHAPTERS.length;
    setAtlasChapter(next);
    const chapter = ATLAS_CHAPTERS[next];
    cast("atlas", chapter.words, chapter.note);
  };

  const speak = (event: FormEvent) => {
    event.preventDefault();
    const text = incantation.trim();
    if (!text) return;
    setBookOpen(false);
    bookTriggerRef.current?.focus();
    cast("words", text, `你写下「${text}」。墨迹离开书页，变成轻盈的言灵，在房间里散开。`);
  };

  const closeBook = () => { setBookOpen(false); bookTriggerRef.current?.focus(); };

  return <section className={`wordmage-lounge ${moonlit ? "wordmage-moonlit" : ""}`} aria-label="Nishujiade 言灵师的私人 Lounge">
    <header className="wordmage-toolbar">
      <button type="button" onClick={onBack}>← 返回 Committee Lounge</button>
      <button type="button" aria-pressed={moonlit} onClick={() => { setMoonlit((value) => !value); void recordExploration("lounge:wordmage:light"); setWhisper(moonlit ? "烛光回到了书页上，言灵重新染上古金色。" : "只留下月光。淡紫色的影子在书页间流动。"); }}>{moonlit ? "留烛光" : "留月光"}</button>
    </header>
    <div className="wordmage-room-title"><MysticSigil memberId="truth" /><div><small>PRIVATE LOUNGE · ROOM NO. 03</small><h1>NISHUJIADE’S <em>LOUNGE</em></h1><p>言灵师 · 千言藏书阁</p></div></div>
    <div className="wordmage-room-stage">
      <Image className="wordmage-room-art" src="/nishujiade-private-lounge-v1.png" alt="言灵师的欧洲古典藏书阁，象牙色雕花、淡紫丝绒、月夜拱窗、古金地球仪、悬挂磁场仪与打开的言灵书" fill sizes="(max-width: 760px) 100vw, calc(100vw - 248px)" priority unoptimized />
      <div className="wordmage-room-shade" aria-hidden="true" />
      <button type="button" className="wordmage-object wordmage-atlas" onClick={turnAtlas} aria-label="转动地球仪，唤出一页隐秘航路"><span>转动地球仪</span></button>
      <button type="button" className="wordmage-object wordmage-armillary" onClick={() => cast("field", "万千知识循声而来", "磁场仪回应了你的声音。散落的文字沿着弧线升起，在珍珠核心周围聚拢。")} aria-label="触碰悬挂的磁场仪，牵引书页上的文字"><span>唤醒磁场</span></button>
      <button ref={bookTriggerRef} type="button" className="wordmage-object wordmage-grimoire" onClick={() => setBookOpen(true)} aria-label="翻开桌上的言灵书，写下自己的咒语"><span>翻开言灵书</span></button>
      <button type="button" className="wordmage-object wordmage-window" onClick={() => cast("stars", "以星为字以夜为笺", "窗上的群星连成一段短暂的星图，云后的夜空像翻开了一页新书。")} aria-label="触碰右侧拱窗，让群星连成星图"><span>让星辰引路</span></button>
      {effect && <div key={effect.token} className={`wordmage-incantation spell-${effect.kind}`} aria-hidden="true">
        {Array.from(effect.text).filter((glyph) => glyph.trim()).slice(0, 24).map((glyph, index) => <span key={index} style={{ "--glyph-index": index, "--glyph-x": `${((index * 7) % 13 - 6) * 1.5}cqw`, "--glyph-y": `${-8 - (index * 3) % 16}cqw`, "--glyph-delay": `${index * .055}s` } as CSSProperties}>{glyph}</span>)}
      </div>}
      {effect?.kind === "field" && <div key={`field-${effect.token}`} className="wordmage-field-answer" aria-hidden="true"><i /><i /><i /></div>}
      {effect?.kind === "stars" && <svg key={`stars-${effect.token}`} className="wordmage-star-map" viewBox="0 0 280 340" aria-hidden="true"><path d="M40 215 88 128 149 174 199 72 234 140 149 174 191 267 105 286 40 215" />{[[40,215],[88,128],[149,174],[199,72],[234,140],[191,267],[105,286]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r={i === 2 ? 3 : 2} />)}</svg>}
      {effect?.kind === "atlas" && <div className="wordmage-atlas-caption" key={`atlas-${effect.token}`} aria-hidden="true"><small>ATLAS OF UNWRITTEN PLACES</small><strong>{ATLAS_CHAPTERS[atlasChapter]?.title}</strong></div>}
    </div>
    <aside className="wordmage-whisper" aria-live="polite"><small>THE LIBRARY LISTENS</small><p>{whisper}</p></aside>
    {bookOpen && <div className="wordmage-book-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeBook(); }}>
      <div ref={bookRef} className="wordmage-spellbook" role="dialog" aria-modal="true" aria-labelledby="wordmage-book-title">
        <header><small>THE WORDMAGE’S GRIMOIRE</small><button type="button" onClick={closeBook} aria-label="合上言灵书">×</button></header>
        <h2 id="wordmage-book-title">让一句话，成为术法。</h2><p>在书页上写下你的言灵，文字会离开纸面，随风散开。</p>
        <form onSubmit={speak}><label htmlFor="wordmage-incantation-input">你的言灵</label><input ref={inputRef} id="wordmage-incantation-input" value={incantation} maxLength={24} onChange={(event) => setIncantation(event.target.value)} placeholder="写一句轻盈的咒语…" /><div className="wordmage-preset-spells">{PRESET_SPELLS.map((text) => <button type="button" key={text} onClick={() => setIncantation(text)}>{text}</button>)}</div><button className="wordmage-cast-button" type="submit" disabled={!incantation.trim()}>唤出言灵</button></form>
      </div>
    </div>}
  </section>;
}
