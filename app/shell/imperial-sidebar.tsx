"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import type { Citizen } from "../citizens";
import type { MemberPresence } from "../briefing/use-member-presence";
import { SidebarPresence } from "../briefing/sidebar-presence";
import { PRIMARY_NAV, COLLECTION_NAV, type SidebarDestination } from "./navigation";
import { NavigationIcon } from "./navigation-icons";

const COLLECTION_IDS = new Set<string>(["library", "atlas", "photos", "archives"]);

export function ImperialSidebar({ activeSection, collapsed, loungeOpen, canEnterLounge, sharedMark,
  presence, members, selfId, renderMemberMark, onToggle, onLogo, onNavigate, onLogout }: {
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
}) {
  const [collectionExpanded, setCollectionExpanded] = useState(() => COLLECTION_IDS.has(activeSection));
  useEffect(() => {
    if (COLLECTION_IDS.has(activeSection)) setCollectionExpanded(true);
  }, [activeSection]);
  const openCollection = () => {
    if (collapsed) {
      onToggle();
      setCollectionExpanded(true);
    } else {
      setCollectionExpanded(value => !value);
    }
  };
  return <aside className="sidebar imperial-sidebar" id="imperial-sidebar">
    <div className="side-brand imperial-side-brand">
      <button className="imperial-logo-trigger" type="button" onClick={onLogo}
        aria-label={loungeOpen ? "返回天命主站" : canEnterLounge ? "进入 Committee Lounge" : "返回首页"}
        title={loungeOpen ? "返回天命主站" : canEnterLounge ? "进入秘密 Lounge" : "返回首页"}>
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
      {PRIMARY_NAV.map(item => item.id === "collection" ? <div key={item.id} className="imperial-nav-group">
        <button type="button" className={`imperial-nav-entry ${COLLECTION_IDS.has(activeSection) ? "active" : ""}`}
          aria-label="展开或收起帝国馆藏子菜单" aria-expanded={collectionExpanded && !collapsed}
          aria-controls="imperial-collection-submenu" title={item.label} onClick={openCollection}>
          <span className="imperial-nav-icon"><NavigationIcon name={item.icon}/></span>
          <strong>{item.label}</strong>
          <span className={`imperial-nav-chevron ${collectionExpanded ? "expanded" : ""}`} aria-hidden="true"><NavigationIcon name="chevron" size={15}/></span>
        </button>
        {collectionExpanded && !collapsed && <div id="imperial-collection-submenu" className="imperial-nav-submenu">
          {COLLECTION_NAV.map(child => <button type="button" key={child.id}
            className={activeSection === child.id ? "active" : ""}
            aria-current={activeSection === child.id ? "page" : undefined}
            onClick={() => onNavigate(child.id)}>{child.label}</button>)}
        </div>}
      </div> : <button type="button" key={item.id}
        className={`imperial-nav-entry ${activeSection === item.id || item.id === "honors" && activeSection === "market" ? "active" : ""}`}
        aria-current={activeSection === item.id ? "page" : undefined}
        title={item.label} onClick={() => onNavigate(item.id)}>
        <span className="imperial-nav-icon"><NavigationIcon name={item.icon}/></span><strong>{item.label}</strong>
      </button>)}
    </nav>
    <div className="schicksal-sidebar-footer">
      <SidebarPresence presence={presence} members={members} collapsed={collapsed} selfId={selfId}
        renderMark={renderMemberMark} onMember={() => onNavigate("messenger")}/>
      <button type="button" className="schicksal-sidebar-logout"
        onClick={onLogout} title="退出登录" aria-label="退出登录">↗</button>
    </div>
  </aside>;
}
