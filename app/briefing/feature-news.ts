import type { BriefingNews } from "./briefing-data";

/**
 * Build-time release news.
 *
 * Coding agents should append ONE item here only when the feature they built
 * is ready to ship. The news becomes visible only after the associated code
 * is successfully deployed, because both are bundled into the same release.
 *
 * Do not preannounce unfinished UI, work-in-progress branches or private
 * member information. Do not use this list to certify parliamentary decisions.
 *
 * Keep records append-only so older news remains available via "展开全部".
 */
export const verifiedReleaseNews: readonly BriefingNews[] = [
  // Appended by the coding agent in a future feature deployment.
];
