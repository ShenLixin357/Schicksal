"use client";

import Image from "next/image";
import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { CITIZENS, type Citizen } from "../citizens";
import { CLUB_MEMBER_IDS, LOUNGE_IDENTITIES } from "./lounge-access";
import type { ClubProfile, ClubMessage, ClubData } from "./lounge-contract";
import { ArticulatedFan, LaceFanDrawing } from "./articulated-fan";
import { FAN_CYCLE_MS } from "./fan-motion";
import { MysticSigil } from "./mystic-marks";
import { LoungeTable, LoungeTeaRitual } from "./tea-ritual";


import { MafraerLounge, MAFRAER_ROOM_ASSETS } from "./mafraer-lounge";

import { chatDate, chatTimestamp, mergeChatMessages, type ChatCursor } from "./chat-history";
import { MagicChatScroll, MusicBoxDrawing, MusicBoxPortal, RotatingWordmageGlobe, startMusicBoxTune } from "./lounge-props";
import { useMiniGameSystem } from "./minigames/use-mini-game-system";

import { VaseExperience } from "./vase/vase-experience";
import { getVase } from "./vase/vase-catalogue";
import { EMBLEM_BLADES } from "../emblem/blade-spec";
const ChryserLounge = lazy(() => import("./chryser-lounge").then(module => ({ default: module.ChryserLounge })));
const WordmageLounge = lazy(() => import("./wordmage-lounge").then(module => ({ default: module.WordmageLounge })));
const WordmageGlobePassage = lazy(() => import("./wordmage-lounge").then(module => ({ default: module.WordmageGlobePassage })));
const GameRoom = lazy(() => import("./game-room").then(module => ({ default: module.GameRoom })));
const MiniGameSystem = lazy(() => import("./minigames/mini-game-system").then(module => ({ default: module.MiniGameSystem })));
const LoungeLeaderboard = lazy(() => import("./minigames/lounge-leaderboard").then(module => ({ default: module.LoungeLeaderboard })));
function RoomLoading({ name }: { name: string }) {
  return <div className="lounge-module-loading" role="status">{name} · 正在打开…</div>;
}


/** The approved committee room, including all personal rooms, interactive
 * objects, chat and game entrance. Only ownership changes in this pass.
 * Access to it must remain gated by the authenticated site coordinator.
 */
const CLUB_MEMBERS = CITIZENS.filter(citizen => CLUB_MEMBER_IDS.has(citizen.id));

function loungeMaskName(citizen: Citizen, profile?: ClubProfile) {
  return profile?.maskName || LOUNGE_IDENTITIES[citizen.id]?.mask || citizen.username;
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

export function CommitteeLounge({ citizen, leave, seatingUnlocked, initialRoom = "committee" }: { citizen: Citizen; leave: () => void; seatingUnlocked: boolean; initialRoom?: "committee" | "game-room" }) {
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
  const fanDeadlineRef = useRef<number | null>(null);
  const fireplaceTimerRef = useRef<number | null>(null);
  const fireplaceDeadlineRef = useRef<number | null>(null);
  const fanTravelRef = useRef(0);
  const fireplaceTravelRef = useRef(0);
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
    fireplaceTravelRef.current += 1;
    globeTravelRef.current += 1;
    musicBoxTravelRef.current += 1;
    historyRequestRef.current += 1;
    historyAbortRef.current?.abort();
    musicBoxSoundRef.current?.();
    if (musicBoxTimerRef.current !== null) window.clearTimeout(musicBoxTimerRef.current);
    if (fanTimerRef.current !== null) window.clearTimeout(fanTimerRef.current);
    if (fanDeadlineRef.current !== null) window.clearTimeout(fanDeadlineRef.current);
    if (fireplaceTimerRef.current !== null) window.clearTimeout(fireplaceTimerRef.current);
    if (fireplaceDeadlineRef.current !== null) window.clearTimeout(fireplaceDeadlineRef.current);
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
    let settled = false;
    background.src = nextRoom === "amberina" ? MAFRAER_ROOM_ASSETS.moonlit : "/committee-lounge-word-globe-v1.png";
    const completePassage = (loaded: boolean) => {
      if (settled || request !== fanTravelRef.current) return;
      settled = true;
      if (fanDeadlineRef.current !== null) window.clearTimeout(fanDeadlineRef.current);
      fanDeadlineRef.current = null;
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
    // A stalled decode must not leave the passage overlay mounted indefinitely.
    fanDeadlineRef.current = window.setTimeout(() => completePassage(false), 12000);
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
    const request = ++fireplaceTravelRef.current;
    const started = performance.now();
    const background = new window.Image();
    let settled = false;
    const complete = (loaded: boolean) => {
      if (settled || request !== fireplaceTravelRef.current) return;
      settled = true;
      if (fireplaceDeadlineRef.current !== null) window.clearTimeout(fireplaceDeadlineRef.current);
      fireplaceDeadlineRef.current = null;
      const elapsed = performance.now() - started;
      const minimum = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 280 : 2600;
      fireplaceTimerRef.current = window.setTimeout(() => {
        if (request !== fireplaceTravelRef.current) return;
        if (loaded) setRoomView("chryser");
        else {
          setClubStatus("翡翠壁炉暂时无法打开，请再试一次。");
          setWhisper("绿色余烬熄灭了；通往 Room No. 02 的门没有打开。");
        }
        setFireplaceOpening(false);
        fireplaceTimerRef.current = null;
      }, Math.max(0, minimum - elapsed));
    };
    // Preserve the existing scene and exact animation timing on success.
    // Both decoding failure and a hung decode fail safely without stale callbacks.
    fireplaceDeadlineRef.current = window.setTimeout(() => complete(false), 12000);
    background.src = "/chryser-private-lounge.png";
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

  if (roomView === "chryser") return <Suspense fallback={<RoomLoading name="翡翠休息室"/>}><ChryserLounge citizenId={citizen.id} emblemBlades={EMBLEM_BLADES} onBack={() => setRoomView("committee")} /></Suspense>;

  if (roomView === "truth") return <Suspense fallback={<RoomLoading name="魔法师休息室"/>}><WordmageLounge onBack={() => setRoomView("committee")} /></Suspense>;

  if (miniGames.activeGame) return <Suspense fallback={<RoomLoading name="游艺室"/>}><MiniGameSystem citizenId={citizen.id} gameId={miniGames.activeGame} emblemBlades={EMBLEM_BLADES} onClose={miniGames.closeMiniGame} loungeTitle={roomView === "game-room" ? "八音盒游艺室" : undefined} backLabel={roomView === "game-room" ? "返回游戏室" : undefined} /></Suspense>;

  if (roomView === "game-room") return <Suspense fallback={<RoomLoading name="游艺室"/>}><GameRoom emblemBlades={EMBLEM_BLADES} onBack={() => setRoomView("committee")} onLaunch={miniGames.launchMiniGame} onRankings={() => setRankingsOpen(true)} />{rankingsOpen && <Suspense fallback={<RoomLoading name="成绩簿"/>}><LoungeLeaderboard citizenId={citizen.id} onClose={() => setRankingsOpen(false)} /></Suspense>}</Suspense>;

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

      {globeOpening && <Suspense fallback={null}><WordmageGlobePassage /></Suspense>}
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
    {rankingsOpen && <Suspense fallback={<RoomLoading name="成绩簿"/>}><LoungeLeaderboard citizenId={citizen.id} onClose={() => setRankingsOpen(false)} /></Suspense>}
    {fanTransition && <FanTransition direction={fanTransition} />}
    </>
  );
}
