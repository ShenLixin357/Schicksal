"use client";

import Image from "next/image";
import { CITIZENS, type Citizen } from "./citizens";
import { MemberAccessSettings } from "./member-access-settings";
import { SpeakerManagement } from "./speaker-management";
import { startTransition, useEffect, useRef, useState, type CSSProperties, type Dispatch, type DragEvent, type FormEvent, type ReactNode, type SetStateAction } from "react";
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
import { HeroEmblemSculpture, type EmblemBladeSpec } from "./emblem/hero-emblem-sculpture";

type Phase = "opening" | "login" | "welcome" | "system";
type Section = "home" | "citizens" | "emblem" | "parliament" | "honors" | "calendar" | "market" | "photos" | "archives" | "profile" | "club";

type ArchivePhoto = {
  id: string;
  title: string;
  description: string;
  era: string;
  capturedAt: string;
  subjects: string[];
  subjectKey: string;
  uploaderCitizenId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  imageUrl: string;
};

type ParliamentStage = "proposal" | "debate" | "amendment" | "voting" | "resolved" | "deferred";
type ParliamentClassification = "ordinary" | "constitutional" | "administrative_review" | "external_agreement" | "youth_autonomy" | "pending_review" | "foundational";
type ParliamentRouting = "parliament" | "legislative_committee" | "dual_review" | "youth_electorate" | "pending_review";
type ProposerAgeBand = "under_8" | "8_to_11" | "12_plus" | "unknown";
type ParliamentItem = {
  id: string;
  serialCode: string;
  kind: "proposal" | "bill" | "referendum";
  title: string;
  summary: string;
  body: string;
  stage: ParliamentStage;
  outcome: "pending" | "passed" | "rejected" | "leader_decision_required" | "withdrawn";
  classification: ParliamentClassification;
  routing: ParliamentRouting;
  proposerAgeBand: ProposerAgeBand;
  recusalRequested: number;
  stageReason: string;
  votingVersion: number | null;
  deadline: string;
  createdByCitizenId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  voteCount: number;
  pendingAmendmentCount: number;
};
type ParliamentComment = { id: string; itemId: string; citizenId: string; commentType: string; body: string; quoteText: string; parentId: string; createdAt: string };
type ParliamentVote = { id: string; itemId: string; citizenId: string; choice: "support" | "oppose" | "abstain"; documentVersion: number; createdAt: string; updatedAt: string };
type ParliamentAmendment = { id: string; itemId: string; citizenId: string; targetQuote: string; proposedText: string; reason: string; status: "pending" | "accepted" | "rejected"; createdAt: string; decidedAt: string; decidedByCitizenId: string };
type ParliamentAuditEvent = { id: string; itemId: string; actorCitizenId: string; eventType: string; description: string; metadataJson: string; createdAt: string };
type ParliamentMeeting = { itemId: string; speakerElectionDeadline: string; speakerStatus: "not_configured" | "open" | "elected" | "tie_pending"; speakerCitizenId: string; speakerDecidedByCitizenId: string; tiedCandidateIdsJson: string; currentFloorCitizenId: string; debateStartedAt: string; seatsLocked: number; updatedAt: string };
type ParliamentSpeakerCandidate = { id: string; itemId: string; citizenId: string; createdAt: string };
type ParliamentSpeakerVote = { id: string; itemId: string; voterCitizenId: string; candidateCitizenId: string; createdAt: string; updatedAt: string };
type ParliamentSeat = { id: string; itemId: string; citizenId: string; side: "proposal" | "question"; seatIndex: number; createdAt: string; updatedAt: string };
type ParliamentFloorRequest = { id: string; itemId: string; citizenId: string; requestType: "speech" | "give_way" | "point_order"; body: string; status: "pending" | "accepted" | "rejected"; createdAt: string; decidedAt: string; decidedByCitizenId: string };
type ParliamentResultReaction = { id: string; itemId: string; citizenId: string; reaction: "like" | "dislike"; createdAt: string; updatedAt: string };
type ParliamentSession = { citizenId: string; stageManager: boolean; speakerManager: boolean; meetingSpeaker: boolean; platformAuthenticated: boolean };
type ParliamentBoard = { items?: ParliamentItem[]; activeItem?: ParliamentItem | null; comments?: ParliamentComment[]; votes?: ParliamentVote[]; amendments?: ParliamentAmendment[]; auditEvents?: ParliamentAuditEvent[]; meeting?: ParliamentMeeting | null; speakerCandidates?: ParliamentSpeakerCandidate[]; speakerVotes?: ParliamentSpeakerVote[]; seats?: ParliamentSeat[]; floorRequests?: ParliamentFloorRequest[]; resultReactions?: ParliamentResultReaction[]; session?: ParliamentSession; error?: string };
type ClubProfile = { citizenId: string; maskName: string; avatar: string; updatedAt: string };
type ClubMessage = { id: string; citizenId: string; body: string; sticker: string; createdAt: string };
type ClubRoom = { id: string; vaseSelection: string; updatedByCitizenId: string; updatedAt: string };
type LoungeSeat = { seatIndex: number; citizenId: string; seatedAt: string };
type ClubData = { profiles?: ClubProfile[]; messages?: ClubMessage[]; nextCursor?: ChatCursor | null; room?: ClubRoom; seats?: LoungeSeat[]; error?: string };



// The current homepage emblem is the canonical source for color order and adjacency.
// Every 2D and 3D rendering reads this same clockwise blade specification.
const EMBLEM_BLADES: readonly EmblemBladeSpec[] = CITIZENS.map((citizen, index) => ({
  index,
  citizenId: citizen.id,
  color: citizen.accent,
  angle: index * 45,
}));

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
const CLUB_VASE_OPTIONS = [
  { id: "autumn", image: "/club-vase-autumn.png", label: "秋日红叶", category: "花束" },
  { id: "sunflower", image: "/club-vase-sunflower.png", label: "向日葵", category: "花束" },
  { id: "roses", image: "/club-vase-roses.png", label: "玫瑰", category: "花束" },
  { id: "tulips", image: "/club-vase-tulips.png", label: "郁金香", category: "花束" },
  { id: "lavender", image: "/club-vase-lavender.png", label: "薰衣草", category: "花束" },
  { id: "daisies", image: "/club-vase-daisies.png", label: "雏菊", category: "花束" },
  { id: "cabbage", image: "/club-vase-cabbage.png", label: "卷心菜", category: "神秘菜单" },
  { id: "popcorn", image: "/club-vase-popcorn.png", label: "爆米花", category: "神秘菜单" },
  { id: "lollipop", image: "/club-vase-lollipop.png", label: "棒棒糖", category: "神秘菜单" },
];

const NAV: { id: Section; label: string; en: string }[] = [
  { id: "home", label: "首页", en: "Home" },
  { id: "citizens", label: "公民", en: "Citizens" },
  { id: "emblem", label: "主标志", en: "Emblem" },
  { id: "parliament", label: "议会", en: "Parliament" },
  { id: "honors", label: "荣誉与积分", en: "Honors" },
  { id: "calendar", label: "节日", en: "Calendar" },
  { id: "market", label: "跳蚤市场", en: "Market" },
  { id: "photos", label: "家庭影像馆", en: "Photo Archive" },
  { id: "archives", label: "国家档案馆", en: "Archives" },
  { id: "profile", label: "个人页", en: "Profile" },
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

function Wordmark() {
  return <div className="wordmark"><strong>SCHICKSAL</strong><span>天命第一帝国</span></div>;
}

function CitizenMark({ citizen }: { citizen: Citizen }) {
  let sigil: ReactNode;
  switch (citizen.motif) {
    case "snow":
      sigil = <><path d="M32 7v50M10.4 19.5l43.2 25M10.4 44.5l43.2-25" /><path d="m32 14-6-5m6 5 6-5m-21.5 14-7.4 1.2m7.4-1.2-2.7-7m2.7 25-7.4-1.2m7.4 1.2-2.7 7M32 50l-6 5m6-5 6 5m9.5-14 7.4-1.2M47.5 41l2.7 7m-2.7-25 7.4 1.2M47.5 23l2.7-7" /><rect x="27.5" y="27.5" width="9" height="9" rx="1" transform="rotate(45 32 32)" /></>;
      break;
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
  return <span className={`citizen-mark ${citizen.motif}`} style={{ "--mark": citizen.markColor } as CSSProperties} aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{sigil}</svg></span>;
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
              <button type="button" disabled={item.locked} key={item.id} onClick={() => { setSelectedId(item.id); setError(""); }} className={`${selectedId === item.id ? "selected" : ""} ${item.locked ? "locked" : ""}`} style={{ "--citizen": item.accent } as CSSProperties}>
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

function Welcome({ citizen, enter }: { citizen: Citizen; enter: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setLeaving(true), 3900);
    const enterTimer = window.setTimeout(enter, 4700);
    return () => { window.clearTimeout(fadeTimer); window.clearTimeout(enterTimer); };
  }, [enter]);
  return (
    <main className={`welcome ${leaving ? "leaving" : ""}`} style={{ "--citizen": citizen.markColor } as CSSProperties}>
      <div className="welcome-rings" aria-hidden="true"><i /><i /><i /></div>
      <section>
        <p className="eyebrow">Identity Confirmed · 身份已确认</p>
        <div className="welcome-mark"><CitizenMark citizen={citizen} /><i /></div>
        <small>WELCOME TO SCHICKSAL</small><h1>{citizen.name}</h1>
        <div className="welcome-meta"><span>{citizen.office}</span><i /><span>CODE NAME · {citizen.codename}</span></div>
        <p>Your citizen identity has been recognised by the Imperial System.<br />帝国系统已识别你的公民身份。</p>
        <button type="button" onClick={enter}>ENTER NOW <span>→</span></button>
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

function PageHead({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="page-head"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><p>{copy}</p></header>;
}

function HomeSection({ go }: { go: (id: Section) => void }) {
  return (
    <div className="home-section">
      <section className="hero">
        <div><p className="eyebrow">Imperial Core · 帝国中枢</p><h1>The Empire<br /><em>Returns.</em></h1><p>2/3 选票过半。第一帝国已经正式复辟，并继续运作。</p><button className="line-button" type="button" onClick={() => go("archives")}>READ THE RESTORATION RECORD <span>→</span></button></div>
        <div className="hero-emblem"><HeroEmblemSculpture blades={EMBLEM_BLADES} /><p>EIGHT CITIZENS · ONE SHARED EMBLEM</p><strong>帝国八棱主标志</strong><small>正式名称与类别待定</small></div>
      </section>
      <section className="status-grid">
        <article className="notice"><header><span>RESTORATION DECREE · RATIFIED</span><i>2 / 3</i></header><h2>第一帝国正式复辟</h2><p>2026 年 8 月 15 日 13:43，立法委员会就第一帝国复辟举行公投。宇宙霸主与 No.2 投下支持票，2/3 过半通过；主席随即宣布帝国正式复辟。</p><footer><span>15 AUG 2026 · 13:43</span><span>REFERENDUM PASSED</span></footer></article>
        <article className="festival"><header><span>NEXT OBSERVANCE</span><i>04·19</i></header><b>19</b><h2>National Day</h2><p>国庆日 · 竞赛、Blue Ribbon 与跳蚤市场</p></article>
        <article className="pulse"><header><span>SYSTEM PULSE</span><i>LIVE</i></header>{[["8","Citizens · 公民"],["1","Active Office · 主席"],["4","State Traditions · 传统"]].map(([n,label]) => <div key={label}><b>{n}</b><span>{label}</span></div>)}</article>
      </section>
      <section className="quick"><header><div><p className="eyebrow">Direct Access</p><h2>快速进入</h2></div><small>IMPERIAL NETWORK / 10 MODULES</small></header><div>{[["parliament","01","议会","查看复辟公投与国家议事记录"],["honors","02","荣誉与积分","查看 Blue Ribbon 与历史审计"],["calendar","03","国家节日","国庆、酸奶节与打火节"],["photos","04","家庭影像馆","上传照片并用成员标志精确分类"],["archives","05","国家档案馆","回到第一帝国最初的文书"]].map(([id,n,title,copy]) => <button key={id} type="button" onClick={() => go(id as Section)}><span>{n}</span><i>↗</i><h3>{title}</h3><p>{copy}</p></button>)}</div></section>
    </div>
  );
}

function CitizensSection() {
  return <><PageHead eyebrow="Citizen Registry" title="公民名册" copy="八个彩色棱分别象征八位公民；八棱共同构成帝国的共同主标志。" /><div className="registry">{CITIZENS.map((citizen,index) => <article key={citizen.id} className={citizen.locked ? "sealed" : ""} style={{ "--citizen": citizen.accent } as CSSProperties}><b>0{index + 1}</b><CitizenMark citizen={citizen} /><div><small>{citizen.office}</small><h2>{citizen.name}</h2><p>{citizen.codename}</p></div></article>)}</div><p className="note">八个棱在视觉原型中均有独立颜色；其余身份、年龄顺序及最终代表色仍待八位公民正式确认。</p></>;
}

function EmblemSection() {
  return <><PageHead eyebrow="Shared Imperial Emblem" title="帝国八棱主标志" copy="标志由八个具有独立颜色的棱组成，每一棱象征一位公民；正式专名与是否归类为国徽仍待确定。" /><div className="emblem-page"><div><CitizenEmblem large /></div><section>{[["01","八棱八人","每一个彩色棱都对应一位天命公民。"],["02","共同构成","任何一棱都不是装饰；八位公民共同组成完整标志。"],["03","名称待定","现阶段仅使用“帝国八棱主标志”这一描述性称呼，不提前确定正式专名。"]].map(([n,title,copy]) => <article key={n}><b>{n}</b><div><h3>{title}</h3><p>{copy}</p></div></article>)}<p className="emblem-note">SHARED EMBLEM · EIGHT COLOURED RAYS</p></section></div></>;
}

// Kept as an internal visual reference while the persistent chamber replaces the original demo.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ParliamentSection({ citizen }: { citizen: Citizen }) {
  const [choice, setChoice] = useState<"support" | "oppose" | "abstain" | null>(null);
  const [hearHear, setHearHear] = useState(7);
  const [giveWay, setGiveWay] = useState(false);
  const [pointOfOrder, setPointOfOrder] = useState(false);
  const [amendments, setAmendments] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [proposalTitle, setProposalTitle] = useState("国家基础制度框架案");
  const [proposalSummary, setProposalSummary] = useState("正文与具体条款将在后续制宪课程完成后装入；当前先验证完整议事流程。");
  const [draftTitle, setDraftTitle] = useState(proposalTitle);
  const [draftSummary, setDraftSummary] = useState(proposalSummary);
  const [events, setEvents] = useState([
    { id: 1, tag: "议长", text: "本次会议进入 Debate（辩论）阶段。" },
    { id: 2, tag: "书记席", text: "当前议案为网站交互原型，不产生正式法律效力。" },
  ]);

  const addEvent = (tag: string, text: string) => {
    setEvents((current) => [...current, { id: Date.now() + Math.random(), tag, text }].slice(-6));
  };

  const castVote = (next: "support" | "oppose" | "abstain") => {
    setChoice(next);
    const labels = { support: "支持", oppose: "反对", abstain: "弃权" };
    addEvent("正式表决", `${citizen.codename} 投下“${labels[next]}”演示票。`);
  };

  const base = { support: 2, oppose: 2, abstain: 1 };
  const support = base.support + (choice === "support" ? 1 : 0);
  const oppose = base.oppose + (choice === "oppose" ? 1 : 0);
  const abstain = base.abstain + (choice === "abstain" ? 1 : 0);
  const valid = support + oppose;
  const total = valid + abstain;
  const threshold = Math.floor(valid / 2) + 1;
  const result = choice === null
    ? "等待当前登录公民投出演示票"
    : support > oppose
      ? "支持票超过半数 · 提案通过"
      : oppose > support
        ? "反对票超过半数 · 提案未通过"
        : "票数相同 · 交由最高领导人裁决";

  const saveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTitle = draftTitle.trim() || "未命名提案";
    const nextSummary = draftSummary.trim() || "正文与条款待后续录入。";
    setProposalTitle(nextTitle);
    setProposalSummary(nextSummary);
    setEditorOpen(false);
    addEvent("提案更新", `${citizen.codename} 更新了议案标题与摘要。`);
  };

  const chamberSides = [CITIZENS.slice(0, 4), CITIZENS.slice(4, 8)];

  return <>
    <PageHead eyebrow="Parliament · 议会" title="国家议事厅" copy="像真正的议场一样允许喝彩、插话、程序挑战、修正和正式表决；中文始终是主界面语言。" />

    <section className="parliament-rules" aria-label="议会表决规则">
      <article><span>01</span><div><small>MAJORITY · 多数</small><h2>超过半数即通过</h2><p>正式表决中，支持票超过有效表决票的一半，议案即通过。</p></div></article>
      <article><span>02</span><div><small>CASTING DECISION · 平票裁决</small><h2>平票交由最高领导人</h2><p>支持票与反对票相同时，由最高领导人作出最终裁决。</p></div></article>
      <article><span>03</span><div><small>PROTOTYPE · 原型</small><h2>先建程序，再装条款</h2><p>当前表决和文本均为交互演示，不进入正式国家记录。</p></div></article>
    </section>

    <ol className="legislative-flow" aria-label="一项议案的完整流程">
      {["草案", "正式提案", "辩论", "修正", "公投", "正式法案"].map((step, index) => <li key={step} className={index === 2 ? "active" : ""}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong>{index < 5 && <i>→</i>}</li>)}
    </ol>

    <section className="live-parliament">
      <article className="chamber-shell">
        <header><div><i /><span>CHAMBER LIVE · 议场进行中</span></div><small>INTERACTIVE DEMO · 互动原型</small></header>
        <div className="chamber-room">
          <div className="speaker-dais"><small>本次会议议长 · SPEAKER</small><strong>待会议选出</strong><span>主持发言顺序与程序问题</span></div>
          {chamberSides.map((side, sideIndex) => <div className={`chamber-benches side-${sideIndex + 1}`} key={sideIndex}>{side.map((member) => <div className={`${member.id === citizen.id ? "current" : ""} ${member.locked ? "sealed" : ""}`} key={member.id} style={{ "--citizen": member.accent } as CSSProperties}><CitizenMark citizen={member} /><span><strong>{member.username}</strong><small>{member.locked ? "席位待确认" : member.id === citizen.id ? "当前登录" : "在席"}</small></span></div>)}</div>)}
          <div className="dispatch-table"><span>议案文本</span><b>S</b><small>AMENDMENTS<br />修正案 {String(amendments).padStart(2, "0")}</small></div>
        </div>

        <section className="floor-speech">
          <div className="speaker-identity"><CitizenMark citizen={citizen} /><span><small>正在发言 · ON THE FLOOR</small><strong>{citizen.codename}</strong></span></div>
          <blockquote>“{proposalSummary}”</blockquote>
          <div className="chamber-actions">
            <button type="button" onClick={() => { setHearHear((count) => count + 1); addEvent("议场反应", `${citizen.codename} 喊出“说得好！”`); }}><span>说得好！</span><small>HEAR, HEAR! · {hearHear}</small></button>
            <button type="button" className={giveWay ? "active" : ""} onClick={() => { const next = !giveWay; setGiveWay(next); addEvent("请求插话", next ? `${citizen.codename} 请求发言人让出短暂发言权。` : `${citizen.codename} 撤回插话请求。`); }}><span>请求插话</span><small>GIVE WAY</small></button>
            <button type="button" className={pointOfOrder ? "active urgent" : ""} onClick={() => { const next = !pointOfOrder; setPointOfOrder(next); addEvent("程序问题", next ? `${citizen.codename} 提出程序问题，议事暂时中止。` : "程序问题已经处理，议事恢复。" ); }}><span>程序问题</span><small>POINT OF ORDER</small></button>
            <button type="button" onClick={() => { setAmendments((count) => count + 1); addEvent("修正案", `${citizen.codename} 提交了一项文字修正占位。`); }}><span>提出修正案</span><small>AMENDMENT</small></button>
          </div>
        </section>
      </article>

      <aside className="session-feed">
        <header><p className="eyebrow">Live Record · 实时记录</p><span>{events.length} EVENTS</span></header>
        <div>{events.map((item) => <article key={item.id}><small>{item.tag}</small><p>{item.text}</p><time>NOW</time></article>)}</div>
        <footer><i /><span>{pointOfOrder ? "程序暂停 · 议长处理中" : giveWay ? "插话请求等待发言人回应" : "议事程序正常进行"}</span></footer>
      </aside>
    </section>

    <section className="bill-workspace">
      <article className="active-bill">
        <header><div><span>PROPOSAL DEMO–001</span><i>DEBATE · 辩论中</i></div><button type="button" onClick={() => { setEditorOpen(!editorOpen); setDraftTitle(proposalTitle); setDraftSummary(proposalSummary); }}>{editorOpen ? "关闭编辑" : "编辑标题与摘要"}</button></header>
        <small>CONTENTS TO BE ADDED LATER · 具体条款稍后加入</small>
        <h2>{proposalTitle}</h2>
        <p>{proposalSummary}</p>
        <div className="bill-meta"><span><small>PROPOSED BY · 提案人</small><strong>{citizen.codename}</strong></span><span><small>VERSION · 版本</small><strong>v0.{amendments + 1}</strong></span><span><small>AMENDMENTS · 修正</small><strong>{amendments}</strong></span></div>
        {editorOpen && <form className="proposal-editor" onSubmit={saveDraft}><label><span>提案标题</span><input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} maxLength={100} /></label><label><span>提案摘要</span><textarea value={draftSummary} onChange={(event) => setDraftSummary(event.target.value)} maxLength={420} rows={4} /></label><button className="primary" type="submit">保存到演示议案 <span>→</span></button></form>}
        <footer><strong>立法史将保留</strong><span>原始提案</span><span>逐条引用</span><span>修正版本</span><span>讨论线程</span><span>最终票数</span></footer>
      </article>

      <aside className="division-lobby">
        <header><p className="eyebrow">Division · 正式表决</p><span>DEMO BALLOT</span></header>
        <h2>演示计票台</h2>
        <p>下列基础票数仅用于展示结果变化，不代表任何真实公民立场。</p>
        <div className="division-tally"><span><b>{support}</b><small>支持</small></span><i /><span><b>{oppose}</b><small>反对</small></span><i /><span><b>{abstain}</b><small>弃权</small></span></div>
        <div className="vote-meter" aria-label={`支持 ${support}，反对 ${oppose}`}><i style={{ width: `${valid ? support / valid * 100 : 50}%` }} /><b /></div>
        <div className="threshold"><span>通过所需</span><strong>{threshold} / {valid} 有效票</strong><small>弃权不计入支持或反对；平票进入最高领导人裁决。</small></div>
        <div className="division-actions">
          <button type="button" className={choice === "support" ? "chosen support" : ""} onClick={() => castVote("support")}><span>AYE</span><strong>支持</strong></button>
          <button type="button" className={choice === "oppose" ? "chosen oppose" : ""} onClick={() => castVote("oppose")}><span>NO</span><strong>反对</strong></button>
          <button type="button" className={choice === "abstain" ? "chosen abstain" : ""} onClick={() => castVote("abstain")}><span>ABSTAIN</span><strong>弃权</strong></button>
        </div>
        <p className={`division-result ${choice ? "decided" : ""}`} role="status"><small>CURRENT RESULT · 当前结果</small><strong>{result}</strong><span>{total} 张演示选票 · 不写入国家档案</span></p>
      </aside>
    </section>

    <article className="restoration-record"><div><span>R–001</span><small>ARCHIVED REFERENDUM · 历史公投</small></div><section><h2>第一帝国复辟公投</h2><p>2026 年 8 月 15 日 13:43，立法委员会共 3 票，宇宙霸主与 No.2 支持，以 2/3 过半通过。</p></section><strong>RATIFIED<br />已认证</strong></article>
  </>;
}

const PARLIAMENT_STAGE_META: Record<ParliamentStage, { cn: string; en: string; copy: string }> = {
  proposal: { cn: "提案库", en: "PROPOSALS", copy: "异步阅读、引用条文、评论与回复" },
  debate: { cn: "辩论厅", en: "DEBATE", copy: "选举议长、选择阵营席位并现场质询" },
  amendment: { cn: "修正中心", en: "AMENDMENTS", copy: "保留议场，在面对面辩论中逐字修正" },
  voting: { cn: "表决厅", en: "DIVISION", copy: "赞成、反对、弃权及公开个人标志" },
  resolved: { cn: "结果与档案", en: "ACTS & RECORDS", copy: "公示结果、永久记录、评论与赞踩" },
  deferred: { cn: "搁置库", en: "DEFERRED", copy: "保留暂缓、撤回和等待材料的议案" },
};

const COMMENT_TYPE_META: Record<string, { cn: string; en: string }> = {
  comment: { cn: "评论", en: "COMMENT" },
  speech: { cn: "发言", en: "SPEECH" },
  amendment: { cn: "修正建议", en: "AMENDMENT" },
  "point-order": { cn: "程序问题", en: "POINT OF ORDER" },
  "routing-objection": { cn: "分流异议", en: "ROUTING OBJECTION" },
  reaction: { cn: "议场反应", en: "HEAR, HEAR" },
  system: { cn: "程序记录", en: "PROCEDURE" },
};

const CLASSIFICATION_META: Record<ParliamentClassification, string> = {
  ordinary: "普通立法",
  constitutional: "宪制事项",
  administrative_review: "行政审查",
  external_agreement: "对外协议",
  youth_autonomy: "少年自治事项",
  pending_review: "待分类审查",
  foundational: "建国认证",
};

const ROUTING_META: Record<ParliamentRouting, string> = {
  parliament: "议会全体程序",
  legislative_committee: "立法委员会",
  dual_review: "宪制双重审查",
  youth_electorate: "少年成员选民团",
  pending_review: "等待程序分流",
};

const AGE_BAND_META: Record<ProposerAgeBand, string> = {
  under_8: "8 岁以下",
  "8_to_11": "8–11 岁",
  "12_plus": "12 岁及以上",
  unknown: "尚未确认",
};

function PersistentParliamentSection({ citizen }: { citizen: Citizen }) {
  const [items, setItems] = useState<ParliamentItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [comments, setComments] = useState<ParliamentComment[]>([]);
  const [votes, setVotes] = useState<ParliamentVote[]>([]);
  const [amendments, setAmendments] = useState<ParliamentAmendment[]>([]);
  const [auditEvents, setAuditEvents] = useState<ParliamentAuditEvent[]>([]);
  const [meeting, setMeeting] = useState<ParliamentMeeting | null>(null);
  const [speakerCandidates, setSpeakerCandidates] = useState<ParliamentSpeakerCandidate[]>([]);
  const [speakerVotes, setSpeakerVotes] = useState<ParliamentSpeakerVote[]>([]);
  const [seats, setSeats] = useState<ParliamentSeat[]>([]);
  const [floorRequests, setFloorRequests] = useState<ParliamentFloorRequest[]>([]);
  const [resultReactions, setResultReactions] = useState<ParliamentResultReaction[]>([]);
  const [session, setSession] = useState<ParliamentSession>({ citizenId: citizen.id, stageManager: false, speakerManager: false, meetingSpeaker: false, platformAuthenticated: false });
  const [filter, setFilter] = useState<"all" | ParliamentStage>("all");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [casePanel, setCasePanel] = useState<"stage" | "text" | "procedure" | "history">("stage");
  const [liveRecordOpen, setLiveRecordOpen] = useState(false);
  const [resolvedShelf, setResolvedShelf] = useState<"all" | "passed" | "rejected" | "referendum">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<"proposal" | "bill">("proposal");
  const [createTitle, setCreateTitle] = useState("");
  const [createSummary, setCreateSummary] = useState("");
  const [createBody, setCreateBody] = useState("");
  const [createClassification, setCreateClassification] = useState<ParliamentClassification>("pending_review");
  const [createAgeBand, setCreateAgeBand] = useState<ProposerAgeBand>("unknown");
  const [createRecusal, setCreateRecusal] = useState(false);
  const [createDeadline, setCreateDeadline] = useState("");
  const [commentType, setCommentType] = useState("comment");
  const [commentBody, setCommentBody] = useState("");
  const [commentQuote, setCommentQuote] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [quickCommentItemId, setQuickCommentItemId] = useState("");
  const [quickCommentBody, setQuickCommentBody] = useState("");
  const [amendmentOpen, setAmendmentOpen] = useState(false);
  const [amendmentQuote, setAmendmentQuote] = useState("");
  const [amendmentText, setAmendmentText] = useState("");
  const [amendmentReason, setAmendmentReason] = useState("");
  const [stageTarget, setStageTarget] = useState<ParliamentStage>("proposal");
  const [stageReason, setStageReason] = useState("");
  const [finalOutcome, setFinalOutcome] = useState("pending");
  const [classificationTarget, setClassificationTarget] = useState<ParliamentClassification>("pending_review");
  const [routingTarget, setRoutingTarget] = useState<ParliamentRouting>("pending_review");
  const [ageBandTarget, setAgeBandTarget] = useState<ProposerAgeBand>("unknown");
  const [recusalTarget, setRecusalTarget] = useState(false);
  const [deadlineTarget, setDeadlineTarget] = useState("");
  const [classificationReason, setClassificationReason] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editBody, setEditBody] = useState("");
  const [floorRequestBody, setFloorRequestBody] = useState("");

  const applyBoard = (board: ParliamentBoard) => {
    setItems(board.items ?? []);
    setComments(board.comments ?? []);
    setVotes(board.votes ?? []);
    setAmendments(board.amendments ?? []);
    setAuditEvents(board.auditEvents ?? []);
    setMeeting(board.meeting ?? null);
    setSpeakerCandidates(board.speakerCandidates ?? []);
    setSpeakerVotes(board.speakerVotes ?? []);
    setSeats(board.seats ?? []);
    setFloorRequests(board.floorRequests ?? []);
    setResultReactions(board.resultReactions ?? []);
    if (board.activeItem) setActiveId(board.activeItem.id);
    if (board.session) setSession(board.session);
  };

  const applyLiveBoard = (board: ParliamentBoard) => {
    startTransition(() => {
      if (board.votes) setVotes(board.votes);
      setMeeting(board.meeting ?? null);
      setSpeakerCandidates(board.speakerCandidates ?? []);
      setSpeakerVotes(board.speakerVotes ?? []);
      setSeats(board.seats ?? []);
      setFloorRequests(board.floorRequests ?? []);
      setResultReactions(board.resultReactions ?? []);
      if (board.session) setSession(board.session);
    });
  };

  const loadBoard = async (requestedId = "") => {
    const params = new URLSearchParams({ citizenId: citizen.id });
    if (requestedId) params.set("itemId", requestedId);
    const response = await fetch(`/api/parliament?${params.toString()}`);
    const board = await response.json() as ParliamentBoard;
    if (!response.ok) throw new Error(board.error || "议会资料暂时无法读取。");
    applyBoard(board);
  };

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ citizenId: citizen.id });
    fetch(`/api/parliament?${params.toString()}`)
      .then(async (response) => {
        const board = await response.json() as ParliamentBoard;
        if (!response.ok) throw new Error(board.error || "议会资料暂时无法读取。");
        if (active) applyBoard(board);
      })
      .catch((error: unknown) => { if (active) setStatus(error instanceof Error ? error.message : "议会资料暂时无法读取。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [citizen.id]);

  const activeItem = items.find((item) => item.id === activeId) ?? items[0];

  useEffect(() => {
    if (!activeItem) return;
    // Keep the procedural controls synchronized when a different persisted item is opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStageTarget(activeItem.stage);
    setFinalOutcome(activeItem.outcome === "passed" || activeItem.outcome === "rejected" ? activeItem.outcome : "pending");
    setEditTitle(activeItem.title);
    setEditSummary(activeItem.summary);
    setEditBody(activeItem.body);
    setClassificationTarget(activeItem.classification);
    setRoutingTarget(activeItem.routing);
    setAgeBandTarget(activeItem.proposerAgeBand);
    setRecusalTarget(Boolean(activeItem.recusalRequested));
    setDeadlineTarget(activeItem.deadline || "");
    setStageReason("");
    setClassificationReason("");
    setCommentQuote("");
    setCommentType("comment");
    setReplyTo("");
    setAmendmentOpen(false);
    setEditOpen(false);
    setFloorRequestBody("");
    setCasePanel("stage");
    setLiveRecordOpen(false);
    // Reset editors only when another persisted item is opened, not on live election polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem?.id]);

  useEffect(() => {
    if (!workspaceOpen || !activeItem || !["debate", "amendment", "voting"].includes(activeItem.stage)) return;
    const timer = window.setInterval(() => {
      const params = new URLSearchParams({ citizenId: citizen.id, itemId: activeItem.id, scope: "live" });
      fetch(`/api/parliament?${params.toString()}`)
        .then(async (response) => { if (!response.ok) throw new Error("Live meeting unavailable"); return await response.json() as ParliamentBoard; })
        .then((board) => applyLiveBoard(board))
        .catch(() => undefined);
    }, 4_000);
    return () => window.clearInterval(timer);
    // Live views refresh only the meeting and division payload, never the full docket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem?.id, activeItem?.stage, citizen.id, workspaceOpen]);

  const sendAction = async (payload: Record<string, unknown>, success: string) => {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/parliament", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-schicksal-citizen": citizen.id },
        body: JSON.stringify({ ...payload, citizenId: citizen.id }),
      });
      const board = await response.json() as ParliamentBoard;
      if (!response.ok) throw new Error(board.error || "议会操作失败。");
      if (board.items) applyBoard(board);
      else applyLiveBoard(board);
      setStatus(success);
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "议会操作失败，请稍后重试。");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openItem = async (id: string) => {
    setActiveId(id);
    setWorkspaceOpen(true);
    setCasePanel("stage");
    setLoading(true);
    setStatus("");
    try { await loadBoard(id); }
    catch (error) { setStatus(error instanceof Error ? error.message : "议案无法打开。"); }
    finally { setLoading(false); }
  };

  const createItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ok = await sendAction({ action: "create_item", kind: createKind, title: createTitle, summary: createSummary, body: createBody, classification: createClassification, proposerAgeBand: createAgeBand, recusalRequested: createRecusal, deadline: createDeadline }, "新议案已进入提案库，并生成了程序分流建议。");
    if (ok) {
      setCreateOpen(false); setWorkspaceOpen(true); setCasePanel("stage"); setCreateTitle(""); setCreateSummary(""); setCreateBody(""); setCreateClassification("pending_review"); setCreateAgeBand("unknown"); setCreateRecusal(false); setCreateDeadline(""); setFilter("proposal");
    }
  };

  const addComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeItem) return;
    const ok = await sendAction({ action: "add_comment", itemId: activeItem.id, commentType, body: commentBody, quoteText: commentQuote, parentId: replyTo }, "发言已经写入这项议案的讨论记录。");
    if (ok) { setCommentBody(""); setCommentType("comment"); setCommentQuote(""); setReplyTo(""); }
  };

  const addResultComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeItem) return;
    const ok = await sendAction({ action: "add_comment", itemId: activeItem.id, commentType: "comment", body: commentBody, quoteText: "", parentId: replyTo }, "评论已经发布在正式结果下方。");
    if (ok) { setCommentBody(""); setReplyTo(""); }
  };

  const addFloorSpeech = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeItem) return;
    const ok = await sendAction({ action: "add_comment", itemId: activeItem.id, commentType: "speech", body: commentBody, quoteText: commentQuote, parentId: "" }, "正式发言已经写入本次会议记录。");
    if (ok) { setCommentBody(""); setCommentQuote(""); }
  };

  const addQuickComment = async (event: FormEvent<HTMLFormElement>, item: ParliamentItem) => {
    event.preventDefault();
    const ok = await sendAction({ action: "add_comment", itemId: item.id, commentType: "comment", body: quickCommentBody, quoteText: "", parentId: "" }, `评论已经写入 ${item.serialCode} 的讨论记录。`);
    if (ok) {
      setQuickCommentBody("");
      setQuickCommentItemId("");
      setActiveId(item.id);
    }
  };

  const castVote = async (choice: "support" | "oppose" | "abstain") => {
    if (!activeItem) return;
    const previousVotes = votes;
    const now = new Date().toISOString();
    setVotes((current) => [...current.filter((vote) => vote.citizenId !== citizen.id), { id: `${activeItem.id}:${citizen.id}`, itemId: activeItem.id, citizenId: citizen.id, choice, documentVersion: activeItem.votingVersion ?? activeItem.version, createdAt: now, updatedAt: now }]);
    const ok = await sendAction({ action: "cast_vote", itemId: activeItem.id, choice }, "你的选票已经保存；再次选择可以改票。");
    if (!ok) setVotes(previousVotes);
  };

  const transitionStage = async () => {
    if (!activeItem) return;
    await sendAction({ action: "transition_stage", itemId: activeItem.id, stage: stageTarget, outcome: stageTarget === "resolved" ? finalOutcome : "pending", reason: stageReason }, `议案已经进入“${PARLIAMENT_STAGE_META[stageTarget].cn}”，程序理由已写入审计记录。`);
  };

  const classifyItem = async () => {
    if (!activeItem) return;
    await sendAction({ action: "classify_item", itemId: activeItem.id, classification: classificationTarget, routing: routingTarget, proposerAgeBand: ageBandTarget, recusalRequested: recusalTarget, deadline: deadlineTarget, reason: classificationReason }, "议案分类与程序路线已经正式确认。");
  };

  const submitAmendment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeItem) return;
    const ok = await sendAction({ action: "submit_amendment", itemId: activeItem.id, targetQuote: amendmentQuote, proposedText: amendmentText, reason: amendmentReason }, "正式修正案已提交到修正中心。");
    if (ok) { setAmendmentQuote(""); setAmendmentText(""); setAmendmentReason(""); setAmendmentOpen(false); }
  };

  const decideAmendment = async (amendmentId: string, decision: "accepted" | "rejected") => {
    if (!activeItem) return;
    await sendAction({ action: "decide_amendment", itemId: activeItem.id, amendmentId, decision }, decision === "accepted" ? "修正案已并入新版本正文。" : "修正案已否决，原文保持不变。");
  };

  const updateItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeItem) return;
    const ok = await sendAction({ action: "update_item", itemId: activeItem.id, title: editTitle, summary: editSummary, body: editBody }, "议案正文与版本记录已经更新。");
    if (ok) setEditOpen(false);
  };

  const standForSpeaker = async () => {
    if (!activeItem) return;
    await sendAction({ action: "stand_for_speaker", itemId: activeItem.id }, "你已经登记参选本次会议议长。");
  };

  const castSpeakerVote = async (candidateCitizenId: string) => {
    if (!activeItem) return;
    const previousVotes = speakerVotes;
    const now = new Date().toISOString();
    setSpeakerVotes((current) => [...current.filter((vote) => vote.voterCitizenId !== citizen.id), { id: `${activeItem.id}:${citizen.id}`, itemId: activeItem.id, voterCitizenId: citizen.id, candidateCitizenId, createdAt: now, updatedAt: now }]);
    const ok = await sendAction({ action: "cast_speaker_vote", itemId: activeItem.id, candidateCitizenId }, "你的公开议长选票已经登记；截止前可以改票。");
    if (!ok) setSpeakerVotes(previousVotes);
  };

  const resolveSpeakerTie = async (candidateCitizenId: string) => {
    if (!activeItem) return;
    await sendAction({ action: "resolve_speaker_tie", itemId: activeItem.id, candidateCitizenId }, "委员已完成议长选举平票裁决。");
  };

  const chooseSeat = async (side: "proposal" | "question", seatIndex: number) => {
    if (!activeItem) return;
    const previousSeats = seats;
    const now = new Date().toISOString();
    setSeats((current) => [...current.filter((seat) => seat.citizenId !== citizen.id && !(seat.side === side && seat.seatIndex === seatIndex)), { id: `${activeItem.id}:${citizen.id}`, itemId: activeItem.id, citizenId: citizen.id, side, seatIndex, createdAt: now, updatedAt: now }]);
    const ok = await sendAction({ action: "choose_seat", itemId: activeItem.id, side, seatIndex }, `你的个人标志已经进入${side === "proposal" ? "提案方" : "质询方"}第 ${seatIndex} 席。`);
    if (!ok) setSeats(previousSeats);
  };

  const startDebateSession = async () => {
    if (!activeItem) return;
    await sendAction({ action: "start_debate_session", itemId: activeItem.id }, "议长已经宣布开会；双方席位现已锁定。");
  };

  const requestFloor = async (requestType: "speech" | "give_way" | "point_order") => {
    if (!activeItem) return;
    const labels = { speech: "请求发言", give_way: "请求插话", point_order: "程序问题" };
    const ok = await sendAction({ action: "create_floor_request", itemId: activeItem.id, requestType, body: floorRequestBody }, `${labels[requestType]}已送交本次会议议长。`);
    if (ok) setFloorRequestBody("");
  };

  const decideFloorRequest = async (requestId: string, decision: "accepted" | "rejected") => {
    if (!activeItem) return;
    await sendAction({ action: "decide_floor_request", itemId: activeItem.id, requestId, decision }, `议场请求已${decision === "accepted" ? "接受" : "拒绝"}。`);
  };

  const setResultReaction = async (reaction: "like" | "dislike") => {
    if (!activeItem) return;
    const previousReactions = resultReactions;
    const now = new Date().toISOString();
    setResultReactions((current) => [...current.filter((entry) => entry.citizenId !== citizen.id), { id: `${activeItem.id}:${citizen.id}`, itemId: activeItem.id, citizenId: citizen.id, reaction, createdAt: now, updatedAt: now }]);
    const ok = await sendAction({ action: "set_result_reaction", itemId: activeItem.id, reaction }, `你已经对正式结果${reaction === "like" ? "点赞" : "点踩"}；这不会改变法律效力。`);
    if (!ok) setResultReactions(previousReactions);
  };

  const visibleItems = (filter === "all" ? items : items.filter((item) => item.stage === filter)).filter((item) => {
    if (filter !== "resolved" || resolvedShelf === "all") return true;
    if (resolvedShelf === "referendum") return item.kind === "referendum";
    return item.kind !== "referendum" && item.outcome === resolvedShelf;
  });
  const currentVotes = activeItem?.votingVersion ? votes.filter((vote) => vote.documentVersion === activeItem.votingVersion) : votes;
  const support = currentVotes.filter((vote) => vote.choice === "support").length;
  const oppose = currentVotes.filter((vote) => vote.choice === "oppose").length;
  const abstain = currentVotes.filter((vote) => vote.choice === "abstain").length;
  const myVote = currentVotes.find((vote) => vote.citizenId === citizen.id)?.choice;
  const validVotes = support + oppose;
  const resultText = support > oppose ? "支持票领先" : oppose > support ? "反对票领先" : validVotes ? "当前平票" : "等待投票";
  const stageCount = (stage: ParliamentStage) => items.filter((item) => item.stage === stage).length;
  const citizenFor = (id: string) => CITIZENS.find((item) => item.id === id);
  const electedSpeaker = meeting?.speakerCitizenId ? citizenFor(meeting.speakerCitizenId) : null;
  const currentFloorCitizen = meeting?.currentFloorCitizenId ? citizenFor(meeting.currentFloorCitizenId) : null;
  const mySpeakerVote = speakerVotes.find((vote) => vote.voterCitizenId === citizen.id)?.candidateCitizenId;
  const mySpeakerCandidacy = speakerCandidates.some((candidate) => candidate.citizenId === citizen.id);
  const mySeat = seats.find((seat) => seat.citizenId === citizen.id);
  const myResultReaction = resultReactions.find((reaction) => reaction.citizenId === citizen.id)?.reaction;
  const likeReactions = resultReactions.filter((reaction) => reaction.reaction === "like");
  const dislikeReactions = resultReactions.filter((reaction) => reaction.reaction === "dislike");
  const tiedSpeakerCandidates = (() => { try { return meeting ? JSON.parse(meeting.tiedCandidateIdsJson) as string[] : []; } catch { return []; } })();
  const journeyStages: ParliamentStage[] = ["proposal", "debate", "amendment", "voting", "resolved"];
  const journeyIndex = activeItem ? journeyStages.indexOf(activeItem.stage) : -1;
  const renderMarks = (citizenIds: string[], emptyCopy = "尚无人") => citizenIds.length
    ? <div className="public-mark-list">{citizenIds.map((id) => { const member = citizenFor(id); return member ? <span key={id}><CitizenMark citizen={member} /><small>{member.username}</small></span> : null; })}</div>
    : <p className="mark-list-empty">{emptyCopy}</p>;
  const renderCommentThread = () => <div className="comment-thread">{comments.length ? comments.map((comment) => { const author = citizenFor(comment.citizenId); const meta = COMMENT_TYPE_META[comment.commentType] ?? COMMENT_TYPE_META.comment; const parent = comment.parentId ? comments.find((entry) => entry.id === comment.parentId) : null; return <article key={comment.id} className={comment.commentType === "system" ? "system-event" : ""}><div>{author ? <CitizenMark citizen={author} /> : <span className="system-mark">S</span>}</div><section><header><strong>{comment.commentType === "system" ? "议会书记席" : author?.username ?? comment.citizenId}</strong><span>{meta.cn} · {meta.en}</span><time>{new Date(comment.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></header>{parent && <small className="parent-reference">回复：{parent.body.slice(0, 80)}</small>}{comment.quoteText && <blockquote className="comment-quote">{comment.quoteText}</blockquote>}<p>{comment.body}</p>{comment.commentType !== "system" && <button className="reply-action" type="button" onClick={() => setReplyTo(comment.id)}>回复此发言</button>}</section></article>; }) : <div className="docket-empty">还没有讨论，写下第一条评论。</div>}</div>;
  const renderSeat = (side: "proposal" | "question", seatIndex: number) => {
    const seat = seats.find((entry) => entry.side === side && entry.seatIndex === seatIndex);
    const occupant = seat ? citizenFor(seat.citizenId) : null;
    const selectable = !meeting?.seatsLocked && !meeting?.debateStartedAt && meeting?.speakerCitizenId !== citizen.id && (!occupant || occupant.id === citizen.id);
    return <button type="button" key={`${side}-${seatIndex}`} className={`${seat?.citizenId === citizen.id ? "mine" : ""} ${meeting?.currentFloorCitizenId === seat?.citizenId ? "floor" : ""} ${occupant ? "occupied" : "empty"}`} disabled={busy || !selectable} onClick={() => chooseSeat(side, seatIndex)}>{occupant ? <><CitizenMark citizen={occupant} /><span><strong>{occupant.username}</strong><small>{meeting?.currentFloorCitizenId === occupant.id ? "正在发言" : `第 ${seatIndex} 席`}</small></span></> : <><b>＋</b><span><strong>选择此席</strong><small>第 {seatIndex} 席</small></span></>}</button>;
  };

  return <>
    {!workspaceOpen && <PageHead eyebrow="Parliament · 议会" title="国家议事厅" copy="每项提案都有自己的文稿、阶段、讨论线程、选票与程序记录；内容会跨设备保存。" />}

    {!workspaceOpen && <section className="parliament-stage-rail" aria-label="按议事阶段筛选">
      <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}><small>ALL</small><strong>全部</strong><b>{items.length}</b></button>
      {(Object.keys(PARLIAMENT_STAGE_META) as ParliamentStage[]).map((stage) => {
        const meta = PARLIAMENT_STAGE_META[stage];
        return <button type="button" key={stage} className={filter === stage ? "active" : ""} onClick={() => setFilter(stage)}><small>{meta.en}</small><strong>{meta.cn}</strong><b>{stageCount(stage)}</b></button>;
      })}
    </section>}

    {!workspaceOpen && <section className="parliament-toolbar streamlined">
      <div><strong>{filter === "all" ? "全部议案" : PARLIAMENT_STAGE_META[filter].cn}</strong><span>选择一项议案，进入它当前所处的场景。</span></div>
      <button className="primary" type="button" onClick={() => setCreateOpen(!createOpen)}>{createOpen ? "关闭提交区" : "提出新提案 / 法案"}<span>{createOpen ? "×" : "＋"}</span></button>
    </section>}

    {!workspaceOpen && filter === "resolved" && <nav className="resolved-shelves" aria-label="结案资料分类"><button type="button" className={resolvedShelf === "all" ? "active" : ""} onClick={() => setResolvedShelf("all")}>全部结案</button><button type="button" className={resolvedShelf === "passed" ? "active" : ""} onClick={() => setResolvedShelf("passed")}>正式法案 / 通过案</button><button type="button" className={resolvedShelf === "rejected" ? "active" : ""} onClick={() => setResolvedShelf("rejected")}>否决案</button><button type="button" className={resolvedShelf === "referendum" ? "active" : ""} onClick={() => setResolvedShelf("referendum")}>历史公投</button></nav>}

    {!workspaceOpen && createOpen && <form className="parliament-create" onSubmit={createItem}>
      <header><div><p className="eyebrow">New Submission · 新提交</p><h2>把一项想法放入提案库</h2></div><p>所有已识别公民都能提出；只有宇宙霸主能改变其正式议事阶段。</p></header>
      <div className="submission-kind"><button type="button" className={createKind === "proposal" ? "active" : ""} onClick={() => setCreateKind("proposal")}><strong>提案</strong><span>先提出问题或制度方向</span></button><button type="button" className={createKind === "bill" ? "active" : ""} onClick={() => setCreateKind("bill")}><strong>法案草案</strong><span>已经有较完整的规范文本</span></button></div>
      <div className="submission-routing">
        <label><span>议案性质</span><select value={createClassification} onChange={(event) => setCreateClassification(event.target.value as ParliamentClassification)}>{(Object.keys(CLASSIFICATION_META) as ParliamentClassification[]).filter((value) => value !== "foundational").map((value) => <option key={value} value={value}>{CLASSIFICATION_META[value]}</option>)}</select></label>
        <label><span>提案人年龄组</span><select value={createAgeBand} onChange={(event) => setCreateAgeBand(event.target.value as ProposerAgeBand)}>{(Object.keys(AGE_BAND_META) as ProposerAgeBand[]).map((value) => <option key={value} value={value}>{AGE_BAND_META[value]}</option>)}</select></label>
        <label><span>希望完成日期</span><input type="date" value={createDeadline} onChange={(event) => setCreateDeadline(event.target.value)} /></label>
        <label className="recusal-check"><input type="checkbox" checked={createRecusal} onChange={(event) => setCreateRecusal(event.target.checked)} /><span>请求 12 岁以上成员回避</span></label>
      </div>
      <label><span>标题 *</span><input value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} maxLength={140} placeholder="例如：第一帝国公民身份制度案" required /></label>
      <label><span>摘要 *</span><textarea value={createSummary} onChange={(event) => setCreateSummary(event.target.value)} maxLength={500} rows={2} placeholder="这项提案想解决什么？" required /></label>
      <label className="submission-body"><span>正文 / 条款</span><textarea value={createBody} onChange={(event) => setCreateBody(event.target.value)} maxLength={12_000} rows={7} placeholder="可以先留空，之后由宇宙霸主继续补入文稿和条款。" /></label>
      <footer><small>提交后立即进入「提案库」，不会自动成为法律。</small><button className="primary" type="submit" disabled={busy}>正式放入提案库 <span>→</span></button></footer>
    </form>}

    <section className={`parliament-library-grid ${workspaceOpen ? "workspace-open" : "overview-open"}`}>
      {!workspaceOpen && <aside className="docket-list streamlined-docket">
        <header><div><p className="eyebrow">Order Paper · 议事清单</p><h2>{filter === "all" ? "全部议案" : PARLIAMENT_STAGE_META[filter].cn}</h2></div><span>{visibleItems.length} ITEMS</span></header>
        {loading && !items.length ? <div className="docket-empty">正在打开议事记录…</div> : visibleItems.length ? visibleItems.map((item) => <article key={item.id} className={`docket-card ${activeItem?.id === item.id ? "active" : ""}`}>
          <button type="button" className="docket-open" onClick={() => openItem(item.id)}>
            <span className={`docket-kind ${item.kind}`}>{item.kind === "proposal" ? "提案" : item.kind === "bill" ? "法案" : "公投"}</span>
            <small>{item.serialCode} · {PARLIAMENT_STAGE_META[item.stage].cn}</small><strong>{item.title}</strong><p>{item.summary}</p><div className="docket-route"><span>{CLASSIFICATION_META[item.classification]}</span><span>{ROUTING_META[item.routing]}</span>{item.pendingAmendmentCount > 0 && <b>{item.pendingAmendmentCount} 项待审修正</b>}</div><footer><span>{item.commentCount} 评论</span><span>{item.voteCount} 票</span><b>v{item.version}</b></footer>
          </button>
          <button type="button" className="docket-comment-toggle" aria-expanded={quickCommentItemId === item.id} onClick={() => { setQuickCommentItemId((current) => current === item.id ? "" : item.id); setQuickCommentBody(""); }}><span>在这项{item.kind === "proposal" ? "提案" : item.kind === "bill" ? "法案" : "公投"}下评论</span><b>{quickCommentItemId === item.id ? "收起" : "＋"}</b></button>
          {quickCommentItemId === item.id && <form className="docket-quick-comment" onSubmit={(event) => addQuickComment(event, item)}><label><span>以 {citizen.codename} 身份发言</span><textarea value={quickCommentBody} onChange={(event) => setQuickCommentBody(event.target.value)} rows={3} maxLength={1_500} placeholder="写下你的意见；评论会留在这一条议案下面。" autoFocus required /></label><footer><small>公开在该议案讨论记录中</small><button type="submit" disabled={busy || !quickCommentBody.trim()}>提交评论 →</button></footer></form>}
        </article>) : <div className="docket-empty">这个阶段还没有议案。</div>}
      </aside>}

      {workspaceOpen && <section className={`parliament-document parliament-case stage-${activeItem?.stage ?? "proposal"}`}>
        {!activeItem ? <div className="docket-empty large">选择一项议案，或先提出第一项新提案。</div> : <>
          <nav className="casebar" aria-label="议案工作区导航"><button type="button" onClick={() => { setWorkspaceOpen(false); setCreateOpen(false); }}>← 返回议案清单</button><span>{activeItem.serialCode}</span><small>当前阶段 · {PARLIAMENT_STAGE_META[activeItem.stage].cn}</small></nav>
          <ol className="case-journey" aria-label="议案办理进度">
            {journeyStages.map((stage, index) => <li key={stage} className={`${activeItem.stage === stage ? "current" : ""} ${journeyIndex > index || activeItem.stage === "resolved" ? "complete" : ""} ${journeyIndex >= 0 && index > journeyIndex ? "future" : ""}`}><i>{journeyIndex > index || activeItem.stage === "resolved" ? "✓" : index + 1}</i><span>{PARLIAMENT_STAGE_META[stage].cn}</span></li>)}
            {activeItem.stage === "deferred" && <li className="current deferred"><i>Ⅱ</i><span>搁置</span></li>}
          </ol>
          <header className="document-head"><div><span>{activeItem.serialCode}</span><i>{activeItem.kind === "proposal" ? "PROPOSAL" : activeItem.kind === "bill" ? "BILL" : "REFERENDUM"}</i></div><b className={`stage-badge ${activeItem.stage}`}>{PARLIAMENT_STAGE_META[activeItem.stage].cn}</b></header>
          <div className="document-title"><small>VERSION {activeItem.version} · 提案人 {citizenFor(activeItem.createdByCitizenId)?.username ?? activeItem.createdByCitizenId}</small><h2>{activeItem.title}</h2><p>{activeItem.summary}</p></div>
          <nav className="case-panel-nav" aria-label="议案内容切换"><button type="button" className={casePanel === "stage" ? "active" : ""} onClick={() => setCasePanel("stage")}>当前阶段</button><button type="button" className={casePanel === "text" ? "active" : ""} onClick={() => setCasePanel("text")}>议案全文</button><button type="button" className={casePanel === "procedure" ? "active" : ""} onClick={() => setCasePanel("procedure")}>程序管理</button><button type="button" className={casePanel === "history" ? "active" : ""} onClick={() => setCasePanel("history")}>历史记录</button></nav>

          {casePanel === "procedure" && <section className="procedure-dossier">
            <header><div><p className="eyebrow">Admissibility · 受理与分流</p><h3>这项议案走哪条程序</h3></div><span>{activeItem.routing === "pending_review" ? "REVIEW NEEDED" : "ROUTE RECORDED"}</span></header>
            <div className="procedure-facts"><article><small>议案性质</small><strong>{CLASSIFICATION_META[activeItem.classification]}</strong></article><article><small>程序路线</small><strong>{ROUTING_META[activeItem.routing]}</strong></article><article><small>提案人年龄组</small><strong>{AGE_BAND_META[activeItem.proposerAgeBand]}</strong></article><article><small>回避请求 / 期限</small><strong>{activeItem.recusalRequested ? "已请求 12+ 回避" : "未请求回避"}{activeItem.deadline ? ` · ${activeItem.deadline}` : ""}</strong></article></div>
            {session.stageManager ? <div className="classification-control"><label><span>分类</span><select value={classificationTarget} onChange={(event) => setClassificationTarget(event.target.value as ParliamentClassification)}>{(Object.keys(CLASSIFICATION_META) as ParliamentClassification[]).filter((value) => value !== "foundational" || activeItem.classification === "foundational").map((value) => <option key={value} value={value}>{CLASSIFICATION_META[value]}</option>)}</select></label><label><span>路线</span><select value={routingTarget} onChange={(event) => setRoutingTarget(event.target.value as ParliamentRouting)}>{(Object.keys(ROUTING_META) as ParliamentRouting[]).map((value) => <option key={value} value={value}>{ROUTING_META[value]}</option>)}</select></label><label><span>年龄组</span><select value={ageBandTarget} onChange={(event) => setAgeBandTarget(event.target.value as ProposerAgeBand)}>{(Object.keys(AGE_BAND_META) as ProposerAgeBand[]).map((value) => <option key={value} value={value}>{AGE_BAND_META[value]}</option>)}</select></label><label><span>期限</span><input type="date" value={deadlineTarget} onChange={(event) => setDeadlineTarget(event.target.value)} /></label><label className="recusal-check"><input type="checkbox" checked={recusalTarget} onChange={(event) => setRecusalTarget(event.target.checked)} /><span>记录 12+ 回避请求</span></label><label className="classification-reason"><span>确认理由 *</span><input value={classificationReason} onChange={(event) => setClassificationReason(event.target.value)} maxLength={500} placeholder="例如：涉及国家基本结构，进入宪制双重审查" /></label><button type="button" onClick={classifyItem} disabled={busy}>确认分流</button></div> : <p className="procedure-note">任何公民都可在议场提出“分流异议”；只有你的个人最高领导人账号能正式确认或更改路线。</p>}
          </section>}
          {(casePanel === "text" || (casePanel === "stage" && activeItem.stage === "proposal")) && <article className="document-body focused-document"><header><span>议案正文 · TEXT</span>{session.stageManager && casePanel === "text" && <button type="button" onClick={() => setEditOpen(!editOpen)}>{editOpen ? "关闭编辑" : "编辑正式文稿"}</button>}</header><p>{activeItem.body}</p></article>}

          {casePanel === "text" && editOpen && session.stageManager && <form className="document-editor" onSubmit={updateItem}><label><span>标题</span><input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={140} /></label><label><span>摘要</span><textarea value={editSummary} onChange={(event) => setEditSummary(event.target.value)} rows={3} maxLength={500} /></label><label><span>正文与条款</span><textarea value={editBody} onChange={(event) => setEditBody(event.target.value)} rows={10} maxLength={12_000} /></label><button className="primary" type="submit" disabled={busy}>保存新版本 <span>→</span></button></form>}

          {casePanel === "procedure" && <section className={`stage-manager ${session.stageManager ? "authorised" : "restricted"}`}>
            <header><div><p className="eyebrow">Stage Control · 阶段控制</p><h3>{session.stageManager ? "宇宙霸主专属程序权限" : "阶段切换由最高领导人管理"}</h3></div><span>{session.stageManager ? "AUTHORISED" : "VIEW ONLY"}</span></header>
            {session.stageManager ? <><div className="stage-prerequisites"><span className={activeItem.routing !== "pending_review" ? "ready" : "blocked"}>{activeItem.routing !== "pending_review" ? "✓ 分流已确认" : "! 分流待确认"}</span><span className={activeItem.pendingAmendmentCount === 0 ? "ready" : "blocked"}>{activeItem.pendingAmendmentCount === 0 ? "✓ 无待审修正" : `! ${activeItem.pendingAmendmentCount} 项修正待审`}</span><span className={activeItem.body.length > 12 ? "ready" : "blocked"}>{activeItem.body.length > 12 ? "✓ 正文已存在" : "! 正文未完成"}</span></div><div className="stage-control-row"><label><span>将议案置于</span><select value={stageTarget} onChange={(event) => setStageTarget(event.target.value as ParliamentStage)}>{(Object.keys(PARLIAMENT_STAGE_META) as ParliamentStage[]).map((stage) => <option key={stage} value={stage}>{PARLIAMENT_STAGE_META[stage].cn}</option>)}</select></label>{stageTarget === "resolved" && <label><span>结案结果</span><select value={finalOutcome} onChange={(event) => setFinalOutcome(event.target.value)}><option value="pending">按冻结版本票数自动判定</option><option value="passed">最高领导人裁决：通过</option><option value="rejected">最高领导人裁决：未通过</option></select></label>}<label className="stage-reason"><span>阶段变化理由 *</span><input value={stageReason} onChange={(event) => setStageReason(event.target.value)} maxLength={500} placeholder="理由会进入永久审计记录" /></label><button type="button" onClick={transitionStage} disabled={busy || stageReason.trim().length < 4 || (stageTarget === activeItem.stage && stageTarget !== "resolved")}>确认切换阶段</button></div></> : <p>{citizen.id === "amberina" ? <>你的内部身份是宇宙霸主，但当前浏览器尚未完成最高领导人身份验证。<a href="/signin-with-chatgpt?return_to=%2F">验证身份后启用阶段控制</a></> : "你可以评论、提出修正并在投票阶段表决，但不能改变议案所处阶段。"}</p>}
          </section>}

          {casePanel === "stage" && activeItem.stage === "proposal" && <section className="async-proposal-discussion">
            <header><div><p className="eyebrow">Asynchronous Deliberation · 异步沟通</p><h3>引用条文，在提案下继续讨论</h3></div><span>{comments.filter((comment) => comment.commentType !== "system").length} COMMENTS</span></header>
            <form className="comment-composer" onSubmit={addComment}>{replyTo && <div className="replying-to"><span>正在回复：{comments.find((comment) => comment.id === replyTo)?.body.slice(0, 60)}</span><button type="button" onClick={() => setReplyTo("")}>取消</button></div>}<label className="quote-field"><span>引用当前正文（可选，必须逐字一致）</span><textarea value={commentQuote} onChange={(event) => setCommentQuote(event.target.value)} maxLength={1_500} rows={2} placeholder="粘贴你正在评论的具体条文" /></label><textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} maxLength={1_500} rows={4} placeholder={`以“${citizen.codename}”身份写下评论…`} required /><footer><small>提案阶段不进入实时议场；评论和引用可以异步完成。</small><button className="primary" type="submit" disabled={busy}>提交评论 <span>→</span></button></footer></form>
            {renderCommentThread()}
          </section>}

          {casePanel === "stage" && session.speakerManager && ["proposal", "deferred", "debate", "amendment"].includes(activeItem.stage) && <SpeakerManagement key={activeItem.id} meeting={meeting} stage={activeItem.stage} busy={busy} onAction={(payload, success) => sendAction({ ...payload, itemId: activeItem.id }, success)} />}

          {casePanel === "stage" && ["debate", "amendment"].includes(activeItem.stage) && <section className={`meeting-workspace ${meeting?.speakerStatus === "elected" ? "chamber-ready" : ""} ${meeting?.debateStartedAt ? "session-live" : ""}`}>
            <header><div><p className="eyebrow">The Chamber · 实时议场</p><h3>{meeting?.debateStartedAt ? "面对面辩论正在进行" : "议长选举与议场就座"}</h3></div><span>{meeting?.debateStartedAt ? "CHAMBER LIVE" : "BEFORE DEBATE"}</span></header>

            {(!meeting || meeting.speakerStatus === "not_configured") && <div className="speaker-election-empty"><p>本次议场尚未开放议长选举。三位委员可以在议长管理中开放选举，或直接指定本次会议议长。原有讨论和正式发言会保留。</p></div>}

            {meeting?.speakerStatus === "open" && <section className="speaker-election">
              <header><div><small>SPEAKER ELECTION · 实时公开</small><strong>截止 {new Date(meeting.speakerElectionDeadline).toLocaleString("zh-CN")}</strong></div><button type="button" onClick={standForSpeaker} disabled={busy || mySpeakerCandidacy}>{mySpeakerCandidacy ? "你已参选" : "参选本次议长"}</button></header>
              <div className="speaker-candidate-grid">{speakerCandidates.length ? speakerCandidates.map((candidate) => { const candidateCitizen = citizenFor(candidate.citizenId); const candidateVotes = speakerVotes.filter((vote) => vote.candidateCitizenId === candidate.citizenId); return <article key={candidate.id} className={mySpeakerVote === candidate.citizenId ? "selected" : ""}><div>{candidateCitizen && <CitizenMark citizen={candidateCitizen} />}<span><small>CANDIDATE</small><strong>{candidateCitizen?.username ?? candidate.citizenId}</strong></span><b>{candidateVotes.length}</b></div>{renderMarks(candidateVotes.map((vote) => vote.voterCitizenId), "等待第一票")}<button type="button" onClick={() => castSpeakerVote(candidate.citizenId)} disabled={busy}>{mySpeakerVote === candidate.citizenId ? "已投给此人" : "公开投票"}</button></article>; }) : <p className="docket-empty">暂时还没有人参选本次会议议长。</p>}</div>
            </section>}

            {meeting?.speakerStatus === "tie_pending" && <section className="speaker-tie"><span>{tiedSpeakerCandidates.length ? "议长选举平票" : "本次选举无人参选"}</span><h3>{tiedSpeakerCandidates.length ? "等待委员裁决" : "等待重新开放选举或直接指定议长"}</h3><p>原始票数与投票者保持公开，不会被裁决覆盖。</p>{session.speakerManager && tiedSpeakerCandidates.length > 0 && <div>{tiedSpeakerCandidates.map((candidateId) => <button type="button" key={candidateId} onClick={() => resolveSpeakerTie(candidateId)} disabled={busy}>裁决由 {citizenFor(candidateId)?.username ?? candidateId} 担任议长</button>)}</div>}</section>}

            {meeting?.speakerStatus === "elected" && <>
              <div className={`schicksal-chamber ${meeting.debateStartedAt ? "live" : "seating"}`}>
                <section className="chamber-side proposal-side"><header><small>PROPOSING BENCH</small><strong>提案方</strong></header><div>{[1,2,3,4].map((index) => renderSeat("proposal", index))}</div></section>
                <section className="chamber-centre"><article><small>本次会议议长 · SPEAKER</small>{electedSpeaker && <CitizenMark citizen={electedSpeaker} />}<strong>{electedSpeaker?.username ?? meeting.speakerCitizenId}</strong><span>{meeting.debateStartedAt ? "议长权限已生效" : "等待成员就座"}</span></article><div className="dispatch-box"><small>ORDER PAPER</small><b>{activeItem.serialCode}</b><span>{meeting.debateStartedAt ? `当前发言：${currentFloorCitizen?.username ?? "等待议长点名"}` : "席位将在开会时锁定"}</span></div></section>
                <section className="chamber-side question-side"><header><small>QUESTIONING BENCH</small><strong>质询方</strong></header><div>{[1,2,3,4].map((index) => renderSeat("question", index))}</div></section>
              </div>
              {!meeting.debateStartedAt && <div className="seating-status"><span>{session.meetingSpeaker ? "你是本次会议议长；确认成员就座后即可宣布开会。" : meeting.speakerCitizenId === citizen.id ? "你已经当选本次会议议长。" : mySeat ? `你已选择${mySeat.side === "proposal" ? "提案方" : "质询方"}第 ${mySeat.seatIndex} 席。` : "请选择提案方或质询方的一个空席。"}</span>{session.meetingSpeaker && <button type="button" onClick={startDebateSession} disabled={busy}>宣布开会并锁定席位</button>}</div>}

              {meeting.debateStartedAt && <section className="live-floor">
                <header><div><p className="eyebrow">Live Floor · 议场程序</p><h3>{currentFloorCitizen ? `${currentFloorCitizen.username} 正在发言` : "等待议长准许发言"}</h3></div><span>{session.meetingSpeaker ? "SPEAKER CONTROL" : "MEMBER ACTIONS"}</span></header>
                {!session.meetingSpeaker && <><div className="floor-request-actions"><button type="button" onClick={() => sendAction({ action: "add_comment", itemId: activeItem.id, commentType: "reaction", body: "说得好！" }, "“说得好！”已经进入议场记录。")}>说得好！<small>HEAR, HEAR</small></button><button type="button" onClick={() => requestFloor("speech")}>请求发言<small>TAKE THE FLOOR</small></button><button type="button" onClick={() => requestFloor("give_way")}>请求插话<small>GIVE WAY</small></button><button type="button" onClick={() => requestFloor("point_order")}>程序问题<small>POINT OF ORDER</small></button></div><label className="floor-request-note"><span>给议长的简短说明（可选）</span><input value={floorRequestBody} onChange={(event) => setFloorRequestBody(event.target.value)} maxLength={500} placeholder="例如：我想回应第二条" /></label></>}
                {session.meetingSpeaker && <div className="speaker-console"><h4>待处理请求</h4>{floorRequests.filter((request) => request.status === "pending").length ? floorRequests.filter((request) => request.status === "pending").map((request) => <article key={request.id}><div>{citizenFor(request.citizenId) && <CitizenMark citizen={citizenFor(request.citizenId)!} />}<span><strong>{citizenFor(request.citizenId)?.username ?? request.citizenId}</strong><small>{request.requestType === "speech" ? "请求发言" : request.requestType === "give_way" ? "请求插话" : "程序问题"}{request.body ? ` · ${request.body}` : ""}</small></span></div><footer><button type="button" onClick={() => decideFloorRequest(request.id, "rejected")}>拒绝</button><button type="button" onClick={() => decideFloorRequest(request.id, "accepted")}>接受</button></footer></article>) : <p>当前没有等待处理的议场请求。</p>}</div>}
                {meeting.currentFloorCitizenId === citizen.id && <form className="comment-composer floor-speech-composer" onSubmit={addFloorSpeech}><header><span>ON THE FLOOR</span><strong>你已获得正式发言权</strong></header><label className="quote-field"><span>引用当前正文（可选）</span><textarea value={commentQuote} onChange={(event) => setCommentQuote(event.target.value)} maxLength={1_500} rows={2} /></label><textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} maxLength={1_500} rows={4} placeholder="写下你的正式发言…" required /><footer><small>提交后进入本次会议正式记录。</small><button className="primary" type="submit" disabled={busy}>发表正式发言 <span>→</span></button></footer></form>}
                <div className="chamber-record"><button type="button" aria-expanded={liveRecordOpen} onClick={() => setLiveRecordOpen(!liveRecordOpen)}><span>会议发言记录</span><small>{comments.filter((comment) => comment.commentType !== "system").length} 条 · {liveRecordOpen ? "收起" : "展开"}</small></button>{liveRecordOpen && renderCommentThread()}</div>
              </section>}
            </>}
          </section>}

          {casePanel === "stage" && activeItem.stage === "amendment" && meeting?.debateStartedAt && <section className="amendment-center">
            <header><div><p className="eyebrow">Amendment Centre · 修正中心</p><h3>议场保留在场，逐字提出正式修正</h3></div><button type="button" onClick={() => setAmendmentOpen(!amendmentOpen)}>{amendmentOpen ? "关闭" : "提出正式修正案"}</button></header>
            {amendmentOpen && <form className="amendment-form" onSubmit={submitAmendment}><label><span>当前正文中的原文 *</span><textarea value={amendmentQuote} onChange={(event) => setAmendmentQuote(event.target.value)} rows={3} maxLength={2_000} placeholder="逐字粘贴你想修改的一段当前正文" required /></label><label><span>建议替换为 *</span><textarea value={amendmentText} onChange={(event) => setAmendmentText(event.target.value)} rows={3} maxLength={4_000} placeholder="写出完整的新文本" required /></label><label><span>修正理由 *</span><textarea value={amendmentReason} onChange={(event) => setAmendmentReason(event.target.value)} rows={2} maxLength={1_000} placeholder="为什么这样修改？" required /></label><footer><small>系统会验证原文来自当前版本；接受后自动生成新版本。</small><button className="primary" type="submit" disabled={busy}>提交修正案 <span>→</span></button></footer></form>}
            <div className="amendment-list">{amendments.length ? amendments.map((amendment) => { const author = citizenFor(amendment.citizenId); return <article key={amendment.id} className={amendment.status}><header><div><strong>{author?.username ?? amendment.citizenId}</strong><time>{new Date(amendment.createdAt).toLocaleDateString("zh-CN")}</time></div><span>{amendment.status === "pending" ? "等待决定" : amendment.status === "accepted" ? "已接受" : "已否决"}</span></header><div className="amendment-diff"><blockquote><small>删除 / 原文</small><del>{amendment.targetQuote}</del></blockquote><blockquote><small>新增 / 建议</small><ins>{amendment.proposedText}</ins></blockquote></div><p><b>理由</b>{amendment.reason}</p>{session.stageManager && amendment.status === "pending" && <footer><button type="button" onClick={() => decideAmendment(amendment.id, "rejected")} disabled={busy}>否决并留档</button><button type="button" onClick={() => decideAmendment(amendment.id, "accepted")} disabled={busy}>接受并生成新版本</button></footer>}</article>; }) : <div className="docket-empty">暂无正式修正案。</div>}</div>
          </section>}

          {casePanel === "stage" && activeItem.stage === "voting" && <section className="division-public">
            <header><div><p className="eyebrow">Division · 正式表决</p><h3>选择后，个人标志实时公开</h3></div><span>FROZEN TEXT · v{activeItem.votingVersion}</span></header>
            <div className="division-public-grid">
              <article className={myVote === "support" ? "chosen support" : ""}><header><small>AYE</small><strong>赞成 · {support}</strong></header>{renderMarks(currentVotes.filter((vote) => vote.choice === "support").map((vote) => vote.citizenId))}<button type="button" onClick={() => castVote("support")} disabled={busy}>投赞成票</button></article>
              <article className={myVote === "oppose" ? "chosen oppose" : ""}><header><small>NO</small><strong>反对 · {oppose}</strong></header>{renderMarks(currentVotes.filter((vote) => vote.choice === "oppose").map((vote) => vote.citizenId))}<button type="button" onClick={() => castVote("oppose")} disabled={busy}>投反对票</button></article>
              <article className={myVote === "abstain" ? "chosen abstain" : ""}><header><small>ABSTAIN</small><strong>弃权 · {abstain}</strong></header>{renderMarks(currentVotes.filter((vote) => vote.choice === "abstain").map((vote) => vote.citizenId))}<button type="button" onClick={() => castVote("abstain")} disabled={busy}>投弃权票</button></article>
            </div>
            <footer><strong>{resultText}</strong><span>{myVote ? "投票开放期间可以改票，个人标志会移动到新选项。" : "每个账号一票；所有投票者与当前票数实时公开。"}</span><small>平票时不改写原票数，交由最高领导人另行裁决。</small></footer>
          </section>}

          {casePanel === "stage" && activeItem.stage === "resolved" && <section className="result-proclamation">
            <header><div><p className="eyebrow">Certified Result · 正式结果</p><h3>{activeItem.outcome === "passed" ? "议案已经通过" : activeItem.outcome === "rejected" ? "议案未获通过" : "等待最高领导人裁决"}</h3></div><span>{activeItem.outcome.toUpperCase()}</span></header>
            <div className="result-vote-record"><article><small>赞成</small><strong>{support}</strong>{renderMarks(currentVotes.filter((vote) => vote.choice === "support").map((vote) => vote.citizenId))}</article><article><small>反对</small><strong>{oppose}</strong>{renderMarks(currentVotes.filter((vote) => vote.choice === "oppose").map((vote) => vote.citizenId))}</article><article><small>弃权</small><strong>{abstain}</strong>{renderMarks(currentVotes.filter((vote) => vote.choice === "abstain").map((vote) => vote.citizenId))}</article></div>
            <div className="result-feedback"><header><div><small>PUBLIC RESPONSE · 结果态度</small><strong>不影响正式法律效力</strong></div><div><button type="button" className={myResultReaction === "like" ? "active" : ""} onClick={() => setResultReaction("like")}>赞 · {likeReactions.length}</button><button type="button" className={myResultReaction === "dislike" ? "active" : ""} onClick={() => setResultReaction("dislike")}>踩 · {dislikeReactions.length}</button></div></header><div><section><small>点赞</small>{renderMarks(likeReactions.map((reaction) => reaction.citizenId))}</section><section><small>点踩</small>{renderMarks(dislikeReactions.map((reaction) => reaction.citizenId))}</section></div></div>
            <form className="comment-composer result-comment-composer" onSubmit={addResultComment}>{replyTo && <div className="replying-to"><span>正在回复：{comments.find((comment) => comment.id === replyTo)?.body.slice(0, 60)}</span><button type="button" onClick={() => setReplyTo("")}>取消</button></div>}<textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} maxLength={1_500} rows={3} placeholder="在正式结果下发表评论…" required /><footer><small>评论属于结果公布后的公共讨论；如需改变结果，应另行提出复议案。</small><button className="primary" type="submit" disabled={busy}>发布结果评论 <span>→</span></button></footer></form>
            {renderCommentThread()}
          </section>}

          {casePanel === "stage" && activeItem.stage === "deferred" && <section className="deferred-notice"><small>DEFERRED PROPOSAL</small><h3>本案目前处于搁置状态</h3><p>正文、评论、修正和历史记录均继续保存；恢复审议时不会丢失原程序。</p></section>}

          {casePanel === "history" && <section className="audit-log"><header><div><p className="eyebrow">Audit Trail · 程序审计</p><h3>不可静默改写的议事历史</h3></div><span>{auditEvents.length} EVENTS</span></header><div>{auditEvents.length ? auditEvents.map((event) => <article key={event.id}><i /><section><strong>{event.description}</strong><p>{citizenFor(event.actorCitizenId)?.username ?? event.actorCitizenId} · {event.eventType}</p></section><time>{new Date(event.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></article>) : <p className="docket-empty">旧议案尚无结构化审计事件；新的提交、分流、修正和阶段变化都会写入这里。</p>}</div></section>}
        </>}
      </section>}
    </section>
    <p className={`parliament-status ${status ? "visible" : ""}`} role="status">{status || "议会系统在线：提案、评论、阶段与选票均会保存。"}</p>
  </>;
}

function HonorsSection() {
  const rows = [["宇宙霸主","Amberina von Schicksal","128","#f3c969"],["怪盗 基德","Citizen 04","114","#65cae9"],["我说 真的","Citizen 03","98","#eecf58"],["哈利 波特","Citizen 05","82","#a99ce6"]];
  return <><PageHead eyebrow="Honors & Scoreboard" title="荣誉与积分" copy="每一次得分都有原因，每一次荣耀都有可审计的来处。" /><div className="honors"><div className="leaderboard">{rows.map(([code,name,points,color],index) => <article key={code} style={{ "--citizen": color } as CSSProperties}><span>0{index + 1}</span><i /><div><h2>{code}</h2><p>{name}</p></div><b>{points}<small>PTS</small></b></article>)}</div><article className="ribbon"><p>IMPERIAL DISTINCTION</p><h2>BLUE<br />RIBBON</h2><div>S</div><small>年度最高荣誉 · 可作为实体在跳蚤市场流通</small></article></div><p className="note">积分为视觉 Demo 数据；正式规则与 Blue Ribbon 权利尚待确认。</p></>;
}

function CalendarSection() {
  const events = [["04·19","National Day","国庆日","竞赛 · Puzzle Hunt · Blue Ribbon · 跳蚤市场"],["08·15","Restoration Day","复辟纪念日（名称待定）","13:43 公投以 2/3 通过，第一帝国正式复辟"],["TBD","Yogurt Festival","酸奶节","因为大家喜欢喝酸奶，所以大喝特喝"],["TBD","Fire Festival","打火节","真火 · 细生日蜡烛 · 轮流许愿"]];
  return <><PageHead eyebrow="State Calendar" title="国家节日" copy="传统可以庄重，也可以忠实保留它最初荒唐而快乐的理由。" /><div className="events">{events.map(([date,en,cn,copy],index) => <article key={en}><span>0{index + 1}</span><time>{date}</time><div><small>{en}</small><h2>{cn}</h2></div><p>{copy}</p><i>↗</i></article>)}</div></>;
}

function MarketSection() {
  const goods = [["01","National Day Coin","第一帝国国庆纪念币","交换条件 · 一杯酸奶"],["02","Blue Ribbon","2026 年度实物绶带","仅转移实物所有权"],["03","Archive Print","《宪法草案 1.0》复刻件","12 Imperial Points"]];
  return <><PageHead eyebrow="Grand Flea Market" title="天命大跳蚤市场" copy="实物可以换主人，但荣誉的历史归属不会被出售。" /><div className="market">{goods.map(([n,en,cn,price]) => <article key={n}><div className="object"><span>{n}</span><i>S</i></div><small>{en}</small><h2>{cn}</h2><footer><span>{price}</span><button type="button">查看物品 →</button></footer></article>)}</div><p className="note">货币与交换规则仍处于 TODO；当前条目仅展示未来的信息层级。</p></>;
}

const PHOTO_SUBJECTS = [{ id: "empire", username: "天命全体照", name: "Schicksal Group", accent: "#d6ad56", markColor: "#d6ad56", motif: "empire", office: "Group Archive", codename: "天命" }, ...CITIZENS] as Citizen[];

function PhotoSubjectMark({ subject }: { subject: Citizen }) {
  if (subject.id === "empire") return <span className="archive-emblem" aria-hidden="true"><Emblem compact /></span>;
  return <CitizenMark citizen={subject} />;
}

function PhotoArchiveSection({ citizen }: { citizen: Citizen }) {
  const [photos, setPhotos] = useState<ArchivePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubjects, setFilterSubjects] = useState<string[]>([]);
  const [uploadSubjects, setUploadSubjects] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [title, setTitle] = useState("");
  const [era, setEra] = useState("");
  const [capturedAt, setCapturedAt] = useState("");
  const [description, setDescription] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/photos")
      .then(async (response) => {
        const body = await response.json() as { photos?: ArchivePhoto[]; error?: string };
        if (!response.ok) throw new Error(body.error || "影像馆暂时无法读取。");
        if (active) setPhotos(body.photos ?? []);
      })
      .catch((error: unknown) => { if (active) setStatus(error instanceof Error ? error.message : "影像馆暂时无法读取。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const normalisedKey = (ids: string[]) => ids.includes("empire") ? "empire" : [...ids].sort().join("+");
  const activeFilterKey = normalisedKey(filterSubjects);
  const visiblePhotos = activeFilterKey ? photos.filter((photo) => photo.subjectKey === activeFilterKey) : photos;

  const toggleChoice = (id: string, update: Dispatch<SetStateAction<string[]>>) => {
    update((current) => {
      if (id === "empire") return current.includes("empire") ? [] : ["empire"];
      const withoutEmpire = current.filter((item) => item !== "empire");
      return withoutEmpire.includes(id) ? withoutEmpire.filter((item) => item !== id) : [...withoutEmpire, id];
    });
  };

  const chooseFile = (next: File | null) => {
    setStatus("");
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(next.type)) {
      setStatus("请选择 JPG、PNG、WEBP 或 GIF 照片。");
      return;
    }
    if (next.size > 12 * 1024 * 1024) {
      setStatus("单张照片不能超过 12 MB。");
      return;
    }
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    if (!title) setTitle(next.name.replace(/\.[^.]+$/, ""));
  };

  const dropFile = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !title.trim() || !uploadSubjects.length) {
      setStatus("请完成照片、标题和人物标志三项必填内容。");
      return;
    }
    setUploading(true);
    setStatus("正在将照片收入影像馆…");
    try {
      const fileBytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < fileBytes.length; offset += 32_768) {
        binary += String.fromCharCode(...fileBytes.subarray(offset, offset + 32_768));
      }
      const dataBase64 = btoa(binary);
      const response = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataBase64,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          title,
          era,
          capturedAt,
          description,
          subjects: uploadSubjects,
          uploaderCitizenId: citizen.id,
        }),
      });
      const body = await response.json() as { photo?: ArchivePhoto; error?: string };
      if (!response.ok || !body.photo) throw new Error(body.error || "照片上传失败。");
      setPhotos((current) => [body.photo!, ...current]);
      setFilterSubjects([...uploadSubjects]);
      setFile(null);
      setPreviewUrl("");
      setTitle("");
      setEra("");
      setCapturedAt("");
      setDescription("");
      setUploadSubjects([]);
      setStatus("照片已安全收入影像馆，并按所选标志完成分类。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "照片上传失败，请稍后重试。");
    } finally {
      setUploading(false);
    }
  };

  const subjectFor = (id: string) => PHOTO_SUBJECTS.find((item) => item.id === id);
  const filterLabel = filterSubjects.length
    ? filterSubjects.map((id) => subjectFor(id)?.username ?? id).join(" + ")
    : "全部照片";

  return <>
    <PageHead eyebrow="Family Photo Archive" title="家庭影像馆" copy="上传共同记忆，并用个人标志标注照片中恰好出现的人；筛选采用精确人物组合，而不是模糊包含。" />
    <section className="photo-filters" aria-labelledby="photo-filter-title">
      <header><div><p className="eyebrow">Exact Combination</p><h2 id="photo-filter-title">标志筛选</h2></div><button type="button" onClick={() => setFilterSubjects([])} disabled={!filterSubjects.length}>查看全部 · CLEAR</button></header>
      <div className="mark-filter-row" role="group" aria-label="按人物标志筛选照片">
        {PHOTO_SUBJECTS.map((subject) => <button type="button" key={subject.id} className={filterSubjects.includes(subject.id) ? "selected" : ""} aria-pressed={filterSubjects.includes(subject.id)} onClick={() => toggleChoice(subject.id, setFilterSubjects)} style={{ "--citizen": subject.accent } as CSSProperties}><PhotoSubjectMark subject={subject} /><span><strong>{subject.username}</strong><small>{subject.id === "empire" ? "全体合照" : subject.locked ? "身份待补" : "精确人物标签"}</small></span></button>)}
      </div>
      <p>当前分类：<strong>{filterLabel}</strong><span>{filterSubjects.length ? "只显示人物组合完全一致的照片" : "显示影像馆中的全部照片"}</span></p>
    </section>
    <div className="photo-workbench">
      <aside className="photo-uploader">
        <header><span>NEW ARCHIVE ENTRY</span><b>UPLOAD</b></header>
        <h2>上传一张照片</h2>
        <p>原图会被保存，人物标志用于之后的精确筛选。</p>
        <form onSubmit={submit}>
          <label className={`photo-dropzone ${dragging ? "dragging" : ""} ${previewUrl ? "has-photo" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={dropFile}>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
            {previewUrl ? <><Image src={previewUrl} alt="待上传照片预览" fill unoptimized /><span className="replace-photo">点击更换照片</span></> : <><span className="upload-glyph">＋</span><strong>选择或拖放照片</strong><small>JPG · PNG · WEBP · GIF / MAX 12 MB</small></>}
          </label>
          <label className="archive-field"><span>照片标题 *</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="例如：第一次国庆合照" required /></label>
          <div className="archive-field-pair">
            <label className="archive-field"><span>拍摄日期</span><input type="date" value={capturedAt} onChange={(event) => setCapturedAt(event.target.value)} /></label>
            <label className="archive-field"><span>年份 / 时期</span><input value={era} onChange={(event) => setEra(event.target.value)} maxLength={80} placeholder="例如：六人时期" /></label>
          </div>
          <label className="archive-field"><span>照片说明</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={800} rows={3} placeholder="这张照片发生了什么？由谁提供？" /></label>
          <fieldset className="upload-subjects"><legend>照片中恰好有哪些人 *</legend><p>若是当时全体成员的合照，请只选“天命全体照”。</p><div>{PHOTO_SUBJECTS.map((subject) => <button type="button" key={subject.id} className={uploadSubjects.includes(subject.id) ? "selected" : ""} aria-pressed={uploadSubjects.includes(subject.id)} onClick={() => toggleChoice(subject.id, setUploadSubjects)} title={subject.username} style={{ "--citizen": subject.accent } as CSSProperties}><PhotoSubjectMark subject={subject} /><span>{subject.id === "empire" ? "天命" : subject.username}</span></button>)}</div></fieldset>
          <button className="primary archive-submit" type="submit" disabled={uploading}>{uploading ? "ARCHIVING…" : "收入影像馆"}<span>→</span></button>
          <p className="upload-status" role="status">{status || "上传后会自动切换到对应的标志分类。"}</p>
        </form>
      </aside>
      <section className="photo-gallery" aria-live="polite">
        <header><div><p className="eyebrow">Selected Collection</p><h2>{filterLabel}</h2></div><span>{visiblePhotos.length} / {photos.length} PHOTOS</span></header>
        {loading ? <div className="gallery-empty loading"><i /><h3>正在打开影像馆</h3><p>读取已保存的照片与分类信息…</p></div> : visiblePhotos.length === 0 ? <div className="gallery-empty"><span>S</span><h3>{photos.length ? "这个精确组合还没有照片" : "影像馆正在等待第一张照片"}</h3><p>{photos.length ? "可以更换上方标志组合，或上传一张属于这个组合的照片。" : "从左侧上传一张共同记忆，并为它选择人物标志。"}</p></div> : <div className="photo-grid">{visiblePhotos.map((photo) => <article className="photo-card" key={photo.id}>
          <figure><Image src={photo.imageUrl} alt={photo.title} fill sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 32vw" /><figcaption>{photo.capturedAt || photo.era || "日期待补"}</figcaption></figure>
          <div className="photo-card-copy"><div className="photo-card-marks">{photo.subjects.map((id) => { const subject = subjectFor(id); return subject ? <span key={id} title={subject.username}><PhotoSubjectMark subject={subject} /></span> : null; })}</div><h3>{photo.title}</h3>{photo.description ? <p>{photo.description}</p> : <p className="muted">尚未填写照片说明。</p>}<footer><span>{photo.era || "时期待补"}</span><span>UPLOADED BY {subjectFor(photo.uploaderCitizenId)?.username ?? "CITIZEN"}</span></footer></div>
        </article>)}</div>}
      </section>
    </div>
    <p className="photo-privacy-note"><strong>PRIVACY NOTE</strong> 当前影像馆继承网站现有访问范围；正式开放给全部成员或长辈前，应继续确认照片当事人同意、查看范围与撤回机制。</p>
  </>;
}

type ArchiveChapter = { id: string; lesson: string; title: string; source: string; version: string; note: string };

const ARCHIVE_BOOK_CHAPTERS: ArchiveChapter[] = [
  { id: "lesson-1", lesson: "LESSON 1 · 第一课", title: "我们究竟在建立什么？", source: "/archives/how-to-build-a-state-lesson-1.md", version: "v1.1", note: "国家、领土、政府、行政权、宪法与主权" },
  { id: "lesson-2-a", lesson: "LESSON 2 · 第二课上", title: "谁是“我们的人”，谁又有权决定什么？", source: "/archives/how-to-build-a-state-lesson-2-a.md", version: "v1.1", note: "公民身份、年龄政治权利与低龄自治" },
  { id: "lesson-2-b", lesson: "LESSON 2 · 第二课下", title: "如果家人犯了错，国家应该怎样让他回来？", source: "/archives/how-to-build-a-state-lesson-2-b.md", version: "v1.0", note: "政治权利暂停、恢复与共同体身份" },
];

function archiveInlineMarkdown(value: string) {
  const escaped = value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>");
}

function archiveMarkdownToHtml(markdown: string) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const html: string[] = [];
  let listType: "ul" | "ol" | "" = "";
  let quoteLines: string[] = [];
  const closeList = () => { if (listType) { html.push(`</${listType}>`); listType = ""; } };
  const closeQuote = () => { if (quoteLines.length) { html.push(`<blockquote>${quoteLines.map(archiveInlineMarkdown).join("<br />")}</blockquote>`); quoteLines = []; } };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) { closeList(); closeQuote(); return; }
    if (line === "---") { closeList(); closeQuote(); html.push("<hr />"); return; }
    if (line.startsWith(">")) { closeList(); quoteLines.push(line.replace(/^>\s?/, "")); return; }
    closeQuote();
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(4, heading[1].length + 1);
      html.push(`<h${level}>${archiveInlineMarkdown(heading[2])}</h${level}>`);
      return;
    }
    const unordered = line.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      if (listType !== "ul") { closeList(); listType = "ul"; html.push("<ul>"); }
      html.push(`<li>${archiveInlineMarkdown(unordered[1])}</li>`);
      return;
    }
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      if (listType !== "ol") { closeList(); listType = "ol"; html.push("<ol>"); }
      html.push(`<li>${archiveInlineMarkdown(ordered[1])}</li>`);
      return;
    }
    closeList();
    html.push(`<p>${archiveInlineMarkdown(line)}</p>`);
  });
  closeList();
  closeQuote();
  return html.join("");
}

function ArchivesSection() {
  const [bookOpen, setBookOpen] = useState(false);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [chapterText, setChapterText] = useState("");
  const [loading, setLoading] = useState(false);
  const [archiveStatus, setArchiveStatus] = useState("");
  const chapter = ARCHIVE_BOOK_CHAPTERS[chapterIndex];
  const records = [["R–001","第一帝国复辟公投记录","RATIFIED · 15 AUG 2026"],["A–001","宪法草案 1.0","FOUNDING DOCUMENT"],["A–002","代号与职务原始记录","CITIZEN RECORD"]];

  useEffect(() => {
    if (!bookOpen) return;
    let active = true;
    fetch(chapter.source)
      .then(async (response) => {
        if (!response.ok) throw new Error("这一章暂时无法打开。");
        const text = await response.text();
        if (active) setChapterText(text);
      })
      .catch((error: unknown) => { if (active) setArchiveStatus(error instanceof Error ? error.message : "这一章暂时无法打开。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bookOpen, chapter.source]);

  const selectChapter = (index: number) => { setLoading(true); setArchiveStatus(""); setChapterIndex(index); };
  const openChapter = (index: number) => { selectChapter(index); setBookOpen(true); };
  const chapterHtml = archiveMarkdownToHtml(chapterText);

  return <>
    <PageHead eyebrow="National Archives" title="国家档案馆" copy="这里保存的不只是结论，而是我们怎样一步步把一个童年共同体写成国家。" />
    <section className="archive-book-gallery">
      <div className="archive-book-stage">
        <button type="button" className={`archive-book ${bookOpen ? "opened" : ""}`} onClick={() => openChapter(chapterIndex)} aria-label="打开《如何从零建立一个国家》">
          <span className="book-page-edges" aria-hidden="true" />
          <span className="book-cover-art"><Image src="/archive-queen-cover.png" alt="童话式女王立于月光花园中的剪影书封" fill sizes="(max-width: 760px) 82vw, 430px" priority={false} unoptimized /></span>
          <span className="book-cover-wash" aria-hidden="true" />
          <span className="book-cover-mark"><CitizenMark citizen={CITIZENS[0]} /></span>
          <span className="book-cover-copy"><small>SCHICKSAL NATIONAL ARCHIVES</small><strong>如何从零<br />建立一个国家</strong><i>AvS 著</i></span>
          <span className="book-spine"><b>SCHICKSAL</b><i>国家档案馆</i></span>
        </button>
        <p>点击封面打开 · OPEN THE ARCHIVE BOOK</p>
      </div>
      <aside className="archive-chapter-index">
        <header><p className="eyebrow">The Living Book · 建国实录</p><h2>不是法条的附录，<br />而是国家怎样长出来。</h2><p>书中保留争论、例子、小故事、后来发现的漏洞，以及“为什么最后会这样决定”。</p></header>
        <nav aria-label="《如何从零建立一个国家》章节">
          {ARCHIVE_BOOK_CHAPTERS.map((item, index) => <button type="button" key={item.id} className={chapterIndex === index && bookOpen ? "active" : ""} onClick={() => openChapter(index)}><span>0{index + 1}</span><div><small>{item.lesson}</small><strong>{item.title}</strong><p>{item.note}</p></div><i>→</i></button>)}
        </nav>
        <footer><span>AUTHOR / 记录主体</span><strong>AvS · 宇宙霸主</strong><i>2026</i></footer>
      </aside>
    </section>

    {bookOpen && <section className="archive-reader" aria-live="polite">
      <header className="reader-topbar"><div><span>《如何从零建立一个国家》</span><i>{chapter.lesson}</i></div><button type="button" onClick={() => setBookOpen(false)}>合上书 ×</button></header>
      <div className="archive-book-spread">
        <aside className="reader-verso">
          <div className="reader-author-mark"><CitizenMark citizen={CITIZENS[0]} /></div>
          <small>SCHICKSAL FIRST EMPIRE<br />NATIONAL ARCHIVES</small>
          <h2>{chapter.title}</h2>
          <p>{chapter.note}</p>
          <nav>{ARCHIVE_BOOK_CHAPTERS.map((item, index) => <button type="button" key={item.id} className={index === chapterIndex ? "active" : ""} onClick={() => selectChapter(index)}><span>0{index + 1}</span><strong>{item.lesson}</strong></button>)}</nav>
          <footer><span>{chapter.version}</span><i>{String(chapterIndex + 1).padStart(2, "0")} / {String(ARCHIVE_BOOK_CHAPTERS.length).padStart(2, "0")}</i></footer>
        </aside>
        <article className="reader-recto" key={chapter.id}>
          {loading ? <div className="reader-loading"><i /><span>正在翻到这一章…</span></div> : archiveStatus ? <div className="reader-loading error">{archiveStatus}</div> : <div className="archive-prose" dangerouslySetInnerHTML={{ __html: chapterHtml }} />}
        </article>
      </div>
      <footer className="reader-controls"><button type="button" disabled={chapterIndex === 0} onClick={() => selectChapter(Math.max(0, chapterIndex - 1))}>← 上一章</button><span>PAGE · {String(chapterIndex + 1).padStart(2, "0")}</span><button type="button" disabled={chapterIndex === ARCHIVE_BOOK_CHAPTERS.length - 1} onClick={() => selectChapter(Math.min(ARCHIVE_BOOK_CHAPTERS.length - 1, chapterIndex + 1))}>下一章 →</button></footer>
    </section>}

    <section className="archive-cabinet"><header><div><p className="eyebrow">Record Cabinet · 旁卷</p><h2>其他国家档案</h2></div><span>书稿以外的认证记录与原始文书</span></header><div>{records.map(([id,title,type]) => <button type="button" key={id}><span>{id}</span><div><h3>{title}</h3><p>{type}</p></div><i>→</i></button>)}</div></section>
  </>;
}

function ProfileSection({ citizen }: { citizen: Citizen }) {
  return <><PageHead eyebrow="Citizen Profile" title="个人身份档案" copy="登录用户名、正式身份、个人标志与历史荣誉在这里汇合。" /><article className="profile" style={{ "--citizen": citizen.accent } as CSSProperties}><div className="profile-mark"><CitizenMark citizen={citizen} /><span>{citizen.username}</span></div><div className="profile-copy"><small>AUTHENTICATED CITIZEN</small><h2>{citizen.name}</h2><dl><div><dt>Login Username</dt><dd>{citizen.username}</dd></div><div><dt>Current Office</dt><dd>{citizen.office}</dd></div><div><dt>Personal Mark</dt><dd>{citizen.id === "amberina" ? "Golden Solar Snowflake" : citizen.id === "zxy" ? "Red Flame" : citizen.id === "truth" ? "Yellow Lightning" : "Personal Sigil"}</dd></div><div><dt>Representative Color</dt><dd>{citizen.id === "amberina" ? "Imperial Gold / Yellow" : "待本人确认"}</dd></div></dl></div><div className="profile-score"><span>IMPERIAL POINTS</span><b>{citizen.id === "amberina" ? "128" : "—"}</b><small>Demo record</small></div></article></>;
}

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

function CommitteeLounge({ citizen, leave, seatingUnlocked }: { citizen: Citizen; leave: () => void; seatingUnlocked: boolean }) {
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
  const [vaseOpen, setVaseOpen] = useState(false);
  const miniGames = useMiniGameSystem();
  const [clubData, setClubData] = useState<ClubData>({ profiles: [], messages: [], seats: [], room: { id: "main", vaseSelection: "autumn", updatedByCitizenId: "", updatedAt: "" } });
  const [chatText, setChatText] = useState("");
  const [maskName, setMaskName] = useState(LOUNGE_IDENTITIES[citizen.id]?.mask || citizen.username);
  const [maskAvatar, setMaskAvatar] = useState("sigil");
  const [clubStatus, setClubStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [roomView, setRoomView] = useState<"committee" | "amberina" | "chryser" | "truth" | "game-room">("committee");
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
  const vaseSelection = clubData.room?.vaseSelection ?? "autumn";
  const vaseChoice = CLUB_VASE_OPTIONS.find((option) => option.id === vaseSelection) ?? CLUB_VASE_OPTIONS[0];

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
    setVaseOpen(false);
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
    setVaseOpen(false);
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
    setVaseOpen(false);
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
    setChatOpen(false); setVaseOpen(false); setMusicBoxOpening(true);
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

  const selectVase = async (selection: string) => {
    const previous = clubData.room;
    const optimistic = { id: "main", vaseSelection: selection, updatedByCitizenId: citizen.id, updatedAt: new Date().toISOString() };
    setClubData((current) => ({ ...current, room: optimistic }));
    setVaseOpen(false);
    setEffect("vase");
    try {
      const payload = await postClub({ action: "vase", vaseSelection: selection });
      if (payload.room) setClubData((current) => ({ ...current, room: payload.room }));
      const selected = CLUB_VASE_OPTIONS.find((option) => option.id === selection);
      setWhisper(`${loungeMaskName(citizen, currentProfile)} 把桌上的花瓶换成了“${selected?.label ?? "秘密陈设"}”。`);
    } catch (error) {
      setClubData((current) => ({ ...current, room: previous }));
      setClubStatus(error instanceof Error ? error.message : "花瓶没有换成功。");
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
          <div className={`club-vase-display vase-${vaseChoice.id}`} aria-hidden="true"><Image key={vaseChoice.id} className="club-vase-object-image" src={vaseChoice.image} width={512} height={512} alt="" unoptimized /></div>
        </div>
        <MagicChatScroll open={chatOpen} onOpen={openChat} />
        <button className="club-hotspot vase" type="button" aria-label="更换桌上花瓶陈设" aria-pressed={vaseOpen} onClick={() => { setVaseOpen((value) => !value); setEffect("vase"); }}><i /><span>更换桌上花瓶</span></button>

        <button className="club-fireplace-portal" type="button" onClick={openChryserLounge} disabled={fireplaceOpening} aria-label="打开右侧壁炉，进入 Lord Chryser 的私人 Lounge"><span>打开翡翠壁炉</span></button>
        <div className="club-jade-fire" aria-hidden="true">
          <Image className="jade-fire-underlay" src="/jade-ember-flame-v2.png" width={1437} height={1095} alt="" unoptimized />
          <Image className="jade-fire-body" src="/jade-ember-flame-v2.png" width={1437} height={1095} alt="" unoptimized />
          <span className="jade-fire-depth"><Image src="/committee-lounge-word-globe-v1.png" width={1672} height={941} alt="" unoptimized /></span>
        </div>
      </div>

      {globeOpening && <WordmageGlobePassage />}
      {musicBoxOpening && <div className="arcade-music-passage playing" role="status" aria-live="polite"><MusicBoxDrawing /><small>FOLLOW THE LITTLE MELODY</small><p>八音盒的另一面，是一间游艺室。</p><span>正在打开温暖的房门…</span></div>}

      {vaseOpen && <aside className="club-vase-menu" aria-label="花瓶与神秘菜单">
        <header><div><small>ENCHANTED VASE</small><strong>今天插什么？</strong></div><button type="button" onClick={() => setVaseOpen(false)} aria-label="关闭花瓶菜单">×</button></header>
        {["花束", "神秘菜单"].map((category) => <section key={category}><h3>{category}</h3><div>{CLUB_VASE_OPTIONS.filter((option) => option.category === category).map((option) => <button type="button" key={option.id} className={vaseSelection === option.id ? "selected" : ""} onClick={() => void selectVase(option.id)}><Image src={option.image} width={72} height={72} alt="" unoptimized /><strong>{option.label}</strong></button>)}</div></section>)}
      </aside>}

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

function System({ citizen, logout }: { citizen: Citizen; logout: () => void }) {
  const [section,setSection] = useState<Section>("home");
  const [loungeSeatingUnlocked, setLoungeSeatingUnlocked] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    setLoungeSeatingUnlocked(false);
    setSection("club");
    announceCommitteeLounge(citizen, () => setLoungeSeatingUnlocked(true));
  };
  const clubOpen = section === "club" && CLUB_MEMBER_IDS.has(citizen.id);
  const active = NAV.find((item) => item.id === section) ?? { id: "club" as const, label: "委员会 Lounge", en: "Committee Lounge" };
  let content: ReactNode;
  switch (section) {
    case "citizens": content = <CitizensSection />; break;
    case "emblem": content = <EmblemSection />; break;
    case "parliament": content = <PersistentParliamentSection citizen={citizen} />; break;
    case "honors": content = <HonorsSection />; break;
    case "calendar": content = <CalendarSection />; break;
    case "market": content = <MarketSection />; break;
    case "photos": content = <PhotoArchiveSection citizen={citizen} />; break;
    case "archives": content = <ArchivesSection />; break;
    case "profile": content = <><ProfileSection citizen={citizen} />{citizen.id === "amberina" && <MemberAccessSettings />}</>; break;
    case "club": content = CLUB_MEMBER_IDS.has(citizen.id) ? <CommitteeLounge citizen={citizen} leave={() => setSection("home")} seatingUnlocked={loungeSeatingUnlocked} /> : <HomeSection go={setSection} />; break;
    default: content = <HomeSection go={setSection} />;
  }
  return (
    <main className={`system ${clubOpen ? "club-system" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar" id="imperial-sidebar"><div className="side-brand"><Emblem compact /><Wordmark /><button className="sidebar-toggle" type="button" onClick={toggleSidebar} aria-expanded={!sidebarCollapsed} aria-controls="imperial-navigation" aria-label={sidebarCollapsed ? "展开导航" : "收起导航"} title={sidebarCollapsed ? "展开导航" : "收起导航"}>{sidebarCollapsed ? "›" : "‹"}</button></div><nav id="imperial-navigation" aria-label="帝国主导航">{NAV.map((item,index) => <button type="button" key={item.id} className={section === item.id ? "active" : ""} title={`${item.label} · ${item.en}`} aria-label={`${String(index + 1).padStart(2,"0")} ${item.label} ${item.en}`} onClick={() => setSection(item.id)}><span>{String(index + 1).padStart(2,"0")}</span><strong>{item.label}</strong><small>{item.en}</small></button>)}</nav>{CLUB_MEMBER_IDS.has(citizen.id) && <button className={`club-portal ${clubOpen ? "active" : ""}`} type="button" onClick={enterLounge} aria-label="进入 Committee Lounge"><Image src="/committee-restroom-badge.png" width={90} height={90} alt="南瓜与小幽灵组成的 Committee Lounge 入口" unoptimized /><span><strong>神秘入口</strong><small>COMMITTEE LOUNGE</small></span><i aria-hidden="true" /></button>}<div className="side-user" style={{ "--citizen": citizen.accent } as CSSProperties}><CitizenMark citizen={citizen} /><div><strong>{citizen.name}</strong><span>{citizen.codename}</span></div><button type="button" onClick={logout} aria-label="退出登录">↗</button></div></aside>
      <section className={`system-main ${clubOpen ? "club-main" : ""}`}>{!clubOpen && <header className="topbar"><div><span>IMPERIAL CORE /</span><strong>{active.en.toUpperCase()}</strong></div><div><span><i /> SYSTEM ONLINE</span><b>FIRST EMPIRE · 2026</b></div></header>}<div className={`content ${clubOpen ? "club-content" : ""}`}>{content}</div>{!clubOpen && <footer className="system-footer"><span>SCHICKSAL · 天命第一帝国</span><span>PERSISTENT ARCHIVES &amp; PARLIAMENT</span></footer>}</section>
    </main>
  );
}

export default function Home() {
  const [phase,setPhase] = useState<Phase>("opening");
  const [citizen,setCitizen] = useState(CITIZENS[0]);
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
    const params = new URLSearchParams(window.location.search);
    if (window.location.hostname === "terminal.local" && ["parliament", "archives", "club"].includes(params.get("preview") ?? "")) {
      const previewCitizen = CITIZENS.find((item) => item.id === params.get("citizen") && !item.locked);
      // Agent-only preview identity; never enabled on the production hostname.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (previewCitizen) setCitizen(previewCitizen);
      setPhase("system");
      return;
    }
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
        if (new URLSearchParams(window.location.search).get("lounge") === "game-room" && CLUB_MEMBER_IDS.has(member.id)) { setPhase("system"); return; }
        let entryCompleted = false;
        try { entryCompleted = window.sessionStorage.getItem("schicksal:entry-complete") === "1"; window.sessionStorage.removeItem("schicksal:entry-complete"); } catch { /* Retain the normal opening when storage is unavailable. */ }
        setPhase((current) => entryCompleted || current === "login" ? "welcome" : current);
      }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  if (phase === "opening") return <Opening done={() => setPhase(restoredCitizen.current ? "welcome" : "login")} />;
  if (phase === "login") return <Login replay={() => setPhase("opening")} enter={(next) => { restoreController.current?.abort(); setCitizen(next); setPhase("welcome"); }} />;
  if (phase === "welcome") return <Welcome citizen={citizen} enter={() => setPhase("system")} />;
  return <System citizen={citizen} logout={() => { void logoutMember(); }} />;
}

