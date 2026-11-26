import type { BriefingFeed } from "./briefing-loader";

/** The mandatory briefing is an entry prerequisite, not a notification.
 * An authenticated identity alone never grants access to the application UI.
 */
export type MandatoryBriefingPreload = {
  status: "loading" | "ready" | "error";
  citizenId?: string;
  feed?: BriefingFeed;
  sessionKey?: string;
};

export type ReadyMandatoryBriefing = {
  status: "ready";
  citizenId: string;
  feed: BriefingFeed;
  sessionKey: string;
};

/** A fresh server-verified briefing is mandatory for EVERY website entry.
 * No localStorage/sessionStorage "already viewed" suppression is allowed.
 */
export function readyForMandatoryBriefing(
  preload: MandatoryBriefingPreload,
  citizenId: string,
): preload is ReadyMandatoryBriefing {
  return preload.status === "ready" &&
    preload.citizenId === citizenId &&
    Boolean(preload.feed && preload.sessionKey);
}

/** The site shell can be mounted only after explicitly interacting with
 * the displayed, fully loaded briefing (close, desk, or chosen destination).
 */
export function mayMountSiteAfterBriefing(entryBriefingPending: boolean): boolean {
  return !entryBriefingPending;
}
