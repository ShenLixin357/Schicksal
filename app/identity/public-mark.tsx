"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { Citizen } from "../citizens";
import { isCurrentPresident } from "./office-registry";
import { getPublicMemberVisual } from "./visual-registry";

/**
 * Public mark renderer for the site shell, Library, Atlas and future modules.
 * This is not a Lounge magic sigil. Approved SVG paths and PNG art unchanged.
 * Future public image replacements require only visual-registry.ts edits.
 */
export function PublicCitizenMark({ citizen, display = "web" }: { citizen: Citizen; display?: "web" | "official" }) {
  const leaderClass = isCurrentPresident(citizen.id) ? " leader" : "";
  // Beige-page Simple uses the approved emphasized gold; official in parliament
  // and on other non-ivory surfaces. This colour NEVER flows into score/other UI.
  // Original circles and President-only points inherit the exact same --mark hue.
  const visual = getPublicMemberVisual(citizen.id);
  const markColor = display === "official" ? (visual?.officialMarkColor ?? citizen.markColor) : (visual?.webMarkColor ?? citizen.markColor);
  const markAsset = display === "official" ? visual?.officialMarkAsset : visual?.webMarkAsset;
  if (markAsset) {
    return <span className={`citizen-mark personal-simple${leaderClass}`} style={{ "--mark": markColor } as CSSProperties} aria-hidden="true">
      <Image src={markAsset} alt="" width={800} height={800} unoptimized className="citizen-simple-image" />
    </span>;
  }
  let sigil: ReactNode;
  switch (citizen.motif) {
    case "flame":
      sigil = <><path d="M35.5 7.5c2.1 11.3-6.6 13.8-5.4 23.1 4.1-2.2 6.8-6 7.5-10.6 7.4 6.5 12 13 11.1 21.5-.9 8.8-7.8 15.4-16.8 15.4-9.6 0-17.1-7-16.7-16.4.3-7 4.6-13.7 12.2-20.2-.4 5.4 1.1 8.7 3.6 10.7-1-9.7 6.3-13.4 4.5-23.5Z" /><path d="M32 51c-5.1 0-8.6-3.8-8.2-8.4.3-3.7 2.5-6.8 6.1-10.2-.1 4.3 1.8 6.3 4 8.1 1.4-2.4 2.1-4.9 1.9-7.7 3.4 3.3 5 6.5 4.5 10.1-.6 4.6-3.6 8.1-8.3 8.1Z" /></>;
      break;
    case "lightning":
      sigil = <><path className="sigil-fill" d="M37.6 5 15 35.4h14.3L25.9 59 49 26.2H34.7L37.6 5Z" /><path d="M41.7 9.5 24.6 31h10.5l-2 14.8 13.5-17.1H38l3.7-19.2Z" /></>;
      break;
    case "water":
      sigil = <><path d="M32 7C24.4 17.6 15.8 27.3 15.8 38.6c0 9.1 7.2 16.4 16.2 16.4s16.2-7.3 16.2-16.4C48.2 27.3 39.6 17.6 32 7Z" /><path d="M20.5 39.5c3.4 3.5 7.1 3.5 11 0s7.6-3.5 12 0M23 47c2.9 2.4 5.9 2.4 9 0s6.1-2.4 9 0" /></>;
      break;
    case "wind":
      sigil = <><path d="M9 23h30c7.8 0 8.5-10.5 1-11.8-4.1-.7-6.5 1.8-7.1 4.8M9 32h39c8.4 0 8.5 12.2-.1 12.2-4.1 0-6.5-2.7-6.5-5.5M9 41h22c6.9 0 7 10 .2 10-3.2 0-5.2-1.9-5.8-4" /></>;
      break;
    default:
      sigil = <><path d="M18 18h28v28H18z" /><path d="m18 18 28 28m0-28L18 46" /></>;
  }
  return <span className={`citizen-mark ${citizen.motif}${leaderClass}`} style={{ "--mark": markColor } as CSSProperties} aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{sigil}</svg></span>;
}

