"use client";

import type { CSSProperties, ReactNode } from "react";
import { type Citizen, citizenRepresentativeColor } from "../citizens";
import { atlasName } from "../atlas/atlas-data";
import { officesForCitizen, type Office } from "../identity/office-registry";
import { PageHead } from "../shell/page-head";
import { ProfileCrystalEmblem } from "./profile-crystal-emblem";
import { PersonalExplorationSummary } from "../guide/personal-exploration-summary";
import { PersonalAchievements } from "./personal-achievements";

/** The personal page retains the original badge supplied by its parent.
 * No member artwork or official colour is recomputed here.
 */
export function SelfProfilePage({ citizen, renderMark, offices }: { citizen: Citizen; renderMark: ReactNode; offices: readonly Office[] | null }) {
  return <><PageHead eyebrow="Citizen Profile" title="个人身份档案" copy="登录用户名、正式身份、个人标志与历史荣誉在这里汇合。" /><article className="profile" style={{ "--citizen": citizenRepresentativeColor(citizen) } as CSSProperties}><div className="profile-mark"><ProfileCrystalEmblem color={citizenRepresentativeColor(citizen)}/>{renderMark}<span>{citizen.username}</span></div><div className="profile-copy"><small>AUTHENTICATED CITIZEN</small><h2>{atlasName(citizen)}</h2><dl><div><dt>Login Username</dt><dd>{citizen.username}</dd></div><div><dt>Current Office</dt><dd>{offices ? officesForCitizen(citizen.id, offices).map(o=>o.title).join(" · ") || "暂无现任公职" : "正在核验现任职务"}</dd></div><div><dt>Personal Mark</dt><dd>{citizen.id === "amberina" ? "Golden Solar Snowflake" : citizen.id === "zxy" ? "Garnet Red Skull Emblem" : citizen.id === "truth" ? "Yellow Lightning" : "Personal Sigil"}</dd></div><div><dt>Representative Color</dt><dd>{citizen.id === "amberina" ? "Imperial Gold / Yellow" : citizen.id === "zxy" ? "Garnet Red / 石榴红 · #D7263D" : "待本人确认"}</dd></div></dl></div><div className="profile-score"><span>IMPERIAL POINTS</span><b>{citizen.id === "amberina" ? "128" : "—"}</b><small>Demo record</small></div></article><PersonalExplorationSummary identity={citizen.id+":citizen"}/><PersonalAchievements identity={citizen.id+":citizen"}/><section aria-label="我的收藏" className="profile-collection-placeholder"><h3>我的收藏</h3><p>私人收藏空间 · 暂未开放</p></section></>;
}
