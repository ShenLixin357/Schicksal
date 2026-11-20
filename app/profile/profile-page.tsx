"use client";

import type { CSSProperties, ReactNode } from "react";
import { type Citizen, citizenRepresentativeColor } from "../citizens";
import { atlasOfficesForCitizen, atlasName } from "../atlas/atlas-data";
import { PageHead } from "../shell/page-head";
import { ProfileCrystalEmblem } from "./profile-crystal-emblem";

/** The personal page retains the original badge supplied by its parent.
 * No member artwork or official colour is recomputed here.
 */
export function SelfProfilePage({ citizen, renderMark }: { citizen: Citizen; renderMark: ReactNode }) {
  return <><PageHead eyebrow="Citizen Profile" title="个人身份档案" copy="登录用户名、正式身份、个人标志与历史荣誉在这里汇合。" /><article className="profile" style={{ "--citizen": citizenRepresentativeColor(citizen) } as CSSProperties}><div className="profile-mark"><ProfileCrystalEmblem citizenId={citizen.id}/>{renderMark}<span>{citizen.username}</span></div><div className="profile-copy"><small>AUTHENTICATED CITIZEN</small><h2>{atlasName(citizen)}</h2><dl><div><dt>Login Username</dt><dd>{citizen.username}</dd></div><div><dt>Current Office</dt><dd>{atlasOfficesForCitizen(citizen.id).map(o=>o.title).join(" · ") || "暂无现任公职"}</dd></div><div><dt>Personal Mark</dt><dd>{citizen.id === "amberina" ? "Golden Solar Snowflake" : citizen.id === "zxy" ? "Red Flame" : citizen.id === "truth" ? "Yellow Lightning" : "Personal Sigil"}</dd></div><div><dt>Representative Color</dt><dd>{citizen.id === "amberina" ? "Imperial Gold / Yellow" : "待本人确认"}</dd></div></dl></div><div className="profile-score"><span>IMPERIAL POINTS</span><b>{citizen.id === "amberina" ? "128" : "—"}</b><small>Demo record</small></div></article></>;
}
