"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { MemberPresence } from "./use-member-presence";
import "./sidebar-presence.css";

type Member = { id: string; username: string; locked?: boolean };

export function SidebarPresence({ presence, members, collapsed, selfId, renderMark, onMember, onOpenIndex }: {
  presence: MemberPresence;
  members: readonly Member[];
  collapsed: boolean;
  selfId: string;
  renderMark: (memberId: string) => ReactNode;
  onMember: (memberId: string) => void;
  onOpenIndex: () => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const cancelPress = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    startPoint.current = null;
  };
  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);
  const beginPress = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    cancelPress();
    suppressClick.current = false;
    if (id !== selfId) return;
    startPoint.current = { x: event.clientX, y: event.clientY };
    timer.current = setTimeout(() => {
      timer.current = null;
      suppressClick.current = true;
      setPanelOpen(false);
      onOpenIndex();
    }, 600);
  };
  const movePress = (event: PointerEvent<HTMLButtonElement>) => {
    if (!startPoint.current) return;
    if (Math.hypot(startPoint.current.x - event.clientX, startPoint.current.y - event.clientY) > 12) cancelPress();
  };
  const clickMember = (event: React.MouseEvent<HTMLButtonElement>, memberId: string) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      event.preventDefault();
      return;
    }
    setPanelOpen(false);
    onMember(memberId);
  };
  const onlineIds = new Set(presence.status === "ready" ? presence.online : []);
  // The signed-in member is always reachable; all other badges represent
  // currently online members (offline contacts remain in the messenger index).
  const online = [
    ...members.filter(member => member.id === selfId && !member.locked),
    ...members.filter(member => member.id !== selfId && !member.locked && onlineIds.has(member.id)),
  ];
  if (!online.length) return null;

  const badge = (member: Member) => <button type="button" key={member.id}
    title={member.id === selfId ? "我的通讯 · 长按打开全部通讯" : `与${member.username}通讯`}
    aria-label={member.id === selfId ? "打开我的私人通讯" : `打开与${member.username}的私聊`}
    onPointerDown={event => beginPress(event, member.id)}
    onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerLeave={cancelPress} onPointerMove={movePress}
    onContextMenu={event => { if (member.id === selfId) event.preventDefault(); }}
    onClick={event => clickMember(event, member.id)}>
    {renderMark(member.id)}
  </button>;

  return <section className={`schicksal-sidebar-presence ${collapsed ? "is-collapsed" : ""}`}
    aria-label="当前在线成员和自己的通讯入口">
    {collapsed ? <>
      <button type="button" className="schicksal-sidebar-presence-opener"
        aria-label="展开在线成员标识，长按打开通讯总页面" aria-expanded={panelOpen}
        onPointerDown={event => beginPress(event, selfId)}
        onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerLeave={cancelPress} onPointerMove={movePress}
        onContextMenu={event => event.preventDefault()}
        onClick={event => { if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); return; } setPanelOpen(open => !open); }}>
        {online.slice(0, 2).map(member =>
          <span key={member.id} className="schicksal-sidebar-presence-thumbnail">{renderMark(member.id)}</span>)}
      </button>
      {panelOpen && <div className="schicksal-sidebar-presence-popover" role="group" aria-label="在线成员">
        {online.map(badge)}
      </div>}
    </> : <div className="schicksal-sidebar-presence-marks">
      {online.map(badge)}
    </div>}
  </section>;
}
