"use client";

import { useState, useRef, type ReactNode } from "react";
import type { MemberPresence } from "./use-member-presence";
import "./sidebar-presence.css";

type Member = { id: string; username: string; locked?: boolean };

/** Click opens correspondence. Hold own emblem opens a separately authorized identity switcher. */
export function SidebarPresence({ presence, members, collapsed, selfId, renderMark, onMember, onSelfLongPress }: {
  presence: MemberPresence;
  members: readonly Member[];
  collapsed: boolean;
  selfId: string;
  renderMark: (memberId: string) => ReactNode;
  onMember: (memberId: string) => void;
  onSelfLongPress?: () => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const stopHold = () => { if (holdTimer.current !== null) clearTimeout(holdTimer.current); holdTimer.current = null; };
  const beginHold = (self:boolean) => {
    stopHold();
    held.current = false;
    if (self && onSelfLongPress) holdTimer.current = setTimeout(() => {
      held.current = true; setPanelOpen(false); onSelfLongPress();
    }, 650);
  };
  const selfHoldProps = (self:boolean) => ({
    onPointerDown: () => beginHold(self),
    onPointerUp: stopHold,
    onPointerLeave: stopHold,
    onPointerCancel: stopHold,
    onContextMenu: (event: import("react").MouseEvent) => { if(self && onSelfLongPress){event.preventDefault();stopHold();held.current=true;onSelfLongPress();} },
    onKeyDown: (event: import("react").KeyboardEvent) => { if(self && event.shiftKey && event.key==="Enter" && onSelfLongPress){event.preventDefault();held.current=true;onSelfLongPress();} },
  });
  const clickSelf = (memberId:string) => {
    if (held.current) { held.current = false; return; }
    setPanelOpen(false); onMember(memberId);
  };
  const onlineIds = new Set(presence.status === "ready" ? presence.online : []);
  const online = [
    ...members.filter(member => member.id === selfId && !member.locked),
    ...members.filter(member => member.id !== selfId && !member.locked && onlineIds.has(member.id)),
  ];
  if (!online.length) return null;
  const badge = (member: Member) => <button type="button" key={member.id}
    title={member.id === selfId ? "我的通讯 · 长按切换账号" : `与${member.username}通讯`}
    aria-label={member.id === selfId ? "打开我的通讯" : `打开与${member.username}的通讯`}
    {...selfHoldProps(member.id===selfId)}
    onClick={() => clickSelf(member.id)}>
    {renderMark(member.id)}
  </button>;
  return <section className={`schicksal-sidebar-presence ${collapsed ? "is-collapsed" : ""}`}
    aria-label="当前在线成员与我的通讯入口">
    {collapsed ? <>
      <button type="button" className="schicksal-sidebar-presence-opener" aria-label="查看在线成员"
        aria-expanded={panelOpen} {...selfHoldProps(true)} onClick={() => {if(held.current){held.current=false;return;}setPanelOpen(value => !value);}}>
        {online.slice(0, 2).map(member =>
          <span key={member.id} className="schicksal-sidebar-presence-thumbnail">{renderMark(member.id)}</span>)}
      </button>
      {panelOpen && <div className="schicksal-sidebar-presence-popover" role="group" aria-label="在线成员">
        {online.map(badge)}
      </div>}
    </> : <div className="schicksal-sidebar-presence-marks">{online.map(badge)}</div>}
  </section>;
}
