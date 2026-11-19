"use client";

import { useState, type ReactNode } from "react";
import type { MemberPresence } from "./use-member-presence";
import "./sidebar-presence.css";

type Member = { id: string; username: string; locked?: boolean };

/** Single click opens correspondence; no hidden gesture shortcuts. */
export function SidebarPresence({ presence, members, collapsed, selfId, renderMark, onMember }: {
  presence: MemberPresence;
  members: readonly Member[];
  collapsed: boolean;
  selfId: string;
  renderMark: (memberId: string) => ReactNode;
  onMember: (memberId: string) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const onlineIds = new Set(presence.status === "ready" ? presence.online : []);
  const online = [
    ...members.filter(member => member.id === selfId && !member.locked),
    ...members.filter(member => member.id !== selfId && !member.locked && onlineIds.has(member.id)),
  ];
  if (!online.length) return null;
  const badge = (member: Member) => <button type="button" key={member.id}
    title={member.id === selfId ? "我的通讯" : `与${member.username}通讯`}
    aria-label={member.id === selfId ? "打开我的通讯" : `打开与${member.username}的通讯`}
    onClick={() => { setPanelOpen(false); onMember(member.id); }}>
    {renderMark(member.id)}
  </button>;
  return <section className={`schicksal-sidebar-presence ${collapsed ? "is-collapsed" : ""}`}
    aria-label="当前在线成员与我的通讯入口">
    {collapsed ? <>
      <button type="button" className="schicksal-sidebar-presence-opener" aria-label="查看在线成员"
        aria-expanded={panelOpen} onClick={() => setPanelOpen(value => !value)}>
        {online.slice(0, 2).map(member =>
          <span key={member.id} className="schicksal-sidebar-presence-thumbnail">{renderMark(member.id)}</span>)}
      </button>
      {panelOpen && <div className="schicksal-sidebar-presence-popover" role="group" aria-label="在线成员">
        {online.map(badge)}
      </div>}
    </> : <div className="schicksal-sidebar-presence-marks">{online.map(badge)}</div>}
  </section>;
}
