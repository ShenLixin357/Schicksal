/**
 * Stable public identity API for future Schicksal features (e.g. the Library).
 *
 * A new public module should import from this file, not copy member colors,
 * mark image paths, empire emblem assets, or office holders into its own data.
 *
 * Private Lounge masks and names are deliberately NOT exported: those are
 * independent character personas and must not change with elections/rebrands.
 */
export { CITIZENS, citizenRepresentativeColor, hasLeaderInsignia } from "../citizens";
export type { Citizen } from "../citizens";
export { EMBLEM_BLADES } from "../emblem/blade-spec";
export {
  PUBLIC_MEMBER_VISUALS, getPublicMemberVisual,
  PUBLIC_EMPIRE_ASSETS, ATLAS_DECORATIVE_FACETS,
  BRIEFING_WAVE_COLORS, BRIEFING_BACKDROP_COLORS,
} from "./visual-registry";
export type { PublicMemberId, PublicMemberVisual } from "./visual-registry";
export {
  ATLAS_OFFICES, officeHolders, isCurrentPresident,
  currentOfficeLabel, withOfficeHolders,
} from "./office-registry";
export type { Office } from "./office-registry";
