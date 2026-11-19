import type { ReactNode } from "react";

/** Consistent 20px stroked icons for expanded and collapsed navigation. */
export function NavigationIcon({ name, size = 20 }: { name: string; size?: number }) {
  const shared = { viewBox: "0 0 24 24", width: size, height: size, fill: "none",
    stroke: "currentColor", strokeWidth: 1.65, strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const drawings: Record<string, ReactNode> = {
    house: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/></>,
    newspaper: <><path d="M4 4h15v15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6h1"/><path d="M8 8h7v5H8zM8 17h7M18 8h3v11a2 2 0 0 1-2 2"/></>,
    landmark: <><path d="m2 9 10-6 10 6M3 9h18M4 21h16M2 23h20M6 11v8M10 11v8M14 11v8M18 11v8"/></>,
    library: <><path d="M3 4v16M8 3v17M13 5v15M18 4l3 16M2 21h20M2 3h6M9 4h4"/></>,
    celebration: <><path d="m5 21 5-12 9 9-13 4zM10 9l9 9M16 4c0 2-1 3-3 3M21 9c-2 0-3 1-3 3M18 3l.5.5M21 4l.5.5M11 3l.5.5"/></>,
    gift: <><rect x="3" y="9" width="18" height="12" rx="1"/><path d="M2 6h20v4H2zM12 6v15M12 6c-4-1-6-2-6-4 0-3 6-2 6 4ZM12 6c4-1 6-2 6-4 0-3-6-2-6 4Z"/></>,
    phone: <><path d="M22 16.6v3a2.4 2.4 0 0 1-2.6 2.4A19 19 0 0 1 2 4.6 2.4 2.4 0 0 1 4.4 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L7.5 10a15 15 0 0 0 6.5 6.5l1.5-1.8a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 2Z"/></>,
    chevron: <path d="m9 6 6 6-6 6"/>,
  };
  return <svg {...shared}>{drawings[name] ?? drawings.chevron}</svg>;
}
