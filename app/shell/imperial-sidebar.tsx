"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { Citizen } from "../citizens";
import type { MemberPresence } from "../briefing/use-member-presence";
import { SidebarPresence } from "../briefing/sidebar-presence";
import { PRIMARY_NAV, COLLECTION_NAV, POINTS_NAV, type SidebarDestination } from "./navigation";
import { NavigationIcon } from "./navigation-icons";
import { SidebarMenuGroup, SidebarNavCopy } from "./sidebar-menu-group";

export function ImperialSidebar({ activeSection, collapsed, loungeOpen, canEnterLounge, sharedMark,
  presence, members, selfId, renderMemberMark, onToggle, onLogo, onNavigate, onLogout, onSelfLongPress }: {
  activeSection: string;
  collapsed: boolean;
  loungeOpen: boolean;
  canEnterLounge: boolean;
  sharedMark: ReactNode;
  presence: MemberPresence;
  members: readonly Citizen[];
  selfId: string;
  renderMemberMark: (memberId: string) => ReactNode;
  onToggle: () => void;
  onLogo: () => void;
  onNavigate: (id: SidebarDestination) => void;
  onLogout: () => void;
  onSelfLongPress?: () => void;
}) {
  return <aside className="sidebar imperial-sidebar" id="imperial-sidebar">
    <div className="side-brand imperial-side-brand">
      <button className="imperial-logo-trigger" type="button" onClick={onLogo}
        disabled={!canEnterLounge && !loungeOpen}
        aria-label={loungeOpen ? "返回天命主站" : canEnterLounge ? "进入 Committee Lounge" : "天命第一帝国标志"}
        title={loungeOpen ? "返回天命主站" : canEnterLounge ? "进入秘密 Lounge" : "天命第一帝国"}>
        {loungeOpen
          ? <Image src="/committee-restroom-badge.png" width={58} height={58} alt="" unoptimized className="imperial-lounge-mark"/>
          : sharedMark}
      </button>
      <div className="imperial-side-heading"><strong>SCHICKSAL</strong><span>天命第一帝国</span></div>
      <div className="imperial-side-utilities">
        <button className="sidebar-toggle" type="button" onClick={onToggle}
          aria-controls="imperial-navigation" aria-expanded={!collapsed}
          aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"} title={collapsed ? "展开侧边栏" : "收起侧边栏"}>
          {collapsed ? "›" : "‹"}
        </button>
        <button className="imperial-phone" type="button" onClick={() => onNavigate("messenger")}
          aria-label="帝国通讯" title="帝国通讯">
          <NavigationIcon name="phone" size={20}/>
        </button>
      </div>
    </div>
    <nav className="imperial-main-nav" id="imperial-navigation" aria-label="帝国主导航">
      {PRIMARY_NAV.map(item => item.id === "collection" || item.id === "honors"
        ? <SidebarMenuGroup key={item.id} item={item}
          menuId={item.id === "collection" ? "collection" : "points"}
          items={item.id === "collection" ? COLLECTION_NAV : POINTS_NAV}
          activeSection={activeSection} collapsed={collapsed}
          onExpandSidebar={onToggle} onNavigate={onNavigate}/>
        : <button type="button" key={item.id}
          className={`imperial-nav-entry ${activeSection === item.id ? "active" : ""}`}
          aria-current={activeSection === item.id ? "page" : undefined}
          title={item.label} onClick={() => onNavigate(item.id)}>
          <span className="imperial-nav-icon"><NavigationIcon name={item.icon}/></span>
          <SidebarNavCopy label={item.label} en={item.en}/>
        </button>)}
    </nav>
    <div className="schicksal-sidebar-footer">
      <SidebarPresence presence={presence} members={members} collapsed={collapsed} selfId={selfId}
        renderMark={renderMemberMark} onMember={() => onNavigate("messenger")} onSelfLongPress={onSelfLongPress}/>
      <button type="button" className="schicksal-sidebar-logout"
        onClick={onLogout} title="退出登录" aria-label="退出登录">↗</button>
    </div>
  </aside>;
}
