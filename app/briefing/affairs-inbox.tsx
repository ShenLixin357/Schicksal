"use client";

import { useEffect, useState } from "react";
import {
  briefingCountdown, briefingDateTime, briefingDeadlineInfo, briefingTaskIndicator,
  orderedBriefingTasks, type BriefingTarget, type BriefingTask,
} from "./briefing-data";
import type { InboxViews } from "./affairs-history";
import "./affairs-inbox.css";

type Tab = "pending" | "participated" | "missed" | "archived";
type Action = "archive" | "restore";
const TABS: readonly { id: Tab; label: string; description: string }[] = [
  { id: "pending", label: "待处理", description: "正在开放的个人政务，按重要性与截止时间排序" },
  { id: "participated", label: "已参与", description: "最近 30 天参与过的正式程序" },
  { id: "missed", label: "已错过", description: "截止后未参与的历史事项" },
  { id: "archived", label: "归档箱", description: "已收起的个人政务，可随时恢复至对应分类" },
];
type Undo = { task: BriefingTask; tab: Tab; index: number; action: Action };

export function AffairsInbox({ views, status, onArchiveChange, onNavigate }: {
  views: InboxViews;
  status: "loading" | "ready" | "error" | "not-connected";
  onArchiveChange: (taskId: string, action: Action) => Promise<void>;
  onNavigate: (target: BriefingTarget, targetId?: string, focus?: BriefingTask["focus"]) => void;
}) {
  const [tab, setTab] = useState<Tab>("pending");
  const [now, setNow] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const ticker = window.setInterval(update, 1000);
    return () => window.clearInterval(ticker);
  }, []);
  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => setUndo(null), 7000);
    return () => window.clearTimeout(timer);
  }, [undo]);

  const active = TABS.find(t => t.id === tab)!;
  const items = tab === "pending" ? orderedBriefingTasks(views.pending, now ?? undefined) : [...views[tab]];
  const rows: {task: BriefingTask; placeholder: boolean}[] = items.map(task => ({ task, placeholder: false }));
  if (undo?.tab === tab) {
    const i = rows.findIndex(row => row.task.id === undo.task.id);
    if (i !== -1) rows.splice(i, 1);
    rows.splice(Math.min(undo.index, rows.length), 0, { task: undo.task, placeholder: true });
  }
  const apply = async (task: BriefingTask, action: Action, index: number) => {
    if (busy) return;
    setBusy(task.id); setError("");
    try {
      await onArchiveChange(task.id, action);
      setUndo({ task, tab, index, action });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "归档操作未完成。");
    } finally { setBusy(null); }
  };
  return <section className="imperial-briefing-panel imperial-briefing-tasks imperial-affairs-inbox" aria-label="我的政务收件箱">
    <header className="imperial-briefing-block-header">
      <div className="imperial-briefing-panel-title">
        <span className="imperial-affairs-heading-symbol" aria-hidden="true">✧</span>
        <div><h2>我的政务</h2><span className="imperial-briefing-eyebrow">MY AFFAIRS</span></div>
      </div>
      {status === "ready" && <span className="imperial-briefing-count">{views.pending.length} 项待处理</span>}
    </header>
    <nav className="imperial-affairs-tabs" aria-label="政务收件箱分类">
      {TABS.map(item => <button type="button" key={item.id} className={tab === item.id ? "active" : ""}
        aria-current={tab === item.id ? "page" : undefined} onClick={() => { setTab(item.id); setUndo(null); setError(""); }}>
        {item.label} <span>{status === "ready" ? views[item.id].length : "—"}</span>
      </button>)}
    </nav>
    <p className="imperial-affairs-description">{active.description}</p>
    {error && <p className="imperial-affairs-error" role="alert">{error}</p>}
    {status !== "ready" ? <p className="imperial-briefing-empty">
      {status === "loading" ? "正在同步政务状态…" : "政务资料暂时不可用，请稍后重试。"}
    </p> : rows.length === 0 ? <p className="imperial-briefing-empty">{
      tab === "pending" ? "目前没有待处理政务。" : tab === "participated" ? "最近 30 天没有正式参与记录。" :
      tab === "missed" ? "暂无已错过的正式事项。" : "归档箱暂时为空。"
    }</p> : <div className="imperial-briefing-rows">
      {rows.map(({ task, placeholder }, index) => {
        if (placeholder) return <div className="imperial-affairs-undo-row" key={task.id} role="status">
          <span>{undo?.action === "archive" ? "已移入归档箱" : "已恢复到待处理"}</span>
          <button type="button" disabled={Boolean(busy)} onClick={async () => {
            if (!undo || busy) return;
            setBusy(task.id);
            try {
              await onArchiveChange(task.id, undo.action === "archive" ? "restore" : "archive");
              setUndo(null);
            } catch (cause) { setError(cause instanceof Error ? cause.message : "撤销失败。"); }
            finally { setBusy(null); }
          }}>撤销</button>
        </div>;
        const isExpected = task.deadlineKind === "expected" && Boolean(task.deadline);
        const dateLabel = task.deadline ? briefingDeadlineInfo(task.deadline).label : "尚未设置";
        const timeLeft = task.deadlineKind === "deadline" && now !== null
          ? briefingDateTime(task.deadline) - now : Number.POSITIVE_INFINITY;
        const urgent = timeLeft > 0 && timeLeft <= 48 * 3600_000;
        const important = task.priority === "important";
        const indicator = briefingTaskIndicator(task, now ?? Number.NEGATIVE_INFINITY);
        const tone = indicator.tone;
        const countdown = task.deadline ? now !== null ? briefingCountdown(task.deadline, now) : "计算中…" : "—";
        const label = tab === "participated" ? "已参与" : tab === "missed" ? "已错过" :
          indicator.label;
        return <article key={task.id} className={`imperial-briefing-task-row imperial-affair-card ${tone} ${tab === "missed" ? "affair-past" : busy === task.id ? "affair-folding" : ""}`}>
          <div className="imperial-briefing-task-details">
            <span className="imperial-briefing-task-category">{label}</span>
            <strong>{task.title}</strong>
            <small>{task.detail}</small>
            {tab === "participated" && task.completedAt && <small>参与时间：{briefingDeadlineInfo(task.completedAt).label}</small>}
            <div className="imperial-briefing-deadline" aria-label="政务时间信息">
              <span>{isExpected ? "预期日期" : "DDL"}：{dateLabel}</span>
              <time aria-live="off" className={important && urgent ? "affair-yellow-countdown" : ""}>
                {isExpected ? "距预期" : "剩余"}：{isExpected && countdown === "已到期" ? "预期已过" : countdown}
              </time>
            </div>
          </div>
          <div className="imperial-affair-actions">
            <button type="button" className="imperial-affair-entry" onClick={() => onNavigate(task.target, task.targetId, task.focus)}>
              {tab === "participated" || tab === "missed" ? "查看议案 →" : "进入议案 →"}
            </button>
            {(tab === "pending" || tab === "archived") && (tab === "archived" || !important) &&
              <button type="button" className="imperial-affair-archive" disabled={Boolean(busy)}
                onClick={() => void apply(task, tab === "archived" ? "restore" : "archive", index)}>
                {tab === "archived" ? "撤销归档" : "归档"}
              </button>}
          </div>
        </article>;
      })}
    </div>}
  </section>;
}
