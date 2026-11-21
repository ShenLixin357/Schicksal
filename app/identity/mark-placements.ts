/**
 * User-approved Amberina personal mark placement contract, 2026-11-21.
 *
 * A visible mark must declare its exact location.  No "web means strong"
 * default exists: introducing a new location requires an explicit approval,
 * an entry here, and a separate visual review.
 *
 * This registry NEVER changes the official representative/UI colour, the
 * shared eight-colour emblem, the original two-tone Procreate masters or
 * the completely separate Committee Lounge mystical identity.
 */
import { PUBLIC_MEMBER_VISUALS } from "./visual-registry.ts";

export const AMBERINA_MARK_PLACEMENTS = {
  "login-entry-picker": "official",              // 01 - isolated server-rendered entrance
  "login-react-picker": "official",              // 02 - authenticated React login fallback
  "welcome-identity": "official",                // 03
  "sidebar-main-self": "strong",                 // 04 - ONLY approved strong location
  "sidebar-lounge-self": "official",             // 05
  "citizen-registry-card": "official",            // 06
  "citizen-registry-focus": "official",           // 07
  "profile-personal-simple": "official",         // 08
  "profile-single-crystal": "official",          // 09
  "profile-public-simple": "official",           // 10
  "atlas-personal-detail": "official",           // 11 - artwork itself NOT approved to publish
  "archive-book-cover": "official",              // 12
  "archive-reader-author": "official",           // 13
  "photos-filter-subject": "official",           // 14
  "photos-upload-subject": "official",           // 15
  "photos-card-subject": "official",             // 16
  "parliament-seat-speaker": "official",          // 17
  "parliament-speaker-election": "official",      // 18
  "parliament-comment-request": "official",      // 19
  "parliament-votes-results": "official",         // 20
  "messenger-contact": "official",               // 21 - placeholder route; future integration
  "messenger-peer": "official",                  // 22 - placeholder route; future integration
  "sidebar-main-other-member": "official",       // Amberina seen in another citizen's footer
} as const satisfies Record<string, "official" | "strong">;

export type PublicMarkPlacement = keyof typeof AMBERINA_MARK_PLACEMENTS;
export type AmberinaMarkVariant = "official" | "strong";

export function amberinaVariantAt(placement: PublicMarkPlacement): AmberinaMarkVariant {
  // Do not silently grant a stronger colour to a runtime-unknown placement.
  const variant = AMBERINA_MARK_PLACEMENTS[placement];
  if (!variant) throw new Error("Unapproved Amberina personal mark placement: " + placement);
  return variant;
}

export function amberinaMarkAt(placement: PublicMarkPlacement) {
  const visual = PUBLIC_MEMBER_VISUALS.amberina;
  return amberinaVariantAt(placement) === "strong"
    ? { color: visual.webMarkColor, asset: visual.webMarkAsset }
    : { color: visual.officialMarkColor, asset: visual.officialMarkAsset };
}
