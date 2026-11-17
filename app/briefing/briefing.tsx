"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  briefingDeadlineInfo, foundingNews, latestNews, latestUnreadMessages, orderedBriefingTasks,
  type BriefingMessage, type BriefingNews, type BriefingTarget, type BriefingTask,
} from "./briefing-data";
import "./briefing.css";

type FeedState = "loading" | "ready" | "not-connected" | "error";

export type BriefingProps = {
  onNavigate: (target: BriefingTarget, targetId?: string) => void;
  canEnterLounge: boolean;
  sharedMark?: ReactNode;
  heroMark?: ReactNode;
  tasks?: readonly BriefingTask[];
  taskState?: FeedState;
  messages?: readonly BriefingMessage[];
  messageState?: FeedState;
  news?: readonly BriefingNews[];
  newsState?: "loading" | "ready" | "error";
};

function Today() {
  const now = new Date();
  return <time dateTime={now.toISOString().slice(0, 10)} suppressHydrationWarning>
    {new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(now)}
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
  const shown = compact && !expanded ? ordered.slice(0, 3) : ordered;
  return <section className="imperial-briefing-news" aria-label="Daily News">
    <header className="imperial-briefing-block-header">
      <div><span className="imperial-briefing-eyebrow">THE DAILY CHRONICLE</span><h2>Daily News <span>· 最新动态</span></h2></div>
      <span className="imperial-briefing-count">{ordered.length} 条</span>
    </header>
    <div className="imperial-briefing-news-grid">
      {shown.map((item) => <article className="imperial-briefing-news-item" key={item.id}>
        <div className="imperial-briefing-news-line"><span className="imperial-briefing-news-symbol" aria-hidden="true">✧</span><span>{item.category}</span><time>{new Date(item.publishedAt).toLocaleDateString("zh-CN")}</time></div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        {item.target && <button type="button" className="imperial-briefing-text-button" onClick={() => onNavigate(item.target!, item.targetId)}>查看记录 <span aria-hidden="true">→</span></button>}
      </article>)}
      {shown.length === 0 && <p className="imperial-briefing-empty">尚无已发布的新闻记录。</p>}
    </div>
    {compact && ordered.length > 3 && <button type="button" className="imperial-briefing-more" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>{expanded ? "收起新闻" : "展开全部新闻（" + ordered.length + "）"} <span aria-hidden="true">{expanded ? "↑" : "↓"}</span></button>}
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
      <div><span className="imperial-briefing-eyebrow">MY AFFAIRS</span><h2>我的政务</h2></div>
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
      <div><span className="imperial-briefing-eyebrow">MESSAGES</span><h2>未读消息</h2></div>
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

function QuickAccess({ onNavigate, canEnterLounge }: Pick<BriefingProps, "onNavigate" | "canEnterLounge">) {
  const links: { label: string; en: string; icon: string; target: BriefingTarget }[] = [
    { label: "议会", en: "Parliament", icon: "⌂", target: "parliament" },
    { label: "国家档案", en: "Archives", icon: "▤", target: "archives" },
    { label: "影像馆", en: "Gallery", icon: "▧", target: "photos" },
    ...(canEnterLounge ? [{ label: "Lounge", en: "Committee", icon: "✧", target: "club" as const }] : []),
    { label: "个人档案", en: "Profile", icon: "◇", target: "profile" },
  ];
  return <section className="imperial-briefing-quick" aria-label="快捷入口">
    <header className="imperial-briefing-block-header"><div><span className="imperial-briefing-eyebrow">DIRECT ACCESS</span><h2>快捷入口</h2></div></header>
    <div>{links.map((link) => <button type="button" key={link.target} onClick={() => onNavigate(link.target)}>
      <span className="imperial-briefing-quick-icon" aria-hidden="true">{link.icon}</span><strong>{link.label}</strong><small>{link.en}</small>
    </button>)}</div>
  </section>;
}

export function BriefingOverlay({
  onClose, onOpenDesk, onNavigate, canEnterLounge, sharedMark, heroMark,
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
      <header className="imperial-briefing-topbar">
        <div className="imperial-briefing-brand"><div className="imperial-briefing-logo-slot">{sharedMark}</div><div><strong>SCHICKSAL</strong><small>IMPERIAL BRIEFING · 帝国简报</small></div></div>
        <div className="imperial-briefing-topbar-right"><Today/><button ref={closeRef} className="imperial-briefing-close" type="button" aria-label="关闭帝国简报，返回天命首页" onClick={onClose}>×</button></div>
      </header>
      <div className="imperial-briefing-content">
        <section className="imperial-briefing-top-grid">
          <article className="imperial-briefing-lead">
            <span className="imperial-briefing-eyebrow">THE FIRST EMPIRE · NATIONAL CHRONICLE</span>
            <h1>帝国重归，<br/><em>天命再启。</em></h1>
            <p>天命第一帝国正式复辟。历史继续书写，新的国家制度与共同生活由此展开。</p>
            <button type="button" className="imperial-briefing-primary" onClick={() => onNavigate("archives")}>查看复辟记录 <span aria-hidden="true">→</span></button>
            <div className="imperial-briefing-hero-art">{heroMark}</div>
          </article>
          <div className="imperial-briefing-right">
            <Tasks tasks={tasks} state={taskState} onNavigate={onNavigate} onOpenDesk={onOpenDesk}/>
            <Messages messages={messages} state={messageState}/>
          </div>
        </section>
        <NewsList compact items={news} onNavigate={onNavigate} state={newsState}/>
        <QuickAccess canEnterLounge={canEnterLounge} onNavigate={onNavigate}/>
      </div>
      <footer className="imperial-briefing-footer"><span>SCHICKSAL · EIGHT CITIZENS · ONE COMMUNITY</span><span>BRIEFING / NATIONAL NEWS</span></footer>
    </div>
  </div>;
}

export function BriefingDesk({
  onOpenBriefing, onNavigate, canEnterLounge, sharedMark,
  tasks = [], taskState = "not-connected", messages = [], messageState = "not-connected", news = foundingNews, newsState = "ready",
}: BriefingProps & { onOpenBriefing: () => void }) {
  return <div className="imperial-briefing-desk">
    <header className="imperial-briefing-desk-header">
      <div><span className="imperial-briefing-eyebrow">IMPERIAL BRIEFING DESK</span><h1>帝国简报台</h1><p>国家动态、个人事务与快捷通道</p></div>
      <button type="button" className="imperial-briefing-open" onClick={onOpenBriefing} aria-label="打开全屏帝国简报"><span aria-hidden="true">▤</span> 打开简报</button>
    </header>
    <div className="imperial-briefing-desk-grid">
      <Tasks full tasks={tasks} state={taskState} onNavigate={onNavigate}/>
      <Messages full messages={messages} state={messageState}/>
    </div>
    <NewsList items={news} onNavigate={onNavigate} state={newsState}/>
    <QuickAccess canEnterLounge={canEnterLounge} onNavigate={onNavigate}/>
    <div className="imperial-briefing-desk-signature">{sharedMark}<span>SCHICKSAL · 天命</span></div>
  </div>;
}
