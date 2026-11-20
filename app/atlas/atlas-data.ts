import { CITIZENS, citizenRepresentativeColor, type Citizen } from "../citizens";
import { PUBLIC_EMPIRE_ASSETS, PUBLIC_MEMBER_VISUALS, getPublicMemberVisual } from "../identity/visual-registry";
import { ATLAS_OFFICES, officeHolders, type Office } from "../identity/office-registry";
export { ATLAS_OFFICES } from "../identity/office-registry";
export type { Office } from "../identity/office-registry";

/** Replace art paths independently; the UI never redraws a member's approved sigil or flower. */
export type AtlasAppearance = { emblemSrc?: string; ornamentSrc?: string; accent?: string };
export const ATLAS_APPEARANCE: Record<string, AtlasAppearance> =
  Object.fromEntries(Object.keys(PUBLIC_MEMBER_VISUALS).flatMap(id => {
    const member = getPublicMemberVisual(id);
    if (!member || (!member.officialMarkAsset && !member.atlasOrnamentAsset && !member.atlasPersonalColor))
      return [];
    return [[id, {
      emblemSrc: member.officialMarkAsset,
      ornamentSrc: member.atlasOrnamentAsset,
      accent: member.atlasPersonalColor,
    }]];
  }));
/** The approved Atlas image remains separate from the procedural home sculpture. */
export const ATLAS_SHARED_EMBLEM_SRC: string | null = PUBLIC_EMPIRE_ASSETS.atlasEmblem;

export const ATLAS_COMMITTEE_IDS = [...officeHolders("committee")];
export const ATLAS_YOUTH_IDS = CITIZENS.map(c=>c.id).filter(id=>!ATLAS_COMMITTEE_IDS.some(k=>k===id));
/** A codename, never an account number; the user's registered alias is authoritative. */
export function atlasCodename(id:string):string {
  if(id==="truth") return "你说真的";
  return CITIZENS.find(c=>c.id===id)?.codename ?? "身份待补";
}
export function atlasName(c:Citizen):string { return c.id==="amberina" ? "AvS" : c.name; }
export function atlasColor(c:Citizen):string { return ATLAS_APPEARANCE[c.id]?.accent ?? citizenRepresentativeColor(c); }
export function atlasOfficesForCitizen(id:string):Office[] { return ATLAS_OFFICES.filter(o=>o.holderIds.includes(id)); }
