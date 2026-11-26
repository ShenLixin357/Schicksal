/**
 * Public empire visual registry (NOT Lounge magic identities).
 *
 * Future Library/Atlas/Parliament modules must read these values instead of
 * making a new palette or hardcoding approved public emblem file names.
 *
 * The four palettes below deliberately preserve different approved *art*
 * treatments. Atlas's decorative ray order is NOT a mapping from member IDs:
 * do not silently rearrange it while editing citizen representative colors.
 * Rebrand all affected variants together in this one file and review screenshots.
 */
export type PublicMemberVisual = {
  representativeColor: string;
  emblemRayColor: string;
  webMarkColor: string;
  officialMarkColor: string;
  webMarkAsset?: string;
  officialMarkAsset?: string;
  atlasOrnamentAsset?: string;
  atlasPersonalColor?: string;
};

export const PUBLIC_MEMBER_VISUALS = {
  amberina: {
    representativeColor: "#F3ED87",
    emblemRayColor: "#F3ED87",
    webMarkColor: "#EECF58",
    officialMarkColor: "#F3ED87",
    webMarkAsset: "/amberina-personal-simple-gold-eecf58.png",
    officialMarkAsset: "/amberina-personal-simple-official.png",
    atlasOrnamentAsset: "/atlas/approved-bouquet.webp",
    atlasPersonalColor: "#F3ED87",
  },
  zxy: {
    representativeColor: "#D7263D",
    emblemRayColor: "#D7263D",
    webMarkColor: "#D7263D",
    officialMarkColor: "#D7263D",
    webMarkAsset: "/no2-personal-responsive-garnet.png",
    officialMarkAsset: "/no2-personal-full-garnet.png",
    atlasPersonalColor: "#D7263D",
  },
  truth: {
    representativeColor: "#eecf58", emblemRayColor: "#eecf58",
    webMarkColor: "#ffd84f", officialMarkColor: "#ffd84f",
  },
  kaito: {
    representativeColor: "#65cae9", emblemRayColor: "#65cae9",
    webMarkColor: "#65cae9", officialMarkColor: "#65cae9",
  },
  harry: {
    representativeColor: "#a99ce6", emblemRayColor: "#a99ce6",
    webMarkColor: "#a99ce6", officialMarkColor: "#a99ce6",
  },
  "sealed-6": {
    representativeColor: "#48ad83", emblemRayColor: "#48ad83",
    webMarkColor: "#48ad83", officialMarkColor: "#48ad83",
  },
  "sealed-7": {
    representativeColor: "#ef9148", emblemRayColor: "#ef9148",
    webMarkColor: "#ef9148", officialMarkColor: "#ef9148",
  },
  "sealed-8": {
    representativeColor: "#e982ad", emblemRayColor: "#e982ad",
    webMarkColor: "#e982ad", officialMarkColor: "#e982ad",
  },
} as const satisfies Record<string, PublicMemberVisual>;

export type PublicMemberId = keyof typeof PUBLIC_MEMBER_VISUALS;

export function getPublicMemberVisual(id: string): PublicMemberVisual | undefined {
  return (PUBLIC_MEMBER_VISUALS as Record<string, PublicMemberVisual>)[id];
}

export const AMBERINA_OFFICIAL_COLOR = PUBLIC_MEMBER_VISUALS.amberina.representativeColor;
export const AMBERINA_WEB_MARK_COLOR = PUBLIC_MEMBER_VISUALS.amberina.webMarkColor;

/** Common emblem resources are not the same as the Lounge secret insignia. */
export const PUBLIC_EMPIRE_ASSETS = {
  atlasEmblem: "/atlas/approved-main-emblem.webp",
} as const;

/** Approved decorative palettes; index = visual ray, not member ID. */
export const ATLAS_DECORATIVE_FACETS = [
  "#f4d269", "#91c9f4", "#e8787d", "#7acb91",
  "#c3e9f0", "#e7b1cf", "#e9a866", "#b897df",
] as const;

export const BRIEFING_WAVE_COLORS = [
  "#e3bf61", "#679ad3", "#d98486", "#76ae94",
  "#b3d6e3", "#dba4bf", "#dea46c", "#9987ba",
] as const;

export const BRIEFING_BACKDROP_COLORS = [
  "#e0b95b", "#7ca7d4", "#d8878a", "#78b29c",
  "#abd2dd", "#d7a1c1", "#d9a26d", "#9887bd",
] as const;
