"use client";

import { useState, type ReactNode } from "react";
import type { MemberPresence } from "./use-member-presence";
import "./sidebar-presence.css";

type Member = { id: string; username: string; locked?: boolean };

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
  // The signed-in member must remain reachable even during the first presence
  // heartbeat. Other badges represent currently online members only.
  const online = [
    ...members.filter(member => member.id === selfId && !member.locked),
    ...members.filter(member => member.id !== selfId && !member.locked && onlineIds.has(member.id)),
  ];
  if (!online.length) return null;

  return <section className={`schicksal-sidebar-presence ${collapsed ? "is-collapsed" : ""}`}
    aria-label="当前在线成员">
    {collapsed ? <>
      <button type="button" className="schicksal-sidebar-presence-opener"
        aria-label="展开在线成员标识" aria-expanded={panelOpen}
        onClick={() => setPanelOpen(open => !open)}>
        {online.slice(0, 2).map(member =>
          <span key={member.id} className="schicksal-sidebar-presence-thumbnail">{renderMark(member.id)}</span>)}
      </button>
      {panelOpen && <div className="schicksal-sidebar-presence-popover" role="group" aria-label="在线成员">
        {online.map(member => <button type="button" key={member.id}
          title={member.username} aria-label={`查看${member.username}的公开档案`}
          onClick={() => { setPanelOpen(false); onMember(member.id); }}>
          {renderMark(member.id)}
        </button>)}
      </div>}
    </> : <div className="schicksal-sidebar-presence-marks">
      {online.map(member => <button type="button" key={member.id}
        title={member.username} aria-label={`查看${member.username}的公开档案`}
        onClick={() => onMember(member.id)}>
        {renderMark(member.id)}
      </button>)}
    </div>}
  </section>;
}
