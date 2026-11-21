"use client";

import { useEffect, useState } from "react";
import type { PrimaryNavItem, SidebarDestination, SubNavItem } from "./navigation";
import { NavigationIcon } from "./navigation-icons";

/** The original site presents one clear title and a quiet English translation. */
export function SidebarNavCopy({ label, en }: Pick<PrimaryNavItem, "label" | "en">) {
  return <span className="imperial-nav-copy">
    <strong>{label}</strong>
    <small aria-hidden="true">{en}</small>
  </span>;
}

/** Both Collection and Points share the same accessible submenu behaviour.
 * Keeping expansion local avoids duplicating two state machines in the shell.
 */
export function SidebarMenuGroup({ item, items, menuId, indexLabel, activeSection, collapsed, onExpandSidebar, onNavigate }: {
  item: PrimaryNavItem;
  items: readonly SubNavItem[];
  menuId: "collection" | "points";
  indexLabel: string;
  activeSection: string;
  collapsed: boolean;
  onExpandSidebar: () => void;
  onNavigate: (id: SidebarDestination) => void;
}) {
  const containsActive = items.some(child => child.id === activeSection);
  const [expanded, setExpanded] = useState(containsActive);
  useEffect(() => {
    if (containsActive) setExpanded(true);
  }, [containsActive]);

  const toggle = () => {
    if (collapsed) {
      onExpandSidebar();
      setExpanded(true);
    } else {
      setExpanded(current => !current);
    }
  };

  return <div className="imperial-nav-group">
    <button type="button"
      className={`imperial-nav-entry ${containsActive ? "active" : ""}`}
      aria-expanded={expanded && !collapsed}
      aria-controls={`imperial-${menuId}-submenu`}
      title={item.label} onClick={toggle}>
      <span className="imperial-nav-number" aria-hidden="true">{indexLabel}</span>
      <SidebarNavCopy label={item.label} en={item.en}/>
      <span className={`imperial-nav-chevron ${expanded ? "expanded" : ""}`} aria-hidden="true">
        <NavigationIcon name="chevron" size={15}/>
      </span>
    </button>
    {expanded && !collapsed && <div id={`imperial-${menuId}-submenu`} className="imperial-nav-submenu">
      {items.map(child => <button type="button" key={child.id}
        className={activeSection === child.id ? "active" : ""}
        aria-current={activeSection === child.id ? "page" : undefined}
        onClick={() => onNavigate(child.id)}>{child.label}</button>)}
    </div>}
  </div>;
}
