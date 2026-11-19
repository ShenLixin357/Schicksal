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
    // Approved party popper: a flared paper cone with curling ribbons, NOT fireworks.
    celebration: <><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/></>,
    gift: <><rect x="3" y="9" width="18" height="12" rx="1"/><path d="M2 6h20v4H2zM12 6v15M12 6c-4-1-6-2-6-4 0-3 6-2 6 4ZM12 6c4-1 6-2 6-4 0-3-6-2-6 4Z"/></>,
    phone: <><path d="M22 16.6v3a2.4 2.4 0 0 1-2.6 2.4A19 19 0 0 1 2 4.6 2.4 2.4 0 0 1 4.4 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L7.5 10a15 15 0 0 0 6.5 6.5l1.5-1.8a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 2Z"/></>,
    chevron: <path d="m9 6 6 6-6 6"/>,
  };
  return <svg {...shared}>{drawings[name] ?? drawings.chevron}</svg>;
}
