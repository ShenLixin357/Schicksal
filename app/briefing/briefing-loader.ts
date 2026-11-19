import type { BriefingNews, BriefingTask } from "./briefing-data";
import type { InboxViews } from "./affairs-history";

export type BriefingFeed = { tasks: BriefingTask[]; news: BriefingNews[]; views: InboxViews };

/** Shared shape check for both Welcome preload and subsequent live refreshes. */
export function parseBriefingFeed(payload: unknown): BriefingFeed {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Malformed briefing feed");
  const data = payload as Partial<BriefingFeed>;
  if (!Array.isArray(data.tasks) || !Array.isArray(data.news) ||
    !data.views || !Array.isArray(data.views.pending) ||
    !Array.isArray(data.views.archived) || !Array.isArray(data.views.participated) ||
    !Array.isArray(data.views.missed)) throw new Error("Malformed briefing feed");
  return { tasks: data.tasks, news: data.news, views: data.views };
}

/** Always load current data from the authenticated member session, never a cache. */
export async function fetchBriefingFeed(signal?: AbortSignal): Promise<BriefingFeed> {
  const response = await fetch("/api/briefing", {
    cache: "no-store", credentials: "same-origin", signal,
  });
  if (!response.ok) throw new Error("Could not sync briefing");
  return parseBriefingFeed(await response.json());
}
