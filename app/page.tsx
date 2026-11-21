"use client";

import { BriefingDesk, BriefingOverlay } from "./briefing/briefing";
import type { BriefingTarget } from "./briefing/briefing-data";
import { useBriefingFeed } from "./briefing/use-briefing-feed";
import { fetchBriefingFeed, type BriefingFeed } from "./briefing/briefing-loader";
import { readyForMandatoryBriefing, mayMountSiteAfterBriefing, type MandatoryBriefingPreload } from "./briefing/mandatory-entry";
import { useMemberPresence } from "./briefing/use-member-presence";
import { CITIZENS, citizenRepresentativeColor, type Citizen } from "./citizens";
import { isCurrentPresident, isCurrentTechnologyMinister, currentOfficeLabel, officesForCitizen, type Office } from "./identity/office-registry";
import { PublicCitizenMark as CitizenMark } from "./identity/public-mark";
import { ATLAS_VISUAL_APPROVED } from "./shell/navigation";
import { CompactEmpireEmblem as Emblem } from "./emblem/compact-emblem";

import { atlasName, atlasCodename } from "./atlas/atlas-data";

import { lazy, useCallback, useEffect, useRef, useState, type CSSProperties, type Dispatch, type DragEvent, type FormEvent, type ReactNode, type SetStateAction } from "react";








import { wantsGameRoomReturn } from "./club/game-room-return";
import { CLUB_MEMBER_IDS, announceCommitteeLounge } from "./club/lounge-access";






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
import { TechnologyMinistryPortal } from "./technology/technology-ministry";

import { LoungePassage, type LoungePassageDirection } from "./transitions/lounge-passage";
import type { SidebarDestination, SiteSection } from "./shell/navigation";

// Only import these data-heavy sections when the user navigates to them.
const SchicksalAtlas = lazy(() => import("./atlas/schicksal-atlas").then(module => ({ default: module.SchicksalAtlas })));
const AtlasGovernmentHandbook = lazy(() => import("./atlas/government-handbook").then(module => ({ default: module.AtlasGovernmentHandbook })));
const PhotoArchiveSection = lazy(() => import("./photos/photo-archive").then(module => ({ default: module.PhotoArchiveSection })));
const ArchivesSection = lazy(() => import("./archives/archive-section").then(module => ({ default: module.ArchivesSection })));
const CommitteeLounge = lazy(() => import("./club/committee-lounge").then(module => ({ default: module.CommitteeLounge })));

type AccountMode = "citizen" | "technology";
type Phase = "opening" | "login" | "welcome" | "system";
type Section = SiteSection;

const PARTICLES = [[8,18,1],[17,72,2],[25,34,3],[35,84,1],[43,10,2],[54,68,3],[62,28,1],[71,88,2],[79,44,3],[88,14,2],[92,76,1],[12,48,3]];

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

function Login({ enter, replay }: { enter: (citizen: Citizen, mode: AccountMode) => void; replay: () => void }) {
  const [selectedId, setSelectedId] = useState("amberina");
  const [loginMode, setLoginMode] = useState<AccountMode>("citizen");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const selected = CITIZENS.find(item => item.id === selectedId)!;
  const chooseCitizen = (id: string) => {
    setSelectedId(id); setLoginMode("citizen"); setPassword(""); setError("");
  };
  const chooseMinistry = () => {
    setLoginMode("technology"); setPassword(""); setError("");
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loggingIn) return;
    setLoggingIn(true); setError("");
    try {
      // Only the dedicated official entry is allowed to request the minister
      // password. The server resolves the active officeholder, not this UI.
      const citizenId = loginMode === "technology" ? "technology" : selected.id;
      const response = await fetch("/api/member-session", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citizenId, password, accountMode: loginMode }) });
      const payload = await response.json() as { error?: string; citizenId?: string; accountMode?: AccountMode };
      if (!response.ok) throw new Error(payload.error || "登录暂时未能完成。");
      const current = CITIZENS.find(item => item.id === payload.citizenId && !item.locked);
      if (!current || payload.accountMode !== loginMode) throw new Error("服务器返回的身份不一致。");
      setPassword(""); enter(current, payload.accountMode);
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
          <div className="panel-head"><div><span>STEP 01</span><h2>选择身份</h2></div><small>05 / 08 CITIZENS · 01 OFFICE</small></div>
          <div className="identity-grid">
            {CITIZENS.map(item => (
              <button type="button" disabled={item.locked} key={item.id}
                onClick={() => chooseCitizen(item.id)}
                aria-pressed={loginMode === "citizen" && selectedId === item.id}
                className={`${loginMode === "citizen" && selectedId === item.id ? "selected" : ""} ${item.locked ? "locked" : ""}`}
                style={{ "--citizen": citizenRepresentativeColor(item) } as CSSProperties}>
                <CitizenMark citizen={item} placement="login-react-picker" />
                <span><strong>{item.username}</strong><small>{item.locked ? "RECORD SEALED" : item.name}</small></span><i />
              </button>
            ))}
            <button type="button" key="technology-ministry" onClick={chooseMinistry}
              aria-pressed={loginMode === "technology"}
              className={`technology-login-card ${loginMode === "technology" ? "selected" : ""}`}>
              <Emblem compact />
              <span><strong>科技部部长</strong><small>MINISTRY OF TECHNOLOGY</small></span><i />
            </button>
          </div>
          <form onSubmit={submit} className="access-form">
            <div className="panel-head access-head">
              <div><span>STEP 02 · {loginMode === "technology" ? "科技部部长" : selected.username}</span>
                <h2>{loginMode === "technology" ? "部长专用密码" : "输入登录密码"}</h2></div>
              <small>RECOGNISED AS<br />{loginMode === "technology" ? "OFFICIAL MINISTRY" : selected.name}</small>
            </div>
            <label><span>Password · 密码</span><div>
              <input type={show ? "text" : "password"} value={password}
                onChange={event => { setPassword(event.target.value); setError(""); }}
                placeholder={loginMode === "technology" ? "请输入部长专用密码" : "输入密码"}
                aria-invalid={Boolean(error)} autoComplete="current-password" />
              <button type="button" onClick={() => setShow(!show)}>{show ? "HIDE" : "SHOW"}</button>
            </div></label>
            <footer><p className={error ? "error" : ""} role="status">
              {error || (loginMode === "technology" ? "部长专用入口不接受个人密码" : `正在以 ${selected.username} 的身份登录`)}
            </p>
            <button className="primary" type="submit" disabled={loggingIn}>{loggingIn ? "正在登录…" : "LOGIN"} <span>→</span></button></footer>
          </form>
        </div>
      </section>
      <footer className="entry-footer"><span>EST. FIRST EMPIRE</span><i /><span>RESTORED 15·08·2026</span></footer>
    </main>
  );
}

type PreloadStatus = "loading" | "ready" | "error";
function Welcome({ citizen, accountMode, offices, enter, preloadStatus, retry }: {
  citizen: Citizen;
  accountMode: AccountMode;
  offices: readonly Office[] | null;
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
        <div className="welcome-mark">{accountMode==="technology"?<Emblem compact/>:<CitizenMark citizen={citizen} placement="welcome-identity" />}<i /></div>
        <small>WELCOME TO SCHICKSAL</small><h1>{accountMode==="technology"?"科技部部长":citizen.name}</h1>
        <div className="welcome-meta"><span>{offices ? currentOfficeLabel(citizen,offices) : "正在核验现任公职"}</span><i /><span>CODE NAME · {citizen.codename}</span></div>
        <p>Your citizen identity has been recognised by the Imperial System.<br />帝国系统已识别你的公民身份。</p>
        <button type="button" onClick={enter} disabled={preloadStatus !== "ready"}>{preloadStatus === "ready" ? "ENTER NOW" : "PREPARING BRIEFING…"} <span>→</span></button>
        {preloadStatus === "loading" && <div className="welcome-preload-status" role="status">正在准备最新政务与简报…</div>}
        {preloadStatus === "error" && <div className="welcome-preload-status" role="alert">
          简报尚未准备好。同步成功并查看简报后，才能进入帝国。
          <div className="welcome-preload-actions"><button type="button" onClick={retry}>重新同步简报</button></div>
        </div>}
      </section>
      <footer>CURRENT OFFICE <strong>{offices ? currentOfficeLabel(citizen,offices).toUpperCase() : "VERIFYING"}</strong></footer>
      <div className="welcome-progress" aria-hidden="true"><i /></div>
    </main>
  );
}

function CitizenEmblem({ large = false }: { large?: boolean }) {
  return (
    <div className={`radial-emblem ${large ? "large" : ""}`} role="img" aria-label="八个彩色棱分别象征八位公民">
      <span className="emblem-ring outer" /><span className="emblem-ring inner" />
      {EMBLEM_BLADES.map((blade) => <span className={`emblem-slot ${isCurrentPresident(blade.citizenId) ? "leader" : ""}`} key={blade.citizenId} style={{ "--slot": blade.index, "--citizen": blade.color } as CSSProperties}><i /><b>{blade.index + 1}</b></span>)}
      <span className="emblem-center">S</span>
    </div>
  );
}



function CitizensSection({ focusedId, onClearFocus }: { focusedId?: string | null; onClearFocus?: () => void }) {
  const focused = focusedId ? CITIZENS.find(member => member.id === focusedId && !member.locked) : undefined;
  return <><PageHead eyebrow="Citizen Registry" title="公民名册" copy="八个彩色棱分别象征八位公民；八棱共同构成帝国的共同主标志。" />
    {focused && <article className="public-citizen-focus" style={{ "--citizen": citizenRepresentativeColor(focused) } as CSSProperties} aria-label={focused.username + "的公开公民档案"}>
      <CitizenMark citizen={focused} placement="citizen-registry-focus"/>
      <div><small>PUBLIC CITIZEN RECORD · 公民公开资料</small><strong>{focused.name}</strong><span>{focused.username} · {focused.office}</span></div>
      <button type="button" onClick={onClearFocus} aria-label="返回完整公民名册">×</button>
    </article>}<div className="registry">{CITIZENS.map((citizen,index) => <article key={citizen.id} className={citizen.locked ? "sealed" : ""} style={{ "--citizen": citizenRepresentativeColor(citizen) } as CSSProperties}><b>0{index + 1}</b><CitizenMark citizen={citizen} placement="citizen-registry-card" /><div><small>{citizen.office}</small><h2>{citizen.name}</h2><p>{citizen.codename}</p></div></article>)}</div><p className="note">八个棱在视觉原型中均有独立颜色；其余身份、年龄顺序及最终代表色仍待八位公民正式确认。</p></>;
}

function EmblemSection() {
  return <><PageHead eyebrow="Shared Imperial Emblem" title="帝国八棱主标志" copy="标志由八个具有独立颜色的棱组成，每一棱象征一位公民；正式专名与是否归类为国徽仍待确定。" /><div className="emblem-page"><div><CitizenEmblem large /></div><section>{[["01","八棱八人","每一个彩色棱都对应一位天命公民。"],["02","共同构成","任何一棱都不是装饰；八位公民共同组成完整标志。"],["03","名称待定","现阶段仅使用“帝国八棱主标志”这一描述性称呼，不提前确定正式专名。"]].map(([n,title,copy]) => <article key={n}><b>{n}</b><div><h3>{title}</h3><p>{copy}</p></div></article>)}<p className="emblem-note">SHARED EMBLEM · EIGHT COLOURED RAYS</p></section></div></>;
}

// Kept as an internal visual reference while the persistent chamber replaces the original demo.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function HonorsSection() { return <HonorsPage/>; }

function CalendarSection() { return <CalendarPage/>; }

function MarketSection() { return <MarketPage/>; }

function PublicAtlasCitizenProfile({ citizen, onBack, offices }: { citizen: Citizen; onBack: () => void; offices: readonly Office[] | null }) {
  const positions = offices ? officesForCitizen(citizen.id, offices) : [];
  return <><button className="atlas-profile-back" type="button" onClick={onBack}>← 返回天命图谱</button><PageHead eyebrow="Public Citizen Profile" title="公民公开档案" copy="这里只展示获准公开的身份与公职资料。"/><article className="profile" style={{ "--citizen": citizenRepresentativeColor(citizen) } as CSSProperties}><div className="profile-mark"><CitizenMark citizen={citizen} placement="profile-public-simple"/><span>{atlasCodename(citizen.id)}</span></div><div className="profile-copy"><small>PUBLIC CITIZEN RECORD</small><h2>{atlasName(citizen)}</h2><dl><div><dt>公民代号</dt><dd>{atlasCodename(citizen.id)}</dd></div><div><dt>现任公职</dt><dd>{offices ? positions.length ? positions.map(office => office.title).join(" · ") : "暂无现任公职" : "正在核验现任公职"}</dd></div><div><dt>身份</dt><dd>第一帝国公民</dd></div></dl><p className="atlas-visitor-disclaimer">访客只能查看公开身份；私人消息、账户设置、个人数据及编辑功能不开放。</p></div></article></>;
}

function ProfileSection({ citizen, offices }: { citizen: Citizen; offices: readonly Office[] | null }) { return <SelfProfilePage citizen={citizen} offices={offices} renderMark={<CitizenMark citizen={citizen} placement="profile-personal-simple" />}/>; }

function System({ citizen, accountMode, offices, onAccountModeChange, logout, initialBriefing }: {
  citizen: Citizen; accountMode:AccountMode; offices: readonly Office[] | null; onAccountModeChange:(mode:AccountMode)=>void; logout: () => void; initialBriefing: BriefingFeed;
}) {
  const [section,setSection] = useState<Section>("home");
  const isCurrentMinister = Boolean(offices && isCurrentTechnologyMinister(citizen.id, offices));
  const [switchingMode,setSwitchingMode] = useState(false);
  const switchBusy = useRef(false);
  const [modeSwitchMessage,setModeSwitchMessage] = useState("");
  const switchAccountImmediately = () => {
    if (!isCurrentMinister || switchBusy.current) return;
    switchBusy.current = true;
    setSwitchingMode(true); setModeSwitchMessage("");
    const target: AccountMode = accountMode === "technology" ? "citizen" : "technology";
    void fetch("/api/member-session/switch", {
      method:"POST", cache:"no-store",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({target}),
    }).then(async response => {
      const payload = await response.json() as {accountMode?:AccountMode;citizenId?:string;error?:string};
      if (!response.ok || payload.citizenId !== citizen.id || payload.accountMode !== target)
        throw Error(payload.error || "身份切换未完成。");
      onAccountModeChange(target);
      setViewedCitizenId(citizen.id);
      setSection("profile");
    }).catch(error => {
      setModeSwitchMessage(error instanceof Error ? error.message : "身份切换失败，请检查网络。");
    }).finally(() => {
      switchBusy.current = false; setSwitchingMode(false);
    });
  };
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
    if (wantsGameRoomReturn(window)) {
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
    case "emblem": content = ATLAS_VISUAL_APPROVED ? <FeatureSuspense label="天命图谱" onExit={() => setSection("home")}><SchicksalAtlas key={focusedCitizenId ?? "atlas-default"} initialCitizenId={focusedCitizenId ?? undefined} onVisitCitizen={openAtlasProfile} onOpenHandbook={openAtlasHandbook}/></FeatureSuspense> : <ShellPlaceholder kind="atlas" />; break;
    case "parliament": content = <><div className="atlas-parliament-help"><button type="button" title="查阅图书馆政务手册" onClick={openAtlasHandbook}>▤ 政务手册 ↗</button></div><FeatureSuspense label="帝国政务" onExit={() => setSection("home")}><PersistentParliamentSection citizen={citizen} requestedItemId={parliamentDeepLink} requestedFocus={parliamentDeepLinkFocus} focusReferendums={parliamentFocus === "referendum"} renderOfficialMark={(member, placement) => <CitizenMark citizen={member} placement={placement} />} /></FeatureSuspense></>; break;
    case "honors": content = <HonorsSection/>; break;
    case "calendar": content = <CalendarSection />; break;
    case "market": content = <MarketSection/>; break;
    case "photos": content = <FeatureSuspense label="家庭影像馆" onExit={() => setSection("home")}><PhotoArchiveSection citizen={citizen} accountMode={accountMode} sharedMark={<Emblem compact />} renderCitizenMark={(subject, placement) => <CitizenMark citizen={subject} placement={placement} />} /></FeatureSuspense>; break;
    case "archives": content = atlasHandbookOpen ? <FeatureSuspense label="政务手册" onExit={() => setSection("home")}><AtlasGovernmentHandbook onBack={()=>setAtlasHandbookOpen(false)}/></FeatureSuspense> : <FeatureSuspense label="国家档案馆" onExit={() => setSection("home")}><ArchivesSection authorMark={<CitizenMark citizen={CITIZENS[0]} placement="archive-book-cover" />} readerAuthorMark={<CitizenMark citizen={CITIZENS[0]} placement="archive-reader-author" />} authorMarkColor={CITIZENS[0].markColor} /></FeatureSuspense>; break;
    case "profile": content = viewedCitizen.id === citizen.id
      ? (accountMode === "technology" && isCurrentMinister
        ? <TechnologyMinistryPortal sharedMark={<Emblem compact />}
            onOpenPhotos={() => setSection("photos")} onBack={() => setSection("home")}/>
        : <ProfileSection citizen={citizen} offices={offices}/>)
      : <PublicAtlasCitizenProfile citizen={viewedCitizen} offices={offices} onBack={() => setSection("atlas")}/>; break;
    // Older URLs/internal references resolve to the same profile destination,
    // not to a separate elevated menu or extra admin entry.
    case "technology": content = accountMode === "technology" && isCurrentMinister
      ? <TechnologyMinistryPortal sharedMark={<Emblem compact />}
          onOpenPhotos={() => setSection("photos")} onBack={() => setSection("home")}/>
      : <HomeSection go={setSection}/>; break;
    case "club": content = CLUB_MEMBER_IDS.has(citizen.id) ? <FeatureSuspense label="委员会 Lounge" onExit={() => setSection("home")}><CommitteeLounge citizen={citizen} leave={exitLounge} seatingUnlocked={loungeSeatingUnlocked} initialRoom={loungeLanding} /></FeatureSuspense> : <HomeSection go={setSection} />; break;
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
          return member && accountMode==="technology" && member.id===citizen.id ? <Emblem compact/> : member ? <CitizenMark citizen={member} placement={member.id === citizen.id ? (clubOpen ? "sidebar-lounge-self" : "sidebar-main-self") : "sidebar-main-other-member"} /> : null;
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
        onSelfLongPress={isCurrentMinister?switchAccountImmediately:undefined}
      />
      <section className={`system-main ${clubOpen ? "club-main" : ""}`}>
        <div className={`content ${clubOpen ? "club-content" : ""}`}>{content}</div>
      </section>
      {portal && <LoungePassage direction={portal} sharedMark={<Emblem compact />}
        onSwap={swapPortalRoom} onFinish={() => setPortal(null)}/>}
      {(switchingMode || modeSwitchMessage) && <div className="technology-inline-switch-status"
        role={modeSwitchMessage ? "alert" : "status"} aria-live="polite">
        {modeSwitchMessage || "正在切换身份…"}
      </div>}

    </main>
  );
}

type PreparedBriefing = MandatoryBriefingPreload;
type SystemBriefing = { feed: BriefingFeed };

export default function Home() {
  const [phase, setPhase] = useState<Phase>("opening");
  const [citizen, setCitizen] = useState(CITIZENS[0]);
  const [accountMode,setAccountMode] = useState<AccountMode>("citizen");
  const [offices,setOffices] = useState<readonly Office[] | null>(null);
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
    try {
      const response = await fetch("/api/member-session", { method: "DELETE" });
      if (!response.ok) throw new Error("Server has not revoked the session");
      window.location.replace("/");
    } catch {
      // Keep the current authenticated view: a local redirect cannot revoke a server token.
      window.alert("退出登录未完成，请检查网络后重试。");
    } finally { logoutPending.current = false; }
  };
  useEffect(() => {
    // Even diagnostic or preview routes must pass member authentication and
    // the briefing gate; query strings cannot bypass onboarding.
    const controller = new AbortController();
    restoreController.current = controller;
    void fetch("/api/member-session", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? await response.json() as { citizenId?: string; accountMode?: AccountMode } : null)
      .then((session) => {
        if (controller.signal.aborted) return;
        const member = CITIZENS.find((item) => item.id === session?.citizenId && !item.locked);
        if (!member) return;
        restoredCitizen.current = member;
        setCitizen(member);
        setAccountMode(session?.accountMode==="technology"?"technology":"citizen");
        let entryCompleted = false;
        try { entryCompleted = window.sessionStorage.getItem("schicksal:entry-complete") === "1"; window.sessionStorage.removeItem("schicksal:entry-complete"); } catch { /* Retain the normal opening when storage is unavailable. */ }
        setPhase((current) => entryCompleted || current === "login" ? "welcome" : current);
      }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  // Election-compatible single source: current titles and visible minister
  // entrance derive from exactly the server roster used for authorization.
  useEffect(() => {
    if (phase !== "welcome" && phase !== "system") return;
    let live = true;
    const refresh = () => {
      void fetch("/api/offices/current", { cache: "no-store" }).then(async response => {
        if (!response.ok) throw new Error("Office roster unavailable");
        const payload = await response.json() as { offices?: Office[] };
        if (!Array.isArray(payload.offices)) throw new Error("Invalid office roster");
        if (live) setOffices(payload.offices);
      }).catch(() => { if (live) setOffices(null); });
      void fetch("/api/member-session", { cache: "no-store" }).then(async response => {
        if (!response.ok) return;
        const payload = await response.json() as { citizenId?: string; accountMode?: AccountMode };
        if (live && payload.citizenId === citizen.id)
          setAccountMode(payload.accountMode === "technology" ? "technology" : "citizen");
      }).catch(() => undefined);
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { live = false; window.removeEventListener("focus", refresh); };
  }, [phase, citizen.id, accountMode]);
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
  if (phase === "login") return <Login replay={() => setPhase("opening")} enter={(next,mode) => { restoreController.current?.abort(); setCitizen(next); setOffices(null); setAccountMode(mode); setPreload({ status: "loading" }); setPhase("welcome"); }} />;
  // A phase transition alone never grants site access. If its live feed
  // is missing, keep the authenticated member on the Welcome gate.
  if (phase === "welcome" || !systemBriefing) return <Welcome citizen={citizen} accountMode={accountMode} offices={offices} enter={enterSystem}
    preloadStatus={preload.citizenId && preload.citizenId !== citizen.id ? "loading" : preload.status}
    retry={retryPreload} />;
  return <System citizen={citizen} accountMode={accountMode} offices={offices} onAccountModeChange={setAccountMode} initialBriefing={systemBriefing.feed}
    logout={() => { void logoutMember(); }} />;
}
