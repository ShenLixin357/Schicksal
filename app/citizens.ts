import { PUBLIC_MEMBER_VISUALS, getPublicMemberVisual, AMBERINA_OFFICIAL_COLOR, AMBERINA_WEB_MARK_COLOR } from "./identity/visual-registry.ts";

export { AMBERINA_OFFICIAL_COLOR, AMBERINA_WEB_MARK_COLOR } from "./identity/visual-registry.ts";

export type Citizen = { id: string; username: string; name: string; codename: string; office: string; accent: string; markColor: string; motif: string; locked?: boolean };

/** Leadership halo belongs to the President office, not member identity or login.
 * At present office is static registry data; a future dynamic office service
 * must supply authoritative current office assignments to CITIZENS.
 */
export function hasLeaderInsignia(citizen: Pick<Citizen, "office">): boolean {
  return citizen.office === "President of the First Empire";
}

/** All public colors, approved mark files and decorative variants now live
 * in identity/visual-registry.ts; Lounge identities remain entirely separate.
 */
export function citizenRepresentativeColor(citizen: Pick<Citizen, "id" | "accent">): string {
  return getPublicMemberVisual(citizen.id)?.representativeColor ?? citizen.accent;
}
export const CITIZENS: Citizen[] = [
  { id: "amberina", username: "宇宙霸主", name: "Amberina von Schicksal", codename: "宇宙霸主", office: "President of the First Empire", accent: PUBLIC_MEMBER_VISUALS.amberina.emblemRayColor, markColor: AMBERINA_OFFICIAL_COLOR, motif: "snow" },
  { id: "zxy", username: "No.2", name: "zxy", codename: "No.2", office: "Citizen of the First Empire", accent: PUBLIC_MEMBER_VISUALS.zxy.emblemRayColor, markColor: PUBLIC_MEMBER_VISUALS.zxy.webMarkColor, motif: "flame" },
  { id: "truth", username: "我说 真的", name: "我说 真的", codename: "我说 真的", office: "Core Member of the Legislative Committee", accent: PUBLIC_MEMBER_VISUALS.truth.emblemRayColor, markColor: PUBLIC_MEMBER_VISUALS.truth.webMarkColor, motif: "lightning" },
  { id: "kaito", username: "怪盗 基德", name: "怪盗 基德", codename: "怪盗 基德", office: "Citizen of the First Empire", accent: PUBLIC_MEMBER_VISUALS.kaito.emblemRayColor, markColor: PUBLIC_MEMBER_VISUALS.kaito.webMarkColor, motif: "water" },
  { id: "harry", username: "哈利 波特", name: "哈利 波特", codename: "哈利 波特", office: "Citizen of the First Empire", accent: PUBLIC_MEMBER_VISUALS.harry.emblemRayColor, markColor: PUBLIC_MEMBER_VISUALS.harry.webMarkColor, motif: "wind" },
  { id: "sealed-6", username: "Citizen No. 6", name: "Citizen No. 6", codename: "身份待补", office: "Sealed Record", accent: PUBLIC_MEMBER_VISUALS["sealed-6"].emblemRayColor, markColor: PUBLIC_MEMBER_VISUALS["sealed-6"].webMarkColor, motif: "sealed", locked: true },
  { id: "sealed-7", username: "Citizen No. 7", name: "Citizen No. 7", codename: "身份待补", office: "Sealed Record", accent: PUBLIC_MEMBER_VISUALS["sealed-7"].emblemRayColor, markColor: PUBLIC_MEMBER_VISUALS["sealed-7"].webMarkColor, motif: "sealed", locked: true },
  { id: "sealed-8", username: "Citizen No. 8", name: "Citizen No. 8", codename: "身份待补", office: "Sealed Record", accent: PUBLIC_MEMBER_VISUALS["sealed-8"].emblemRayColor, markColor: PUBLIC_MEMBER_VISUALS["sealed-8"].webMarkColor, motif: "sealed", locked: true },
];
