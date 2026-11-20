"use client";

import Image from "next/image";
import { BriefingDesk, BriefingOverlay } from "./briefing/briefing";
import type { BriefingTarget } from "./briefing/briefing-data";
import { useBriefingFeed } from "./briefing/use-briefing-feed";
import { fetchBriefingFeed, type BriefingFeed } from "./briefing/briefing-loader";
import { readyForMandatoryBriefing, mayMountSiteAfterBriefing, type MandatoryBriefingPreload } from "./briefing/mandatory-entry";
import { useMemberPresence } from "./briefing/use-member-presence";
import { CITIZENS, AMBERINA_OFFICIAL_COLOR, citizenRepresentativeColor, hasLeaderInsignia, type Citizen } from "./citizens";
import { MemberAccessSettings } from "./member-access-settings";
import { SchicksalAtlas } from "./atlas/schicksal-atlas";
import { AtlasGovernmentHandbook } from "./atlas/government-handbook";
import { atlasOfficesForCitizen, atlasName, atlasCodename } from "./atlas/atlas-data";

import { lazy, useCallback, useEffect, useRef, useState, type CSSProperties, type Dispatch, type DragEvent, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { ArticulatedFan, LaceFanDrawing } from "./club/articulated-fan";
import { FAN_CYCLE_MS } from "./club/fan-motion";
import { MysticSigil } from "./club/mystic-marks";
import { LoungeTable, LoungeTeaRitual } from "./club/tea-ritual";
import { ChryserLounge } from "./club/chryser-lounge";
import { WordmageGlobePassage, WordmageLounge } from "./club/wordmage-lounge";
import { MafraerLounge, MAFRAER_ROOM_ASSETS } from "./club/mafraer-lounge";
import { GameRoom } from "./club/game-room";
import { GAME_ROOM_RETURN_KEY } from "./club/game-room-catalogue";
import { chatDate, chatTimestamp, mergeChatMessages, type ChatCursor } from "./club/chat-history";
import { MagicChatScroll, MusicBoxDrawing, MusicBoxPortal, RotatingWordmageGlobe, startMusicBoxTune } from "./club/lounge-props";
import { MiniGameSystem, useMiniGameSystem } from "./club/minigames/mini-game-system";
import { LoungeLeaderboard } from "./club/minigames/lounge-leaderboard";
import { VaseExperience } from "./club/vase/vase-experience";
import { getVase } from "./club/vase/vase-catalogue";
import { EMBLEM_BLADES } from "./emblem/blade-spec";
import { HomeSection } from "./home/home-section";
import { FeatureSuspense } from "./shell/feature-suspense";
// Parliament UI and state remain isolated from the global entry coordinator.
const PersistentParliamentSection = lazy(() => import("./parliament/parliament-section").then(module => ({ default: module.PersistentParliamentSection })));
import { ImperialSidebar } from "./shell/imperial-sidebar";
import { ShellPlaceholder } from "./shell/placeholder";
import { PageHead } from "./shell/page-head";
import { HonorsPage, MarketPage } from "./points/points-pages";
import { CalendarPage } from "./festivals/festival-page";
import { SelfProfilePage } from "./profile/profile-page";

import { LoungePassage, type LoungePassageDirection } from "./transitions/lounge-passage";
import type { SidebarDestination, SiteSection } from "./shell/navigation";

// Only import these data-heavy sections when the user navigates to them.
const PhotoArchiveSection = lazy(() => import("./photos/photo-archive").then(module => ({ default: module.PhotoArchiveSection })));
const ArchivesSection = lazy(() => import("./archives/archive-section").then(module => ({ default: module.ArchivesSection })));

type Phase = "opening" | "login" | "welcome" | "system";
type Section = SiteSection;

type ClubProfile = { citizenId: string; maskName: string; avatar: string; updatedAt: string };
type ClubMessage = { id: string; citizenId: string; body: string; sticker: string; createdAt: string };
type ClubRoom = { id: string; vaseSelection: string; updatedByCitizenId: string; updatedAt: string };
type LoungeSeat = { seatIndex: number; citizenId: string; seatedAt: string };
type ClubData = { profiles?: ClubProfile[]; messages?: ClubMessage[]; nextCursor?: ChatCursor | null; room?: ClubRoom; seats?: LoungeSeat[]; error?: string };



const CLUB_MEMBER_IDS = new Set(["amberina", "zxy", "truth"]);
const CLUB_MEMBERS = CITIZENS.filter((citizen) => CLUB_MEMBER_IDS.has(citizen.id));
const LOUNGE_IDENTITIES: Record<string, { spoken: string; mask: string }> = {
  amberina: { spoken: "Lady Mafraer the Witch", mask: "玛法女巫" },
  zxy: { spoken: "Lord Chryser, the Jade Ember", mask: "Lord Chryser" },
  truth: { spoken: "Nishujiade, the Truth-Teller", mask: "Nishujiade" },
};

function loungeMaskName(citizen: Citizen, profile?: ClubProfile) {
  return profile?.maskName || LOUNGE_IDENTITIES[citizen.id]?.mask || citizen.username;
}

function playLoungeChime() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const now = context.currentTime;
  [659.25, 987.77, 1318.51].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index === 1 ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now + index * .105);
    gain.gain.linearRampToValueAtTime(.045, now + index * .105 + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, now + index * .105 + .22);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now + index * .105);
    oscillator.stop(now + index * .105 + .24);
  });
  window.setTimeout(() => void context.close(), 900);
}

function announceCommitteeLounge(citizen: Citizen, onComplete: () => void) {
  playLoungeChime();
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    onComplete();
    return;
  }
  const synthesis = window.speechSynthesis;
  synthesis.cancel();
  const title = LOUNGE_IDENTITIES[citizen.id]?.spoken || citizen.name;
  const utterance = new SpeechSynthesisUtterance(`Welcome to Committee Lounge, esteemed member ${title}.`);
  utterance.lang = "en-US";
  utterance.rate = .84;
  utterance.pitch = 1.06;
  utterance.volume = .94;
  const voices = synthesis.getVoices();
  const preferredNames = ["Microsoft Aria", "Microsoft Zira", "Ava", "Samantha", "Serena", "Victoria", "Google UK English Female", "Moira"];
  utterance.voice = preferredNames.map((name) => voices.find((voice) => voice.name.includes(name))).find(Boolean)
    ?? voices.find((voice) => /^en/i.test(voice.lang) && /female|woman/i.test(voice.name))
    ?? voices.find((voice) => /^en/i.test(voice.lang))
    ?? null;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onComplete();
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  synthesis.speak(utterance);
  window.setTimeout(finish, 9000);
}
const CLUB_AVATARS = [
  { id: "sigil", icon: "✦", label: "Lounge 形态" },
  { id: "crystal_ball", icon: "🔮", label: "水晶球" },
  { id: "witch_hat", icon: "🧙‍♀️", label: "魔法女巫" },
  { id: "pumpkin", icon: "🎃", label: "南瓜面具" },
  { id: "black_cat", icon: "🐈‍⬛", label: "黑猫" },
  { id: "crescent", icon: "🌙", label: "新月" },
];
const CLUB_STICKERS = [
  { id: "ghost", icon: "👻", label: "幽灵" },
  { id: "sparkles", icon: "✨", label: "星尘" },
  { id: "pumpkin", icon: "🎃", label: "南瓜" },
  { id: "crystal", icon: "🔮", label: "水晶球" },
  { id: "bat", icon: "🦇", label: "蝙蝠" },
  { id: "candy", icon: "🍬", label: "糖果" },
  { id: "moon", icon: "🌙", label: "月亮" },
];



const PARTICLES = [[8,18,1],[17,72,2],[25,34,3],[35,84,1],[43,10,2],[54,68,3],[62,28,1],[71,88,2],[79,44,3],[88,14,2],[92,76,1],[12,48,3]];

function Emblem({ compact = false, highlight, revealed = 8, ceremonial = false }: { compact?: boolean; highlight?: number; revealed?: number; ceremonial?: boolean }) {
  return (
    <div className={`emblem ${compact ? "compact" : ""} ${ceremonial ? "ceremonial" : ""} ${revealed >= 8 ? "complete" : ""}`} role="img" aria-label="天命第一帝国八棱主标志，正式名称待定">
      <span className="emblem-orbit" />
      {EMBLEM_BLADES.map((blade) => (
        <span className={`emblem-ray ${blade.index === highlight ? "lit" : ""} ${blade.index < revealed ? "visible" : ""}`} key={blade.citizenId} style={{ "--ray": blade.index, "--ray-color": blade.color, "--open-delay": `${blade.index * .035}s` } as CSSProperties}><i /></span>
      ))}
      <span className="emblem-core" />
    </div>
  );
}

function CitizenMark({ citizen, display = "web" }: { citizen: Citizen; display?: "web" | "official" }) {
  const leaderClass = hasLeaderInsignia(citizen) ? " leader" : "";
  // Beige-page Simple uses the approved emphasized gold; official in parliament
  // and on other non-ivory surfaces. This colour NEVER flows into score/other UI.
  // Original circles and President-only points inherit the exact same --mark hue.
  const markColor = display === "official" && citizen.id === "amberina" ? AMBERINA_OFFICIAL_COLOR : citizen.markColor;
  if (citizen.id === "amberina") {
    return <span className={`citizen-mark personal-simple${leaderClass}`} style={{ "--mark": markColor } as CSSProperties} aria-hidden="true">
      <Image src={display === "official" ? "/amberina-personal-simple-official.png" : "/amberina-personal-simple-gold-eecf58.png"} alt="" width={800} height={800} unoptimized className="citizen-simple-image" />
    </span>;
  }
  let sigil: ReactNode;
  switch (citizen.motif) {
    case "flame":
      sigil = <><path d="M35.5 7.5c2.1 11.3-6.6 13.8-5.4 23.1 4.1-2.2 6.8-6 7.5-10.6 7.4 6.5 12 13 11.1 21.5-.9 8.8-7.8 15.4-16.8 15.4-9.6 0-17.1-7-16.7-16.4.3-7 4.6-13.7 12.2-20.2-.4 5.4 1.1 8.7 3.6 10.7-1-9.7 6.3-13.4 4.5-23.5Z" /><path d="M32 51c-5.1 0-8.6-3.8-8.2-8.4.3-3.7 2.5-6.8 6.1-10.2-.1 4.3 1.8 6.3 4 8.1 1.4-2.4 2.1-4.9 1.9-7.7 3.4 3.3 5 6.5 4.5 10.1-.6 4.6-3.6 8.1-8.3 8.1Z" /></>;
      break;
    case "lightning":
      sigil = <><path className="sigil-fill" d="M37.6 5 15 35.4h14.3L25.9 59 49 26.2H34.7L37.6 5Z" /><path d="M41.7 9.5 24.6 31h10.5l-2 14.8 13.5-17.1H38l3.7-19.2Z" /></>;
      break;
    case "water":
      sigil = <><path d="M32 7C24.4 17.6 15.8 27.3 15.8 38.6c0 9.1 7.2 16.4 16.2 16.4s16.2-7.3 16.2-16.4C48.2 27.3 39.6 17.6 32 7Z" /><path d="M20.5 39.5c3.4 3.5 7.1 3.5 11 0s7.6-3.5 12 0M23 47c2.9 2.4 5.9 2.4 9 0s6.1-2.4 9 0" /></>;
      break;
    case "wind":
      sigil = <><path d="M9 23h30c7.8 0 8.5-10.5 1-11.8-4.1-.7-6.5 1.8-7.1 4.8M9 32h39c8.4 0 8.5 12.2-.1 12.2-4.1 0-6.5-2.7-6.5-5.5M9 41h22c6.9 0 7 10 .2 10-3.2 0-5.2-1.9-5.8-4" /></>;
      break;
    default:
      sigil = <><path d="M18 18h28v28H18z" /><path d="m18 18 28 28m0-28L18 46" /></>;
  }
  return <span className={`citizen-mark ${citizen.motif}${leaderClass}`} style={{ "--mark": markColor } as CSSProperties} aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{sigil}</svg></span>;
}

function Opening({ done }: { done: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    const rayTimers = Array.from({ length: 8 }, (_, index) => window.setTimeout(() => setRevealed(index + 1), 360 + index * 245));
    const openTimer = window.setTimeout(() => setLeaving(true), 4300);
    const doneTimer = window.setTimeout(done, 5200);
    return () => { rayTimers.forEach(window.clearTimeout); window.clearTimeout(openTimer); window.clearTimeout(doneTimer); };
  }, [done]);
  return (
    <main className={`opening ${leaving ? "opening-exit" : ""}`}>
      <div className="stars" aria-hidden="true">{PARTICLES.map(([left,top,size], index) => <i key={index} style={{ left: `${left}%`, top: `${top}%`, width: `${size}px`, height: `${size}px`, animationDelay: `${index * .11}s` }} />)}</div>
      <div className="horizon" aria-hidden="true" />
      <section className="opening-content">
        <p className="kicker">EIGHT CITIZENS · ONE SHARED EMBLEM</p>
        <div className="emblem-reveal"><Emblem ceremonial revealed={revealed} /></div>
        <div className="title-reveal">
          <p>THE FIRST EMPIRE</p><h1>Schicksal</h1><div className="title-rule"><i /></div><h2>天命第一帝国</h2><small>EIGHT COLOURED RAYS · 八棱共同标志</small>
        </div>
      </section>
      <button className="skip" type="button" onClick={done}>SKIP INTRO <span>→</span></button>
      <div className="intro-progress"><i /></div>
    </main>
  );
}

function Login({ enter, replay }: { enter: (citizen: Citizen) => void; replay: () => void }) {
  const [selectedId, setSelectedId] = useState("amberina");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const selected = CITIZENS.find((item) => item.id === selectedId)!;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loggingIn) return;
    setLoggingIn(true); setError("");
    try {
      const response = await fetch("/api/member-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ citizenId: selected.id, password }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "登录暂时未能完成。");
      setPassword(""); enter(selected);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "暂时无法连接登录服务。"); }
    finally { setLoggingIn(false); }
  };
  return (
    <main className="login">
      <div className="login-ghost" aria-hidden="true">S</div>
      <header className="entry-header"><div className="brand"><Emblem compact /><Wordmark /></div><button type="button" onClick={replay}>REPLAY OPENING</button></header>
      <section className="login-shell">
        <div className="login-copy">
          <p className="eyebrow">Citizen Access · 公民通道</p>
          <h1>Enter the<br /><em>Empire.</em></h1>
          <p>选择用户名，输入密码，通过天命第一帝国内部系统的认证关口。</p>
          <div className="secure-seal"><span>01</span><small>FIRST SCHICKSAL EMPIRE<br />SECURE INTERNAL GATE</small></div>
        </div>
        <div className="login-panel">
          <div className="panel-head"><div><span>STEP 01</span><h2>选择身份</h2></div><small>05 / 08 IDENTIFIED</small></div>
          <div className="identity-grid">
            {CITIZENS.map((item) => (
              <button type="button" disabled={item.locked} key={item.id} onClick={() => { setSelectedId(item.id); setError(""); }} className={`${selectedId === item.id ? "selected" : ""} ${item.locked ? "locked" : ""}`} style={{ "--citizen": citizenRepresentativeColor(item) } as CSSProperties}>
                <CitizenMark citizen={item} /><span><strong>{item.username}</strong><small>{item.locked ? "RECORD SEALED" : item.name}</small></span><i />
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="access-form">
            <div className="panel-head access-head"><div><span>STEP 02 · {selected.username}</span><h2>输入登录密码</h2></div><small>RECOGNISED AS<br />{selected.name}</small></div>
            <label><span>Password · 密码</span><div><input type={show ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="输入密码" aria-invalid={Boolean(error)} /><button type="button" onClick={() => setShow(!show)}>{show ? "HIDE" : "SHOW"}</button></div></label>
            <footer><p className={error ? "error" : ""} role="status">{error || `正在以 ${selected.username} 的身份登录`}</p><button className="primary" type="submit" disabled={loggingIn}>{loggingIn ? "正在登录…" : "LOGIN"} <span>→</span></button></footer>
          </form>
        </div>
      </section>
      <footer className="entry-footer"><span>EST. FIRST EMPIRE</span><i /><span>RESTORED 15·08·2026</span></footer>
    </main>
  );
}

type PreloadStatus = "loading" | "ready" | "error";
function Welcome({ citizen, enter, preloadStatus, retry }: {
  citizen: Citizen;
  enter: () => void;
  preloadStatus: PreloadStatus;
  retry: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setIntroFinished(true), 3900);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!introFinished || preloadStatus !== "ready") return;
    // Do not fade the welcome screen until the latest briefing is ready.
    const fadeTimer = window.setTimeout(() => setLeaving(true), 0);
    const enterTimer = window.setTimeout(enter, 800);
    return () => { window.clearTimeout(fadeTimer); window.clearTimeout(enterTimer); };
  }, [introFinished, preloadStatus, enter]);
  return (
    <main className={`welcome ${leaving ? "leaving" : ""}`} style={{ "--citizen": citizenRepresentativeColor(citizen), "--identity-mark": citizen.markColor } as CSSProperties}>
      <div className="welcome-rings" aria-hidden="true"><i /><i /><i /></div>
      <section>
        <p className="eyebrow">Identity Confirmed · 身份已确认</p>
        <div className="welcome-mark"><CitizenMark citizen={citizen} /><i /></div>
        <small>WELCOME TO SCHICKSAL</small><h1>{citizen.name}</h1>
        <div className="welcome-meta"><span>{citizen.office}</span><i /><span>CODE NAME · {citizen.codename}</span></div>
        <p>Your citizen identity has been recognised by the Imperial System.<br />帝国系统已识别你的公民身份。</p>
        <button type="button" onClick={enter} disabled={preloadStatus !== "ready"}>{preloadStatus === "ready" ? "ENTER NOW" : "PREPARING BRIEFING…"} <span>→</span></button>
        {preloadStatus === "loading" && <div className="welcome-preload-status" role="status">正在准备最新政务与简报…</div>}
        {preloadStatus === "error" && <div className="welcome-preload-status" role="alert">
          简报尚未准备好。同步成功并查看简报后，才能进入帝国。
          <div className="welcome-preload-actions"><button type="button" onClick={retry}>重新同步简报</button></div>
        </div>}
      </section>
      <footer>CURRENT OFFICE <strong>{citizen.office.toUpperCase()}</strong></footer>
      <div className="welcome-progress" aria-hidden="true"><i /></div>
    </main>
  );
}

function CitizenEmblem({ large = false }: { large?: boolean }) {
  return (
    <div className={`radial-emblem ${large ? "large" : ""}`} role="img" aria-label="八个彩色棱分别象征八位公民">
      <span className="emblem-ring outer" /><span className="emblem-ring inner" />
      {EMBLEM_BLADES.map((blade) => <span className={`emblem-slot ${blade.index === 0 ? "leader" : ""}`} key={blade.citizenId} style={{ "--slot": blade.index, "--citizen": blade.color } as CSSProperties}><i /><b>{blade.index + 1}</b></span>)}
      <span className="emblem-center">S</span>
    </div>
  );
}



function CitizensSection({ focusedId, onClearFocus }: { focusedId?: string | null; onClearFocus?: () => void }) {
  const focused = focusedId ? CITIZENS.find(member => member.id === focusedId && !member.locked) : undefined;
  return <><PageHead eyebrow="Citizen Registry" title="公民名册" copy="八个彩色棱分别象征八位公民；八棱共同构成帝国的共同主标志。" />
    {focused && <article className="public-citizen-focus" style={{ "--citizen": citizenRepresentativeColor(focused) } as CSSProperties} aria-label={focused.username + "的公开公民档案"}>
      <CitizenMark citizen={focused}/>
      <div><small>PUBLIC CITIZEN RECORD · 公民公开资料</small><strong>{focused.name}</strong><span>{focused.username} · {focused.office}</span></div>
      <button type="button" onClick={onClearFocus} aria-label="返回完整公民名册">×</button>
    </article>}<div className="registry">{CITIZENS.map((citizen,index) => <article key={citizen.id} className={citizen.locked ? "sealed" : ""} style={{ "--citizen": citizenRepresentativeColor(citizen) } as CSSProperties}><b>0{index + 1}</b><CitizenMark citizen={citizen} /><div><small>{citizen.office}</small><h2>{citizen.name}</h2><p>{citizen.codename}</p></div></article>)}</div><p className="note">八个棱在视觉原型中均有独立颜色；其余身份、年龄顺序及最终代表色仍待八位公民正式确认。</p></>;
}

function EmblemSection() {
  return <><PageHead eyebrow="Shared Imperial Emblem" title="帝国八棱主标志" copy="标志由八个具有独立颜色的棱组成，每一棱象征一位公民；正式专名与是否归类为国徽仍待确定。" /><div className="emblem-page"><div><CitizenEmblem large /></div><section>{[["01","八棱八人","每一个彩色棱都对应一位天命公民。"],["02","共同构成","任何一棱都不是装饰；八位公民共同组成完整标志。"],["03","名称待定","现阶段仅使用“帝国八棱主标志”这一描述性称呼，不提前确定正式专名。"]].map(([n,title,copy]) => <article key={n}><b>{n}</b><div><h3>{title}</h3><p>{copy}</p></div></article>)}<p className="emblem-note">SHARED EMBLEM · EIGHT COLOURED RAYS</p></section></div></>;
}

// Kept as an internal visual reference while the persistent chamber replaces the original demo.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function HonorsSection() { return <HonorsPage/>; }

function CalendarSection() { return <CalendarPage/>; }

function MarketSection() { return <MarketPage/>; }

function PublicAtlasCitizenProfile({ citizen, onBack }: { citizen: Citizen; onBack: () => void }) {
  const positions = atlasOfficesForCitizen(citizen.id);
  return <><button className="atlas-profile-back" type="button" onClick={onBack}>← 返回天命图谱</button><PageHead eyebrow="Public Citizen Profile" title="公民公开档案" copy="这里只展示获准公开的身份与公职资料。"/><article className="profile" style={{ "--citizen": citizenRepresentativeColor(citizen) } as CSSProperties}><div className="profile-mark"><CitizenMark citizen={citizen}/><span>{atlasCodename(citizen.id)}</span></div><div className="profile-copy"><small>PUBLIC CITIZEN RECORD</small><h2>{atlasName(citizen)}</h2><dl><div><dt>公民代号</dt><dd>{atlasCodename(citizen.id)}</dd></div><div><dt>现任公职</dt><dd>{positions.length ? positions.map(office => office.title).join(" · ") : "暂无现任公职"}</dd></div><div><dt>身份</dt><dd>第一帝国公民</dd></div></dl><p className="atlas-visitor-disclaimer">访客只能查看公开身份；私人消息、账户设置、个人数据及编辑功能不开放。</p></div></article></>;
}

function ProfileSection({ citizen }: { citizen: Citizen }) { return <SelfProfilePage citizen={citizen} renderMark={<CitizenMark citizen={citizen} />}/>; }

function ClubMysticMark({ citizen }: { citizen: Citizen }) {
  return <MysticSigil memberId={citizen.id} />;
}

function ClubAvatar({ citizen, profile }: { citizen: Citizen; profile?: ClubProfile }) {
  const avatar = CLUB_AVATARS.find((item) => item.id === profile?.avatar) ?? CLUB_AVATARS[0];
  if (avatar.id === "sigil") return <ClubMysticMark citizen={citizen} />;
  return <span className={`club-mask-avatar avatar-${avatar.id}`} aria-label={avatar.label}>{avatar.icon}</span>;
}

function ClubSticker({ sticker }: { sticker: string }) {
  const item = CLUB_STICKERS.find((candidate) => candidate.id === sticker);
  if (!item) return null;
  return <span className={`club-sticker sticker-${item.id}`} role="img" aria-label={item.label}>{item.icon}</span>;
}

function FanTransition({ direction }: { direction: "enter" | "exit" }) {
  return <div className={`fan-transition fan-${direction}`} role="status" aria-live="assertive" aria-label={direction === "enter" ? "正在进入 Amberina 的个人 Lounge" : "正在返回 Committee Lounge"}>
    <div className="fan-transition-halo" aria-hidden="true"><i /><i /><i /></div>
    <ArticulatedFan />
    <div className="fan-transition-copy"><small>PRIVATE PASSAGE · AMBERINA</small><p>{direction === "enter" ? "正在展开私人 Lounge" : "正在返回 Committee Lounge"}</p><span><i /><i /><i /></span></div>
  </div>;
}

function AmberinaLounge({ visitor, ownerProfile, onBack }: { visitor: Citizen; ownerProfile?: ClubProfile; onBack: () => void }) {
  return <MafraerLounge onBack={onBack} ownerName={loungeMaskName(CITIZENS[0], ownerProfile)} visitorName={loungeMaskName(visitor)} isOwner={visitor.id === "amberina"} ownerAvatar={<ClubAvatar citizen={CITIZENS[0]} profile={ownerProfile} />} />;
}

function CommitteeLounge({ citizen, leave, seatingUnlocked, initialRoom = "committee" }: { citizen: Citizen; leave: () => void; seatingUnlocked: boolean; initialRoom?: "committee" | "game-room" }) {
  const [rankingsOpen, setRankingsOpen] = useState(false);
  const [effect, setEffect] = useState<"idle" | "moon" | "cat" | "pumpkin" | "portrait" | "scroll" | "vase" | "table">("idle");
  const [moonlight, setMoonlight] = useState(false);
  const [moonSpell, setMoonSpell] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [historyView, setHistoryView] = useState(false);
  const [historyInput, setHistoryInput] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyMessages, setHistoryMessages] = useState<ClubMessage[]>([]);
  const [historyCursor, setHistoryCursor] = useState<ChatCursor | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [maskOpen, setMaskOpen] = useState(false);
  const miniGames = useMiniGameSystem();
  const [clubData, setClubData] = useState<ClubData>({ profiles: [], messages: [], seats: [], room: { id: "main", vaseSelection: "autumn", updatedByCitizenId: "", updatedAt: "" } });
  const [chatText, setChatText] = useState("");
  const [maskName, setMaskName] = useState(LOUNGE_IDENTITIES[citizen.id]?.mask || citizen.username);
  const [maskAvatar, setMaskAvatar] = useState("sigil");
  const [clubStatus, setClubStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [roomView, setRoomView] = useState<"committee" | "amberina" | "chryser" | "truth" | "game-room">(initialRoom);
  const [fanTransition, setFanTransition] = useState<"enter" | "exit" | null>(null);
  const [fireplaceOpening, setFireplaceOpening] = useState(false);
  const [globeOpening, setGlobeOpening] = useState(false);
  const [musicBoxOpening, setMusicBoxOpening] = useState(false);
  const [whisper, setWhisper] = useState("月光落在茶桌上，老书架仍像往常一样安静。");
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const chatDialogRef = useRef<HTMLElement>(null);
  const chatCloseRef = useRef<HTMLButtonElement>(null);
  const chatStickToBottomRef = useRef(true);
  const historyRequestRef = useRef(0);
  const historyAbortRef = useRef<AbortController | null>(null);
  const historyScrollRef = useRef<{ height: number; top: number } | null>(null);
  const musicBoxTimerRef = useRef<number | null>(null);
  const musicBoxSoundRef = useRef<(() => void) | null>(null);
  const musicBoxTravelRef = useRef(0);
  const fanTimerRef = useRef<number | null>(null);
  const fireplaceTimerRef = useRef<number | null>(null);
  const fanTravelRef = useRef(0);
  const globeTravelRef = useRef(0);
  const globeTimerRef = useRef<number | null>(null);
  const globeDeadlineRef = useRef<number | null>(null);

  const currentProfile = clubData.profiles?.find((profile) => profile.citizenId === citizen.id);
  const amberinaProfile = clubData.profiles?.find((profile) => profile.citizenId === "amberina");

  useEffect(() => {
    let remembered = false;
    try { remembered = window.sessionStorage.getItem(GAME_ROOM_RETURN_KEY) === "game-room"; } catch { /* URL still provides an explicit return. */ }
    if (remembered || new URLSearchParams(window.location.search).get("lounge") === "game-room") {
      setRoomView("game-room");
      try { window.sessionStorage.removeItem(GAME_ROOM_RETURN_KEY); } catch { /* No stored return to clear. */ }
      const url = new URL(window.location.href);
      url.searchParams.delete("lounge");
      window.history.replaceState(window.history.state, "", url);
    }
  }, []);

  useEffect(() => {
    if (roomView !== "committee" || miniGames.activeGame) return;
    let active = true;
    const loadClub = async () => {
      try {
        const response = await fetch(`/api/committee-club?citizenId=${encodeURIComponent(citizen.id)}`, { cache: "no-store" });
        const payload = await response.json() as ClubData;
        if (!response.ok) throw new Error(payload.error || "Committee Lounge 暂时没有回应。");
        if (active) setClubData(payload);
      } catch (error) {
        if (active) setClubStatus(error instanceof Error ? error.message : "Committee Lounge 暂时没有回应。");
      }
    };
    void loadClub();
    const timer = window.setInterval(loadClub, chatOpen ? 3500 : 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [chatOpen, citizen.id, roomView, miniGames.activeGame]);

  useEffect(() => {
    const panel = chatMessagesRef.current;
    if (!chatOpen || !panel) return;
    if (historyView) {
      const previous = historyScrollRef.current;
      panel.scrollTop = previous ? previous.top + panel.scrollHeight - previous.height : panel.scrollHeight;
      historyScrollRef.current = null;
    } else if (chatStickToBottomRef.current) panel.scrollTop = panel.scrollHeight;
  }, [chatOpen, clubData.messages?.length, historyView, historyMessages]);

  useEffect(() => {
    if (!chatOpen) return;
    chatCloseRef.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChatOpen(false);
      if (event.key !== "Tab") return;
      const controls = chatDialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])");
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); document.querySelector<HTMLButtonElement>(".club-magic-scroll")?.focus(); };
  }, [chatOpen]);

  useEffect(() => () => {
    fanTravelRef.current += 1;
    globeTravelRef.current += 1;
    musicBoxTravelRef.current += 1;
    historyRequestRef.current += 1;
    historyAbortRef.current?.abort();
    musicBoxSoundRef.current?.();
    if (musicBoxTimerRef.current !== null) window.clearTimeout(musicBoxTimerRef.current);
    if (fanTimerRef.current !== null) window.clearTimeout(fanTimerRef.current);
    if (fireplaceTimerRef.current !== null) window.clearTimeout(fireplaceTimerRef.current);
    if (globeTimerRef.current !== null) window.clearTimeout(globeTimerRef.current);
    if (globeDeadlineRef.current !== null) window.clearTimeout(globeDeadlineRef.current);
  }, []);

  const travelWithFan = (nextRoom: "committee" | "amberina") => {
    if (fanTransition || globeOpening || musicBoxOpening || fireplaceOpening) return;
    setChatOpen(false);
    setFanTransition(nextRoom === "amberina" ? "enter" : "exit");
    const request = ++fanTravelRef.current;
    const started = performance.now();
    const background = new window.Image();
    background.src = nextRoom === "amberina" ? MAFRAER_ROOM_ASSETS.moonlit : "/committee-lounge-word-globe-v1.png";
    const completePassage = (loaded: boolean) => {
      if (request !== fanTravelRef.current) return;
      const elapsed = performance.now() - started;
      const cycle = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 240 : FAN_CYCLE_MS;
      // Keep dancing while the destination loads; leave on a full bloom, not mid-snap.
      const finishAt = Math.max(1, Math.ceil(elapsed / cycle)) * cycle;
      fanTimerRef.current = window.setTimeout(() => {
        if (request !== fanTravelRef.current) return;
        if (loaded) setRoomView(nextRoom);
        else {
          setClubStatus("房间的月光暂时没有回应，请再试一次。");
          setWhisper("房间的月光暂时没有回应，请再试一次。");
        }
        setFanTransition(null);
        fanTimerRef.current = null;
      }, Math.max(0, finishAt - elapsed));
    };
    void background.decode().then(() => completePassage(true), () => completePassage(false));
  };

  const openWordmageLounge = () => {
    if (globeOpening || fanTransition || fireplaceOpening || musicBoxOpening) return;
    setChatOpen(false);
    setGlobeOpening(true);
    setWhisper("地球仪上的经纬线缓缓展开，磁场回应了言灵师的暗号。");
    const request = ++globeTravelRef.current;
    const started = performance.now();
    const background = new window.Image();
    let finished = false;
    const complete = (loaded: boolean) => {
      if (finished || request !== globeTravelRef.current) return;
      finished = true;
      if (globeDeadlineRef.current !== null) window.clearTimeout(globeDeadlineRef.current);
      globeDeadlineRef.current = null;
      const minimum = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 180 : 1900;
      globeTimerRef.current = window.setTimeout(() => {
        if (request !== globeTravelRef.current) return;
        if (loaded) setRoomView("truth");
        else {
          setClubStatus("言灵通道暂时没有回应，请再试一次。");
          setWhisper("地球仪安静地合上了航路。轻触它，可以再次尝试进入言灵师的 Lounge。");
        }
        setGlobeOpening(false);
        globeTimerRef.current = null;
      }, Math.max(0, minimum - (performance.now() - started)));
    };
    globeDeadlineRef.current = window.setTimeout(() => complete(false), 12000);
    background.src = "/nishujiade-private-lounge-v1.png";
    void background.decode().then(() => complete(true), () => complete(false));
  };

  const openChryserLounge = () => {
    if (fireplaceOpening || globeOpening || fanTransition || musicBoxOpening) return;
    setChatOpen(false);
    setFireplaceOpening(true);
    setWhisper("壁炉深处先出现一粒绿色余烬，随后整座炉膛突然燃烧起来。");
    const started = performance.now();
    const background = new window.Image();
    background.src = "/chryser-private-lounge.png";
    const complete = (loaded: boolean) => {
      const elapsed = performance.now() - started;
      const minimum = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 280 : 2600;
      fireplaceTimerRef.current = window.setTimeout(() => {
        if (loaded) setRoomView("chryser");
        else {
          setClubStatus("翡翠壁炉暂时无法打开，请再试一次。");
          setWhisper("绿色余烬熄灭了；通往 Room No. 02 的门没有打开。");
        }
        setFireplaceOpening(false);
        fireplaceTimerRef.current = null;
      }, Math.max(0, minimum - elapsed));
    };
    void background.decode().then(() => complete(true), () => complete(false));
  };

  const openGameRoom = () => {
    if (musicBoxOpening || globeOpening || fireplaceOpening || fanTransition) return;
    setChatOpen(false); setMusicBoxOpening(true);
    setWhisper("八音盒打开了。小小的星月随音乐转动，另一间明亮的房间正在醒来。");
    musicBoxSoundRef.current?.();
    musicBoxSoundRef.current = startMusicBoxTune();
    const request = ++musicBoxTravelRef.current, started = performance.now();
    const background = new window.Image();
    let finished = false;
    const complete = (loaded: boolean) => {
      if (finished || request !== musicBoxTravelRef.current) return;
      finished = true;
      if (musicBoxTimerRef.current !== null) window.clearTimeout(musicBoxTimerRef.current);
      const minimum = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 250 : 2400;
      musicBoxTimerRef.current = window.setTimeout(() => {
        if (request !== musicBoxTravelRef.current) return;
        musicBoxSoundRef.current?.(); musicBoxSoundRef.current = null;
        if (loaded) setRoomView("game-room");
        else setWhisper("八音盒的房门暂时没有打开，请再轻触一次。");
        setMusicBoxOpening(false); musicBoxTimerRef.current = null;
      }, Math.max(0, minimum - (performance.now() - started)));
    };
    musicBoxTimerRef.current = window.setTimeout(() => complete(false), 8000);
    background.src = "/lounge-game-room-v1.webp";
    void background.decode().then(() => complete(true), () => complete(false));
  };

  const reveal = (nextEffect: typeof effect, message: string) => {
    setEffect(nextEffect);
    setWhisper(message);
  };

  const postClub = async (body: Record<string, string | number>) => {
    const response = await fetch("/api/committee-club", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, citizenId: citizen.id }),
    });
    const payload = await response.json() as ClubData & { message?: ClubMessage; profile?: ClubProfile };
    if (!response.ok) throw new Error(payload.error || "房间没能保存这次魔法。");
    return payload;
  };

  const touchMoon = () => {
    setMoonlight(true);
    setMoonSpell((value) => value + 1);
    reveal("moon", "月光真的回应了你：星尘沿着窗框扩散，暗号在半空中亮起。");
  };

  const openChat = () => {
    chatStickToBottomRef.current = true;
    setHistoryView(false);
    setChatOpen(true);
    setMaskOpen(false);
    reveal("scroll", "卷轴舒展开来，三人秘密聊天已经打开。");
  };

  const loadHistory = async (query = historyInput, older = false) => {
    const request = ++historyRequestRef.current;
    historyAbortRef.current?.abort();
    const controller = new AbortController(); historyAbortRef.current = controller;
    setHistoryBusy(true); setHistoryError(""); setHistoryView(true);
    const applied = query.trim().slice(0, 120);
    if (!older) { setHistoryQuery(applied); setHistoryMessages([]); setHistoryCursor(null); historyScrollRef.current = null; }
    else if (chatMessagesRef.current) historyScrollRef.current = { height: chatMessagesRef.current.scrollHeight, top: chatMessagesRef.current.scrollTop };
    const params = new URLSearchParams({ citizenId: citizen.id, q: applied });
    if (older && historyCursor) { params.set("beforeAt", historyCursor.createdAt); params.set("beforeId", historyCursor.id); }
    try {
      const response = await fetch(`/api/committee-club?${params}`, { cache: "no-store", signal: controller.signal });
      const payload = await response.json() as ClubData;
      if (!response.ok) throw new Error(payload.error || "卷轴暂时无法翻页。");
      if (request !== historyRequestRef.current) return;
      setHistoryMessages(previous => older ? mergeChatMessages(previous, payload.messages ?? []) : payload.messages ?? []);
      setHistoryCursor(payload.nextCursor ?? null);
    } catch (error) { if (request === historyRequestRef.current && !controller.signal.aborted) { historyScrollRef.current = null; setHistoryError(error instanceof Error ? error.message : "往事暂时无法读取。"); } }
    finally { if (request === historyRequestRef.current) setHistoryBusy(false); }
  };

  const backToLiveChat = () => {
    historyRequestRef.current += 1; historyAbortRef.current?.abort();
    setHistoryBusy(false); setHistoryView(false); setHistoryInput(""); setHistoryError("");
    chatStickToBottomRef.current = true;
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const body = chatText.trim();
    if (!body || saving) return;
    setSaving(true);
    setClubStatus("");
    try {
      const payload = await postClub({ action: "message", body, sticker: "" });
      if (payload.message) setClubData((current) => ({ ...current, messages: mergeChatMessages(current.messages ?? [], [payload.message!]) }));
      backToLiveChat();
      setChatText("");
    } catch (error) {
      setClubStatus(error instanceof Error ? error.message : "消息没有送出去。");
    } finally {
      setSaving(false);
    }
  };

  const sendSticker = async (sticker: string) => {
    if (saving) return;
    setSaving(true);
    setClubStatus("");
    try {
      const payload = await postClub({ action: "message", body: "", sticker });
      if (payload.message) setClubData((current) => ({ ...current, messages: mergeChatMessages(current.messages ?? [], [payload.message!]) }));
      backToLiveChat();
    } catch (error) {
      setClubStatus(error instanceof Error ? error.message : "魔法表情没有送出去。");
    } finally {
      setSaving(false);
    }
  };

  const editMask = () => {
    setMaskName(loungeMaskName(citizen, currentProfile));
    setMaskAvatar(currentProfile?.avatar || "sigil");
    setMaskOpen(true);
  };

  const saveMask = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setClubStatus("");
    try {
      const payload = await postClub({ action: "mask", maskName, avatar: maskAvatar });
      if (payload.profile) setClubData((current) => ({ ...current, profiles: [...(current.profiles ?? []).filter((profile) => profile.citizenId !== citizen.id), payload.profile!] }));
      setMaskOpen(false);
      setClubStatus("面具已经戴好，只会在 Committee Lounge 里出现。");
    } catch (error) {
      setClubStatus(error instanceof Error ? error.message : "面具没有保存成功。");
    } finally {
      setSaving(false);
    }
  };

  const selectSeat = async (seatIndex: number) => {
    if (!seatingUnlocked || saving) return;
    const occupied = clubData.seats?.find((seat) => seat.seatIndex === seatIndex);
    if (occupied && occupied.citizenId !== citizen.id) {
      setClubStatus("这把椅子已经有人落座了。");
      return;
    }
    setSaving(true);
    setClubStatus("");
    try {
      const payload = await postClub({ action: "seat", seatIndex });
      if (payload.seats) setClubData((current) => ({ ...current, seats: payload.seats }));
      setWhisper(`${loungeMaskName(citizen, currentProfile)} 已在第 ${seatIndex + 1} 把椅子落座。`);
    } catch (error) {
      setClubStatus(error instanceof Error ? error.message : "这把椅子暂时没有回应。");
    } finally {
      setSaving(false);
    }
  };

  if (roomView === "amberina") return <>
    <AmberinaLounge visitor={citizen} ownerProfile={amberinaProfile} onBack={() => travelWithFan("committee")} />
    {fanTransition && <FanTransition direction={fanTransition} />}
  </>;

  if (roomView === "chryser") return <ChryserLounge citizenId={citizen.id} emblemBlades={EMBLEM_BLADES} onBack={() => setRoomView("committee")} />;

  if (roomView === "truth") return <WordmageLounge onBack={() => setRoomView("committee")} />;

  if (miniGames.activeGame) return <MiniGameSystem citizenId={citizen.id} gameId={miniGames.activeGame} emblemBlades={EMBLEM_BLADES} onClose={miniGames.closeMiniGame} loungeTitle={roomView === "game-room" ? "八音盒游艺室" : undefined} backLabel={roomView === "game-room" ? "返回游戏室" : undefined} />;

  if (roomView === "game-room") return <><GameRoom emblemBlades={EMBLEM_BLADES} onBack={() => setRoomView("committee")} onLaunch={miniGames.launchMiniGame} onRankings={() => setRankingsOpen(true)} />{rankingsOpen && <LoungeLeaderboard citizenId={citizen.id} onClose={() => setRankingsOpen(false)} />}</>;

  return (
    <>
    <section className={`committee-restroom effect-${effect} ${moonlight ? "moonlight" : ""} ${fireplaceOpening ? "fireplace-opening" : ""}`} aria-label="Committee Lounge 委员会秘密 Lounge">
      <header className="club-room-toolbar">
        <button type="button" onClick={leave}><span aria-hidden="true">←</span> 返回帝国</button>
        <button type="button" onClick={() => setRankingsOpen(true)}>月光成绩簿 · 排行榜</button>
        <div><i /> COMMITTEE LOUNGE · {clubData.seats?.length ?? 0}/3 SEATED</div>
        <button type="button" aria-pressed={moonlight} onClick={() => { setMoonlight((value) => !value); setWhisper(moonlight ? "烛火重新亮起，壁炉又暖了起来。" : "烛火熄下，月光接管了整个房间。"); }}>{moonlight ? "点亮烛火" : "只留月光"}</button>
      </header>

      <div className="club-room-stage">
        <Image className="club-room-art" src="/committee-lounge-word-globe-v1.png" alt="月光古堡里的 Committee Lounge，有三把专属座椅、完整壁炉、书架上的精细古金地球仪、南瓜、画像和黑猫" fill sizes="(max-width: 760px) 100vw, calc(100vw - 248px)" priority unoptimized />
        <div className="club-room-shade" aria-hidden="true" />
        <div className="club-firelight" aria-hidden="true" />
        <div className="club-wisps" aria-hidden="true"><i /><i /><i /><i /></div>
        {moonSpell > 0 && <div className="club-moon-magic" key={moonSpell} aria-hidden="true"><i /><i /><i /><b>✦</b><b>✦</b><b>✦</b><span /></div>}

        <div className="club-room-title">
          <small>AUTHORISED COMMITTEE EYES ONLY</small>
          <h1>COMMITTEE <em>LOUNGE</em></h1>
          <p>委员会秘密 Lounge</p>
        </div>

        {!seatingUnlocked && <div className="club-welcome-caption" role="status" aria-live="polite"><small>AI LOUNGE HOST</small><p>Welcome to Committee Lounge, esteemed member <strong>{LOUNGE_IDENTITIES[citizen.id]?.spoken ?? citizen.name}</strong></p><span>迎宾播报结束后开放落座</span></div>}

        <div className={`lounge-seats ${seatingUnlocked ? "unlocked" : "locked"}`} aria-label="Committee Lounge 三把座椅">
          {[0, 1, 2].map((seatIndex) => {
            const seat = clubData.seats?.find((item) => item.seatIndex === seatIndex);
            const occupant = seat ? CLUB_MEMBERS.find((member) => member.id === seat.citizenId) : undefined;
            const occupantProfile = occupant ? clubData.profiles?.find((profile) => profile.citizenId === occupant.id) : undefined;
            const mine = occupant?.id === citizen.id;
            return <button type="button" key={seatIndex} className={`${occupant ? "occupied" : "empty"} ${mine ? "mine" : ""}`} disabled={!seatingUnlocked || (Boolean(occupant) && !mine) || saving} onClick={() => void selectSeat(seatIndex)} aria-label={occupant ? `第 ${seatIndex + 1} 把椅子由 ${loungeMaskName(occupant, occupantProfile)} 占用` : `选择第 ${seatIndex + 1} 把椅子`}>
              {occupant ? <><ClubMysticMark citizen={occupant} /><span>{loungeMaskName(occupant, occupantProfile)}{mine ? " · 你" : ""}</span></> : <span>{seatingUnlocked ? "选择落座" : "迎宾播报中"}</span>}
            </button>;
          })}
        </div>

        <button className="club-wall-fan" type="button" onClick={() => travelWithFan("amberina")} aria-label="拨动书架上合拢的欧洲蕾丝洋扇，进入 Mafraer 的私人 Lounge"><LaceFanDrawing openProgress={0.012} framing="closed" /></button>
        <RotatingWordmageGlobe opening={globeOpening} onOpen={openWordmageLounge} />
        <MusicBoxPortal opening={musicBoxOpening} onOpen={openGameRoom} />

        <button className="club-hotspot moon" type="button" aria-label="触碰月亮" aria-pressed={effect === "moon"} onClick={touchMoon}><i /><span>触碰月亮</span></button>
        <button className="club-hotspot portrait" type="button" aria-label="观察画像" aria-pressed={effect === "portrait"} onClick={() => reveal("portrait", "最右边的画像刚刚眨了一下。它显然知道委员会的秘密。")}><i /><span>观察画像</span></button>
        <button className="club-hotspot cat" type="button" aria-label="摸摸黑猫" aria-pressed={effect === "cat"} onClick={() => reveal("cat", "黑猫发出满意的呼噜声：今晚的密谋可以继续。")}><i /><span>摸摸黑猫</span></button>
        <button className="club-hotspot pumpkin" type="button" aria-label="唤醒南瓜" aria-pressed={effect === "pumpkin"} onClick={() => reveal("pumpkin", "南瓜管理员确认了三位委员的身份，无人尾随。")}><i /><span>唤醒南瓜</span></button>

        <div className="lounge-table-scene">
          <LoungeTable onInteract={() => { setEffect("table"); setWhisper("原画中的月牙雕花圆桌回应了指尖，桌面与雕花基座产生细微的立体视差。"); }} />
          <LoungeTeaRitual onWhisper={setWhisper} />
          <VaseExperience room={clubData.room} citizenId={citizen.id}
            memberName={(id) => { const member = CITIZENS.find(value => value.id === id); return member ? loungeMaskName(member, clubData.profiles?.find(profile => profile.citizenId === id)) : "成员"; }}
            onRoomChange={(room) => { setClubData(current => ({ ...current, room })); setEffect("vase"); const member = CITIZENS.find(value => value.id === room.updatedByCitizenId); setWhisper(`${member ? loungeMaskName(member, clubData.profiles?.find(profile => profile.citizenId === member.id)) : "成员"} · ${getVase(room.vaseSelection).label}`); }} />
        </div>
        <MagicChatScroll open={chatOpen} onOpen={openChat} />

        <button className="club-fireplace-portal" type="button" onClick={openChryserLounge} disabled={fireplaceOpening} aria-label="打开右侧壁炉，进入 Lord Chryser 的私人 Lounge"><span>打开翡翠壁炉</span></button>
        <div className="club-jade-fire" aria-hidden="true">
          <Image className="jade-fire-underlay" src="/jade-ember-flame-v2.png" width={1437} height={1095} alt="" unoptimized />
          <Image className="jade-fire-body" src="/jade-ember-flame-v2.png" width={1437} height={1095} alt="" unoptimized />
          <span className="jade-fire-depth"><Image src="/committee-lounge-word-globe-v1.png" width={1672} height={941} alt="" unoptimized /></span>
        </div>
      </div>

      {globeOpening && <WordmageGlobePassage />}
      {musicBoxOpening && <div className="arcade-music-passage playing" role="status" aria-live="polite"><MusicBoxDrawing /><small>FOLLOW THE LITTLE MELODY</small><p>八音盒的另一面，是一间游艺室。</p><span>正在打开温暖的房门…</span></div>}



      <aside className="club-whisper" aria-live="polite">
        <small>THE LOUNGE WHISPERS TO {loungeMaskName(citizen, currentProfile).toUpperCase()}</small>
        <p>{whisper}</p>
      </aside>

      {chatOpen && <>
        <button type="button" className="club-drawer-scrim" onClick={() => setChatOpen(false)} aria-label="关闭秘密聊天" />
        <aside className="club-chat-drawer magic-chat-parchment" id="lounge-chat-scroll" ref={chatDialogRef} role="dialog" aria-modal="true" aria-label="委员会秘密聊天与历史卷轴">
          <header>
            <div><small>THE UNSEALED SCROLL</small><h2>秘密卷轴</h2><p>仅三位委员会成员可见</p></div>
            <button ref={chatCloseRef} type="button" onClick={() => setChatOpen(false)} aria-label="合上卷轴">×</button>
          </header>
          <div className="club-chat-identity">
            <ClubAvatar citizen={citizen} profile={currentProfile} />
            <div><small>YOU ARE WEARING</small><strong>{loungeMaskName(citizen, currentProfile)}</strong></div>
            <button type="button" onClick={editMask}>更换面具</button>
          </div>

          {maskOpen && <form className="club-mask-editor" onSubmit={saveMask}>
            <header><strong>选择你的 mask</strong><button type="button" onClick={() => setMaskOpen(false)}>取消</button></header>
            <label><span>Lounge 昵称</span><input value={maskName} maxLength={24} onChange={(event) => setMaskName(event.target.value)} placeholder="例如：玛法女巫" /></label>
            <fieldset><legend>头像</legend><div>{CLUB_AVATARS.map((avatar) => <button type="button" key={avatar.id} className={maskAvatar === avatar.id ? "selected" : ""} onClick={() => setMaskAvatar(avatar.id)}><span>{avatar.icon}</span><small>{avatar.label}</small></button>)}</div></fieldset>
            <button className="club-mask-save" type="submit" disabled={saving}>戴上这副面具</button>
          </form>}

          <form className="club-history-search" role="search" onSubmit={event => { event.preventDefault(); void loadHistory(historyInput); }}><input type="search" value={historyInput} maxLength={120} onChange={event=>setHistoryInput(event.target.value)} placeholder="查找卷轴里的话…" aria-label="搜索聊天记录关键词" /><button type="submit" disabled={historyBusy}>查找</button>{historyView ? <button type="button" onClick={backToLiveChat}>回到最新</button> : <button type="button" onClick={()=>void loadHistory("")}>查阅往事</button>}</form>
          <p className="club-history-caption" role="status">{historyError || (historyBusy ? "正在翻阅卷轴…" : historyView ? `${historyQuery ? `「${historyQuery}」· ` : ""}已读出 ${historyMessages.length} 条往事` : "最新聊天 · 所有时间均为北京时间（UTC+8）")}</p>
          <div className="club-chat-messages" ref={chatMessagesRef} onScroll={event => { const panel=event.currentTarget; chatStickToBottomRef.current = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 80; }}>
            {historyView && historyCursor && <button className="club-history-more" type="button" disabled={historyBusy} onClick={()=>void loadHistory(historyQuery, true)}>{historyBusy ? "正在翻阅…" : "↑ 更早的记录"}</button>}
            {!(historyView ? historyMessages : clubData.messages)?.length && !historyBusy && <div className="club-chat-empty"><span>📜</span><p>{historyView ? historyQuery ? "卷轴里还没有找到这句话。" : "还没有可以翻阅的往事。" : <>卷轴还是空白的。<br />留下第一句秘密吧。</>}</p></div>}
            {(historyView ? historyMessages : clubData.messages)?.map((message) => {
              const author = CLUB_MEMBERS.find((member) => member.id === message.citizenId) ?? CLUB_MEMBERS[0];
              const profile = clubData.profiles?.find((item) => item.citizenId === message.citizenId);
              return <article key={message.id} className={message.citizenId === citizen.id ? "mine" : ""}><ClubAvatar citizen={author} profile={profile} /><div><header><strong>{loungeMaskName(author, profile)}</strong><time dateTime={Number.isFinite(chatDate(message.createdAt).getTime()) ? chatDate(message.createdAt).toISOString() : undefined} title="北京时间 · UTC+8">{chatTimestamp(message.createdAt)}</time></header>{message.sticker && <ClubSticker sticker={message.sticker} />}{message.body && <p>{message.body}</p>}</div></article>;
            })}
          </div>

          <div className="club-sticker-rail" aria-label="动态魔法表情">{CLUB_STICKERS.map((sticker) => <button type="button" key={sticker.id} onClick={() => void sendSticker(sticker.id)} disabled={saving} aria-label={`发送${sticker.label}`}><ClubSticker sticker={sticker.id} /></button>)}</div>
          <form className="club-chat-compose" onSubmit={sendMessage}><input value={chatText} maxLength={500} onChange={(event) => setChatText(event.target.value)} placeholder="在卷轴上写一句话…" /><button type="submit" disabled={!chatText.trim() || saving}>送出</button></form>
          <p className={`club-chat-status ${clubStatus ? "visible" : ""}`} role="status">{clubStatus}</p>
        </aside>
      </>}
    </section>
    {rankingsOpen && <LoungeLeaderboard citizenId={citizen.id} onClose={() => setRankingsOpen(false)} />}
    {fanTransition && <FanTransition direction={fanTransition} />}
    </>
  );
}

function System({ citizen, logout, initialBriefing }: {
  citizen: Citizen; logout: () => void; initialBriefing: BriefingFeed;
}) {
  const [section,setSection] = useState<Section>("home");
  const [portal, setPortal] = useState<LoungePassageDirection | null>(null);
  const portalReturnSection = useRef<Section>("home");
  const [loungeSeatingUnlocked, setLoungeSeatingUnlocked] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Mandatory post-login gate: the application shell is never rendered until
  // a validated live briefing has actually been displayed and acknowledged.
  const [entryBriefingPending, setEntryBriefingPending] = useState(true);
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [focusedCitizenId, setFocusedCitizenId] = useState<string | null>(null);
  const [viewedCitizenId,setViewedCitizenId] = useState(citizen.id);
  const [atlasHandbookOpen,setAtlasHandbookOpen] = useState(false);
  const [parliamentDeepLink, setParliamentDeepLink] = useState("");
  const [parliamentDeepLinkFocus, setParliamentDeepLinkFocus] = useState<"proposal" | "speaker" | "debate" | "vote">("vote");
  const [parliamentFocus, setParliamentFocus] = useState<"all" | "referendum">("all");
  const [loungeLanding, setLoungeLanding] = useState<"committee" | "game-room">("committee");
  const briefingFeed = useBriefingFeed(citizen.id, section, initialBriefing);
  const presence = useMemberPresence(citizen.id);
  useEffect(() => {
    try { setSidebarCollapsed(window.localStorage.getItem("schicksal:sidebar-collapsed") === "true"); } catch { /* Keep the navigation expanded when storage is unavailable. */ }
  }, []);
  useEffect(() => {
    if (!CLUB_MEMBER_IDS.has(citizen.id)) return;
    let remembered = false;
    try { remembered = window.sessionStorage.getItem(GAME_ROOM_RETURN_KEY) === "game-room"; } catch { /* Use the explicit return URL. */ }
    if (remembered || new URLSearchParams(window.location.search).get("lounge") === "game-room") {
      setSection("club"); setLoungeSeatingUnlocked(true);
    }
  }, [citizen.id]);
  const toggleSidebar = () => setSidebarCollapsed((current) => {
    const next = !current;
    try { window.localStorage.setItem("schicksal:sidebar-collapsed", String(next)); } catch { /* The toggle still works for this visit. */ }
    return next;
  });
  useEffect(() => {
    // Agent-only preview routing; the production hostname cannot enter this branch.
    if (window.location.hostname === "terminal.local") {
      const previewSection = new URLSearchParams(window.location.search).get("preview");
      if (previewSection === "parliament" || previewSection === "archives" || (previewSection === "club" && CLUB_MEMBER_IDS.has(citizen.id))) {
        const timer = window.setTimeout(() => {
          setSection(previewSection);
          if (previewSection === "club") setLoungeSeatingUnlocked(true);
        }, 0);
        return () => window.clearTimeout(timer);
      }
    }
  }, [citizen.id]);
  const enterLounge = () => {
    if (!CLUB_MEMBER_IDS.has(citizen.id) || portal) return;
    portalReturnSection.current = section === "club" ? "home" : section;
    setLoungeLanding("committee");
    setLoungeSeatingUnlocked(false);
    setBriefingOpen(false);
    setPortal("enter");
    // Keep the existing personal lounge announcement without holding the
    // newly requested four-second reveal behind speech synthesis.
    announceCommitteeLounge(citizen, () => setLoungeSeatingUnlocked(true));
  };
  const exitLounge = () => {
    if (portal || section !== "club") return;
    setPortal("exit");
  };
  const swapPortalRoom = () => {
    if (portal === "enter") {
      setSection("club");
      setLoungeSeatingUnlocked(true);
    } else if (portal === "exit") {
      setSection(portalReturnSection.current === "club" ? "home" : portalReturnSection.current);
    }
  };
  const dismissBriefing = () => {
    setBriefingOpen(false);
    setEntryBriefingPending(false);
    // External mini-game returns are restored only AFTER the briefing gate.
    setSection((current) => current === "club" ? current : "home");
  };
  const openBriefingDesk = () => {
    setBriefingOpen(false);
    setEntryBriefingPending(false);
    setSection("briefing");
  };
  const navigateFromBriefing = (target: BriefingTarget, targetId?: string, focus: "proposal" | "speaker" | "debate" | "vote" = "vote") => {
    setBriefingOpen(false);
    setEntryBriefingPending(false);
    setParliamentDeepLink(target === "parliament" ? targetId || "" : "");
    setParliamentDeepLinkFocus(focus);
    setParliamentFocus(target === "referendum" ? "referendum" : "all");
    if (target === "club") { enterLounge(); return; }
    if (target === "games") {
      if (!CLUB_MEMBER_IDS.has(citizen.id)) return; // game room currently belongs to Committee Lounge
      setLoungeLanding("game-room");
      setLoungeSeatingUnlocked(true);
      setSection("club");
      return;
    }
    if (target === "referendum") { setSection("parliament"); return; }
    setSection(target);
  };
  const openMessenger = (_memberId: string | null) => {
    setBriefingOpen(false);
    setSection("messenger");
    document.querySelector(".system-main")?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openPublicCitizen = (memberId: string) => {
    if (!CITIZENS.some(member => member.id === memberId && !member.locked)) return;
    setFocusedCitizenId(memberId);
    setBriefingOpen(false);
    setSection("atlas");
    document.querySelector(".system-main")?.scrollTo({top:0,behavior:"smooth"});
  };
  const openAtlasProfile = (id:string) => { if(!CITIZENS.some(c=>c.id===id && !c.locked)) return; setViewedCitizenId(id);setSection("profile");document.querySelector(".system-main")?.scrollTo({top:0,behavior:"smooth"}); };
  const openAtlasHandbook = () => { setAtlasHandbookOpen(true); setSection("archives"); };
  const viewedCitizen = CITIZENS.find(c=>c.id===viewedCitizenId && !c.locked) ?? citizen;
  const clubOpen = section === "club" && CLUB_MEMBER_IDS.has(citizen.id);
  let content: ReactNode;
  switch (section) {
    case "messenger": content = <ShellPlaceholder kind="messenger" />; break;
    case "library": content = <ShellPlaceholder kind="library" />; break;
    case "briefing": content = <BriefingDesk sharedMark={<Emblem compact />} canEnterLounge={CLUB_MEMBER_IDS.has(citizen.id)} canEnterGames={CLUB_MEMBER_IDS.has(citizen.id)} onNavigate={navigateFromBriefing} onOpenBriefing={() => setBriefingOpen(true)} tasks={briefingFeed.tasks} views={briefingFeed.views} onArchiveChange={briefingFeed.changeArchive} taskState={briefingFeed.status} news={briefingFeed.news} newsState={briefingFeed.status} />; break;
    case "atlas":
    case "citizens":
    case "emblem": content = <SchicksalAtlas key={focusedCitizenId ?? "atlas-default"} initialCitizenId={focusedCitizenId ?? undefined} onVisitCitizen={openAtlasProfile} onOpenHandbook={openAtlasHandbook}/>; break;
    case "parliament": content = <><div className="atlas-parliament-help"><button type="button" title="查阅图书馆政务手册" onClick={openAtlasHandbook}>▤ 政务手册 ↗</button></div><FeatureSuspense label="帝国政务"><PersistentParliamentSection citizen={citizen} requestedItemId={parliamentDeepLink} requestedFocus={parliamentDeepLinkFocus} focusReferendums={parliamentFocus === "referendum"} renderOfficialMark={member => <CitizenMark citizen={member} display="official" />} /></FeatureSuspense></>; break;
    case "honors": content = <HonorsSection/>; break;
    case "calendar": content = <CalendarSection />; break;
    case "market": content = <MarketSection/>; break;
    case "photos": content = <FeatureSuspense label="家庭影像馆"><PhotoArchiveSection citizen={citizen} sharedMark={<Emblem compact />} renderCitizenMark={subject => <CitizenMark citizen={subject} />} /></FeatureSuspense>; break;
    case "archives": content = atlasHandbookOpen ? <AtlasGovernmentHandbook onBack={()=>setAtlasHandbookOpen(false)}/> : <FeatureSuspense label="国家档案馆"><ArchivesSection authorMark={<CitizenMark citizen={CITIZENS[0]} />} authorMarkColor={CITIZENS[0].markColor} /></FeatureSuspense>; break;
    case "profile": content = viewedCitizen.id === citizen.id ? <><ProfileSection citizen={citizen} />{citizen.id === "amberina" && <MemberAccessSettings />}</> : <PublicAtlasCitizenProfile citizen={viewedCitizen} onBack={()=>setSection("atlas")}/>; break;
    case "club": content = CLUB_MEMBER_IDS.has(citizen.id) ? <CommitteeLounge citizen={citizen} leave={exitLounge} seatingUnlocked={loungeSeatingUnlocked} initialRoom={loungeLanding} /> : <HomeSection go={setSection} />; break;
    default: content = <HomeSection go={setSection} />;
  }
  // Do not mount the sidebar, homepage, parliament or Lounge behind the
  // mandatory briefing: an overlay layered over the site is bypassable.
  const briefingDialog = (
    <BriefingOverlay
        onClose={dismissBriefing}
        onOpenDesk={openBriefingDesk}
        onNavigate={navigateFromBriefing}
        tasks={briefingFeed.tasks}
        taskState={briefingFeed.status}
        news={briefingFeed.news}
        newsState={briefingFeed.status}
        canEnterLounge={CLUB_MEMBER_IDS.has(citizen.id)} canEnterGames={CLUB_MEMBER_IDS.has(citizen.id)}
        sharedMark={<Emblem compact />}
        heroMark={<Emblem compact />}
      />
  );
  if (!mayMountSiteAfterBriefing(entryBriefingPending)) return <main className="mandatory-briefing-gate">{briefingDialog}</main>;

  return (
    <main className={`system ${clubOpen ? "club-system" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {briefingOpen && briefingDialog}
      <ImperialSidebar
        activeSection={section}
        collapsed={sidebarCollapsed}
        loungeOpen={clubOpen}
        canEnterLounge={CLUB_MEMBER_IDS.has(citizen.id)}
        sharedMark={<Emblem compact />}
        presence={presence}
        members={CITIZENS}
        selfId={citizen.id}
        renderMemberMark={memberId => {
          const member = CITIZENS.find(entry => entry.id === memberId);
          return member ? <CitizenMark citizen={member} display={clubOpen ? "official" : "web"} /> : null;
        }}
        onToggle={toggleSidebar}
        onLogo={() => { if (clubOpen) exitLounge(); else if (CLUB_MEMBER_IDS.has(citizen.id)) enterLounge(); }}
        onNavigate={(target: SidebarDestination) => {
          if (target === "collection") return;
          if (target === "messenger") { openMessenger(null); return; }
          if (target === "parliament") { setParliamentDeepLink(""); setParliamentFocus("all"); }
          if (target === "atlas") setFocusedCitizenId(null);
          if (target === "profile") setViewedCitizenId(citizen.id);
          if (target === "archives") setAtlasHandbookOpen(false);
          setBriefingOpen(false);
          setSection(target);
          document.querySelector(".system-main")?.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onLogout={logout}
      />
      <section className={`system-main ${clubOpen ? "club-main" : ""}`}>
        <div className={`content ${clubOpen ? "club-content" : ""}`}>{content}</div>
      </section>
      {portal && <LoungePassage direction={portal} sharedMark={<Emblem compact />}
        onSwap={swapPortalRoom} onFinish={() => setPortal(null)}/>}

    </main>
  );
}

type PreparedBriefing = MandatoryBriefingPreload;
type SystemBriefing = { feed: BriefingFeed };

export default function Home() {
  const [phase, setPhase] = useState<Phase>("opening");
  const [citizen, setCitizen] = useState(CITIZENS[0]);
  const [preload, setPreload] = useState<PreparedBriefing>({ status: "loading" });
  const [preloadAttempt, setPreloadAttempt] = useState(0);
  const [systemBriefing, setSystemBriefing] = useState<SystemBriefing | null>(null);
  const logoutPending = useRef(false);
  const restoredCitizen = useRef<Citizen | null>(null);
  const restoreController = useRef<AbortController | null>(null);
  const logoutMember = async () => {
    if (logoutPending.current) return;
    restoreController.current?.abort();
    restoredCitizen.current = null;
    logoutPending.current = true;
    try { await fetch("/api/member-session", { method: "DELETE" }); }
    catch { /* The local view can still return to the login form offline. */ }
    finally { logoutPending.current = false; window.location.replace("/"); }
  };
  useEffect(() => {
    // Even diagnostic or preview routes must pass member authentication and
    // the briefing gate; query strings cannot bypass onboarding.
    const controller = new AbortController();
    restoreController.current = controller;
    void fetch("/api/member-session", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? await response.json() as { citizenId?: string } : null)
      .then((session) => {
        if (controller.signal.aborted) return;
        const member = CITIZENS.find((item) => item.id === session?.citizenId && !item.locked);
        if (!member) return;
        restoredCitizen.current = member;
        setCitizen(member);
        let entryCompleted = false;
        try { entryCompleted = window.sessionStorage.getItem("schicksal:entry-complete") === "1"; window.sessionStorage.removeItem("schicksal:entry-complete"); } catch { /* Retain the normal opening when storage is unavailable. */ }
        setPhase((current) => entryCompleted || current === "login" ? "welcome" : current);
      }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (phase !== "welcome") return;
    let active = true;
    const controller = new AbortController();
    // A failed or hung request must not trap a citizen in a never-ending transition.
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    void Promise.all([
      fetchBriefingFeed(controller.signal),
      fetch("/api/briefing-session", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
        .then(async response => {
          if (!response.ok) throw new Error("Could not validate briefing session");
          const result = await response.json() as { citizenId?: string; briefingSessionKey?: string | null };
          if (result.citizenId !== citizen.id || !result.briefingSessionKey) throw new Error("Briefing identity mismatch");
          return result.briefingSessionKey;
        }),
    ]).then(([feed, sessionKey]) => {
      if (active && !controller.signal.aborted) setPreload({ status: "ready", citizenId: citizen.id, feed, sessionKey });
    }).catch(() => { if (active) setPreload({ status: "error", citizenId: citizen.id }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [phase, citizen.id, preloadAttempt]);
  const retryPreload = useCallback(() => {
    setPreload({ status: "loading" });
    setPreloadAttempt(value => value + 1);
  }, []);
  const enterSystem = useCallback(() => {
    // Fail closed: only a live, schema-validated, current-member feed and a
    // server-verified session can unlock the post-login briefing itself.
    if (!readyForMandatoryBriefing(preload, citizen.id)) return;
    setSystemBriefing({ feed: preload.feed });
    setPhase("system");
  }, [citizen.id, preload]);
  if (phase === "opening") return <Opening done={() => setPhase(restoredCitizen.current ? "welcome" : "login")} />;
  if (phase === "login") return <Login replay={() => setPhase("opening")} enter={(next) => { restoreController.current?.abort(); setCitizen(next); setPreload({ status: "loading" }); setPhase("welcome"); }} />;
  // A phase transition alone never grants site access. If its live feed
  // is missing, keep the authenticated member on the Welcome gate.
  if (phase === "welcome" || !systemBriefing) return <Welcome citizen={citizen} enter={enterSystem}
    preloadStatus={preload.citizenId && preload.citizenId !== citizen.id ? "loading" : preload.status}
    retry={retryPreload} />;
  return <System citizen={citizen} initialBriefing={systemBriefing.feed}
    logout={() => { void logoutMember(); }} />;
}
