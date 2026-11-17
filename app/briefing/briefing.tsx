"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  briefingDeadlineInfo, foundingNews, latestNews, latestUnreadMessages, orderedBriefingTasks,
  type BriefingMessage, type BriefingNews, type BriefingTarget, type BriefingTask,
} from "./briefing-data";
import "./briefing.css";
import "./briefing-palette.css";
import { BriefingBackdrop } from "./briefing-backdrop";

type FeedState = "loading" | "ready" | "not-connected" | "error";
type BriefingIconName = "parliament"|"referendum"|"archives"|"lounge"|"games"|"messenger"|"news"|"affairs";
function BriefingIcon({name,size=26}:{name:BriefingIconName;size?:number}) {
 const props={viewBox:"0 0 32 32",width:size,height:size,fill:"none",stroke:"currentColor",strokeWidth:1.45,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true as const};
 switch(name) {
 case "parliament":return <svg {...props}><path d="M3 13 16 5l13 8M6 14h20M7 26h18M4 29h24M9 15v10M15 15v10M21 15v10M27 15v10M12 11h8"/></svg>;
 case "referendum":return <svg {...props}><path d="M16 5v22M10 10h12M5 25h22M8 11l-5 9h10l-5-9M24 11l-5 9h10l-5-9M5 20q3 5 6 0M21 20q3 5 6 0"/></svg>;
 case "archives":return <svg {...props}><path d="M10 5h15v21H11q-5 0-5 3V10q0-5 4-5ZM10 5v19M13 11h9M13 15h9M13 19h7M5 28q1-4 6-4h14"/></svg>;
 case "lounge":return <svg {...props}><path d="M5 14h20v6c0 5-4 8-10 8S5 25 5 20v-6ZM25 15h2c5 0 4 8-2 8M5 28h22M7 7c0-2 3-3 3-5M14 8c0-2 3-3 3-5M21 7c0-2 3-3 3-5"/></svg>;
 case "games":return <svg {...props}><path d="M10 12h12c4 0 5 2 7 10 1 4-3 6-6 3l-4-3h-6l-4 3c-3 3-7 1-6-3 2-8 3-10 7-10ZM11 15v7M8 18h6M22 16h.01M25 19h.01M16 12V9M13 8h6"/></svg>;
 case "messenger":return <svg {...props}><rect x="3.5" y="7" width="25" height="18" rx="2"/><path d="m4 9 12 9L28 9"/></svg>;
 case "affairs":return <svg {...props}><path d="M11 6h10v4H11zM9 8H6v21h20V8h-3M10 16h12M10 21h12M10 26h8M13 4h6"/></svg>;
 default:return <svg {...props}><path d="M6 5h20v22H6zM10 11h12M10 16h12M10 21h8"/></svg>;
 }
}
function categoryIcon(category:string):BriefingIconName {
 if(/公投|表决/.test(category))return "referendum";
 if(/议会|政务|国家/.test(category))return "parliament";
 if(/游戏/.test(category))return "games";
 if(/Lounge|休息室/.test(category))return "lounge";
 return "archives";
}


export type BriefingProps = {
  onNavigate: (target: BriefingTarget, targetId?: string) => void;
  canEnterLounge: boolean;
  canEnterGames?: boolean;
  sharedMark?: ReactNode;
  heroMark?: ReactNode;
  tasks?: readonly BriefingTask[];
  taskState?: FeedState;
  messages?: readonly BriefingMessage[];
  messageState?: FeedState;
  news?: readonly BriefingNews[];
  newsState?: "loading" | "ready" | "error";
};

/**
 * Decorative hairline wave embroidery: colours follow the canonical eight-member
 * sequence. Never use an image of an emblem here: the live homepage sculpture
 * is mounted separately and left unaltered.
 */
function BriefingWaveEmbroidery() {
  const paths = [
    { color: "#e3bf61", d: "M-30 190 C160 152 224 255 390 198 S680 82 910 164 S1060 219 1190 142" },
    { color: "#679ad3", d: "M-30 200 C152 157 235 268 397 205 S690 98 910 171 S1062 232 1190 150" },
    { color: "#d98486", d: "M-30 210 C152 167 240 275 407 214 S702 107 924 180 S1062 244 1190 160" },
    { color: "#76ae94", d: "M-30 220 C152 177 246 285 419 223 S712 116 940 190 S1070 253 1190 169" },
    { color: "#b3d6e3", d: "M-30 230 C152 187 250 294 431 232 S720 128 948 200 S1070 261 1190 181" },
    { color: "#dba4bf", d: "M-30 240 C152 197 260 304 440 242 S732 141 960 210 S1070 268 1190 189" },
    { color: "#dea46c", d: "M-30 250 C152 207 270 314 454 252 S742 148 974 220 S1085 273 1190 199" },
    { color: "#9987ba", d: "M-30 260 C152 217 280 324 463 261 S752 159 987 229 S1090 280 1190 208" },
  ];
  return <svg className="imperial-briefing-wave-embroidery" viewBox="0 0 1200 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <g fill="none" strokeLinecap="round">
      {paths.map(({ color, d }) => <path key={color} d={d} stroke={color} strokeWidth="1.8"/>)}
      <path d="M-30 140 C180 78 250 177 411 132 S763 38 1180 84" stroke="#b69a67" strokeWidth="1.05" strokeDasharray="2 10" opacity=".42"/>
    </g>
    <g fill="#fbf9f4" stroke="#d2b176" strokeWidth="1.2"><circle cx="410" cy="134" r="3"/><circle cx="920" cy="172" r="2.5"/></g>
  </svg>;
}

function Today() {
  const now = new Date();
  return <time dateTime={now.toISOString().slice(0, 10)} suppressHydrationWarning>
    {new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Singapore", year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(now)}
  </time>;
}

function NewsList({ items, onNavigate, compact = false, state = "ready" }: {
  items: readonly BriefingNews[];
  onNavigate: (target: BriefingTarget, targetId?: string) => void;
  compact?: boolean;
  state?: "loading" | "ready" | "error";
}) {
  const [expanded, setExpanded] = useState(false);
  const ordered = latestNews(items);
  const shown = compact && !expanded ? ordered.slice(0, 4) : ordered;
  return <section className="imperial-briefing-news" aria-label="Daily News">
    <header className="imperial-briefing-block-header">
      <div className="imperial-briefing-news-heading"><span className="imperial-briefing-section-symbol"><BriefingIcon name="news" size={25}/></span><h2>Daily News</h2><span className="imperial-briefing-news-rule" aria-hidden="true"/><small>制宪工作 / 系统更新 / 帝国动态</small></div>
      <span className="imperial-briefing-count">{ordered.length} 条</span>
    </header>
    <div className="imperial-briefing-news-grid">
      {shown.map((item) => <article className="imperial-briefing-news-item" key={item.id}>
        <div className="imperial-briefing-news-line"><span className="imperial-briefing-news-symbol"><BriefingIcon name={categoryIcon(item.category)} size={26}/></span><span>{item.category}</span><time>{new Date(item.publishedAt).toLocaleDateString("zh-CN")}</time></div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        {item.target && <button type="button" className="imperial-briefing-text-button" onClick={() => onNavigate(item.target!, item.targetId)}>查看记录 <span aria-hidden="true">→</span></button>}
      </article>)}
      {shown.length === 0 && <p className="imperial-briefing-empty">尚无已发布的新闻记录。</p>}
    </div>
    {compact && ordered.length > 4 && <button type="button" className="imperial-briefing-more" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>{expanded ? "收起新闻" : "展开全部 · " + ordered.length + " 条新闻"} <span aria-hidden="true">{expanded ? "↑" : "↓"}</span></button>}
    {state === "loading" && <p className="imperial-briefing-footnote">正在同步最新国家动态…</p>}
    {state === "error" && <p className="imperial-briefing-footnote" role="status">新闻同步暂时失败，以下是已保存的历史记录。</p>}
  </section>;
}

function Tasks({ tasks, state, onNavigate, onOpenDesk, full = false }: {
  tasks: readonly BriefingTask[];
  state: FeedState;
  onNavigate: (target: BriefingTarget, targetId?: string) => void;
  onOpenDesk?: () => void;
  full?: boolean;
}) {
  const ordered = orderedBriefingTasks(tasks);
  const displayed = full ? ordered : ordered.slice(0, 3);
  return <section className="imperial-briefing-panel imperial-briefing-tasks" aria-label="我的政务">
    <header className="imperial-briefing-block-header">
      <div className="imperial-briefing-panel-title"><BriefingIcon name="affairs" size={27}/><div><h2>我的政务</h2><span className="imperial-briefing-eyebrow">MY AFFAIRS</span></div></div>
      {state === "ready" && <span className="imperial-briefing-count">{ordered.length} 项</span>}
    </header>
    {state !== "ready" ? <p className="imperial-briefing-empty">{state === "error" ? "政务同步暂时失败，请稍后重试。" : state === "loading" ? "正在查询你的待办…" : "政务同步功能待接入；目前不显示未经核实的个人待办。"}</p> :
      displayed.length === 0 ? <p className="imperial-briefing-empty">目前没有待处理政务。</p> :
      <div className="imperial-briefing-rows">{displayed.map((task) => <div className="imperial-briefing-task-row" key={task.id}>
        <div><strong>{task.title}</strong><small>{task.detail}</small><span>{task.deadline ? `${task.deadlineKind === "expected" ? "议案预期日期" : "截止"}：${briefingDeadlineInfo(task.deadline).label}${briefingDeadlineInfo(task.deadline).passed ? task.deadlineKind === "expected" ? " · 已过预期日期" : " · 已逾期（仍可处理）" : ""}` : "无指定日期"}</span></div>
        <button type="button" onClick={() => onNavigate(task.target, task.targetId)}>处理 →</button>
      </div>)}</div>}
    {state === "ready" && <p className="imperial-briefing-footnote">目前已接入议会投票提醒；其他政务职责将在后续接入。</p>}
    {!full && state === "ready" && ordered.length > 3 && onOpenDesk && <button type="button" className="imperial-briefing-more" onClick={onOpenDesk}>还有 {ordered.length - 3} 项，前往简报台查看全部 →</button>}
  </section>;
}

function Messages({ messages, state, full = false }: {
  messages: readonly BriefingMessage[];
  state: FeedState;
  full?: boolean;
}) {
  const latest = latestUnreadMessages(messages);
  return <section className="imperial-briefing-panel imperial-briefing-messages" aria-label="未读消息">
    <header className="imperial-briefing-block-header">
      <div className="imperial-briefing-panel-title"><BriefingIcon name="messenger" size={27}/><div><h2>未读消息</h2><span className="imperial-briefing-eyebrow">MESSAGES</span></div></div>
      {state === "ready" && <span className="imperial-briefing-count">{messages.length} 条</span>}
    </header>
    {state !== "ready" ? <p className="imperial-briefing-empty">{state === "error" ? "消息暂时无法读取。" : "Messenger 尚未接入，暂不能读取未读消息。"}</p> :
      latest.length === 0 ? <p className="imperial-briefing-empty">暂无未读消息。</p> :
      <div className="imperial-briefing-rows">{latest.map((message) => <div className="imperial-briefing-message-row" key={message.id}>
        <strong>{message.sender}</strong><p>{message.preview}</p><small>{new Date(message.receivedAt).toLocaleString("zh-CN")}</small>
      </div>)}</div>}
    {state === "ready" && messages.length > 2 && <p className="imperial-briefing-footnote">其余 {messages.length - 2} 条消息将在 Messenger 上线后提供会话直达。</p>}
    {full && <p className="imperial-briefing-footnote">Messenger 上线后，点击消息将直接进入对应会话。</p>}
  </section>;
}

function QuickAccess({onNavigate,canEnterLounge,canEnterGames=canEnterLounge}:Pick<BriefingProps,"onNavigate"|"canEnterLounge"|"canEnterGames">) {
 const links:{label:string;en:string;icon:BriefingIconName;target:BriefingTarget|null;available:boolean;note?:string}[]=[
 {label:"议会",en:"PARLIAMENT",icon:"parliament",target:"parliament",available:true},
 {label:"公投",en:"REFERENDUM",icon:"referendum",target:"referendum",available:true},
 {label:"档案",en:"ARCHIVES",icon:"archives",target:"archives",available:true},
 {label:"Lounge",en:"LOUNGE",icon:"lounge",target:"club",available:canEnterLounge,note:"仅向获准成员开放"},
 {label:"游戏",en:"GAMES",icon:"games",target:"games",available:canEnterGames,note:"游艺室需对应权限"},
 {label:"通讯",en:"MESSENGER",icon:"messenger",target:null,available:false,note:"通讯功能尚未上线"}
 ];
 return <section className="imperial-briefing-quick" aria-label="快捷入口">
  <header className="imperial-briefing-block-header"><div className="imperial-briefing-quick-heading"><span className="imperial-briefing-quick-star" aria-hidden="true">✳</span><div><h2>快捷入口</h2><span className="imperial-briefing-eyebrow">QUICK ACCESS</span></div></div></header>
  <div className="imperial-briefing-quick-grid">{links.map(link=><button type="button" key={link.icon} disabled={!link.available} title={link.available?link.label:link.note} aria-label={link.available?link.label:`${link.label}：${link.note}`} onClick={()=>{if(link.target&&link.available)onNavigate(link.target)}}>
    <span className="imperial-briefing-quick-icon"><BriefingIcon name={link.icon} size={27}/></span><span className="imperial-briefing-quick-label"><strong>{link.label}</strong><small>{link.en}</small></span>{!link.available&&<span className="imperial-briefing-quick-unavailable">未开放</span>}
  </button>)}</div>
 </section>;
}

export function BriefingOverlay({
  onClose, onOpenDesk, onNavigate, canEnterLounge, canEnterGames, sharedMark, heroMark,
  tasks = [], taskState = "not-connected", messages = [], messageState = "not-connected", news = foundingNews, newsState = "ready",
}: BriefingProps & { onClose: () => void; onOpenDesk: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);
  return <div className="imperial-briefing-overlay" role="dialog" aria-modal="true" aria-label="帝国简报">
    <div className="imperial-briefing-paper">
      <BriefingBackdrop/>
      <header className="imperial-briefing-topbar">
        <div className="imperial-briefing-brand"><div className="imperial-briefing-logo-slot">{sharedMark}</div><div><strong>SCHICKSAL</strong><small>天命第一帝国</small></div></div>
        <div className="imperial-briefing-topbar-center"><span className="imperial-briefing-header-separator" aria-hidden="true"/><div><h2>帝国简报</h2><small>IMPERIAL BRIEFING</small></div></div><div className="imperial-briefing-topbar-right"><Today/><button ref={closeRef} className="imperial-briefing-close" type="button" aria-label="关闭帝国简报，返回天命首页" onClick={onClose}>×</button></div>
      </header>
      <div className="imperial-briefing-content">
        <section className="imperial-briefing-top-grid">
          <article className="imperial-briefing-lead">
            <div className="imperial-briefing-lead-copy">
              <div className="imperial-briefing-lead-kicker"><span>今日头条</span><small>TODAY'S HEADLINE</small></div>
              <h1>帝国重归，<br/>天命再启</h1>
              <p>天命帝国复辟，国家制度建设开启新的篇章。</p>
              <button type="button" className="imperial-briefing-primary" onClick={() => onNavigate("archives")}>查看详情 <span aria-hidden="true">→</span></button>
            </div>
            <BriefingWaveEmbroidery/>
            <div className="imperial-briefing-hero-art" aria-hidden="true"><div className="imperial-briefing-arcade"/><div className="imperial-briefing-emblem-art">{heroMark}</div></div>
          </article>
          <div className="imperial-briefing-right">
            <Tasks tasks={tasks} state={taskState} onNavigate={onNavigate} onOpenDesk={onOpenDesk}/>
            <Messages messages={messages} state={messageState}/>
          </div>
        </section>
        <NewsList compact items={news} onNavigate={onNavigate} state={newsState}/>
        <QuickAccess canEnterLounge={canEnterLounge} canEnterGames={canEnterGames} onNavigate={onNavigate}/>
      </div>
      <footer className="imperial-briefing-footer"><span>SCHICKSAL · EIGHT CITIZENS · ONE COMMUNITY</span><span>BRIEFING / NATIONAL NEWS</span></footer>
    </div>
  </div>;
}

export function BriefingDesk({
  onOpenBriefing, onNavigate, canEnterLounge, canEnterGames, sharedMark,
  tasks = [], taskState = "not-connected", messages = [], messageState = "not-connected", news = foundingNews, newsState = "ready",
}: BriefingProps & { onOpenBriefing: () => void }) {
  return <div className="imperial-briefing-desk">
    <BriefingBackdrop/>
    <header className="imperial-briefing-desk-header">
      <div><span className="imperial-briefing-eyebrow">IMPERIAL BRIEFING DESK</span><h1>帝国简报台</h1><p>国家动态、个人事务与快捷通道</p></div>
      <button type="button" className="imperial-briefing-open" onClick={onOpenBriefing} aria-label="打开全屏帝国简报"><span aria-hidden="true">▤</span> 打开简报</button>
    </header>
    <div className="imperial-briefing-desk-grid">
      <Tasks full tasks={tasks} state={taskState} onNavigate={onNavigate}/>
      <Messages full messages={messages} state={messageState}/>
    </div>
    <NewsList items={news} onNavigate={onNavigate} state={newsState}/>
    <QuickAccess canEnterLounge={canEnterLounge} canEnterGames={canEnterGames} onNavigate={onNavigate}/>
    <div className="imperial-briefing-desk-signature">{sharedMark}<span>SCHICKSAL · 天命</span></div>
  </div>;
}
