"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { foundingNews } from "./briefing-data";
import { fetchBriefingFeed, type BriefingFeed } from "./briefing-loader";
import type { InboxViews } from "./affairs-history";

export type BriefingFeedState = "loading" | "ready" | "error";
const emptyViews: InboxViews = { pending: [], participated: [], missed: [], archived: [] };
export function useBriefingFeed(citizenId: string, refreshKey: string, initialFeed: BriefingFeed | null = null) {
  const [feed, setFeed] = useState<BriefingFeed>(initialFeed ?? { tasks: [], news: [...foundingNews], views: emptyViews });
  const [status, setStatus] = useState<BriefingFeedState>(initialFeed ? "ready" : "loading");
  const skipFirstFetch = useRef(Boolean(initialFeed));
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);

  const changeArchive = useCallback(async (taskId: string, action: "archive" | "restore") => {
    const response = await fetch("/api/briefing", {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, action }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error || "归档操作失败，请刷新后重试。");
    }
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!citizenId) return;
    let active = true;
    let controller: AbortController | null = null;
    let retryTimer: number | null = null;
    const retryDelays = [2000, 5000, 10000];
    const load = async (attempt = 0) => {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
      controller?.abort();
      const nextController = new AbortController();
      controller = nextController;
      try {
        const payload = await fetchBriefingFeed(nextController.signal);
        if (active && !nextController.signal.aborted) {
          setFeed(payload);
          setStatus("ready");
        }
      } catch {
        if (active && !nextController.signal.aborted) {
          // A brief D1 cold-start or competing first-load heartbeat should not
          // leave the desk stuck in error until the next 60-second poll.
          if (attempt < retryDelays.length && document.visibilityState === "visible") {
            setStatus("loading");
            retryTimer = window.setTimeout(() => { void load(attempt + 1); }, retryDelays[attempt]);
          } else setStatus("error");
        }
      }
    };
    // Welcome already fetched the current member's briefing. Reuse that
    // snapshot for the first frame; later polls and section changes revalidate.
    if (skipFirstFetch.current) skipFirstFetch.current = false;
    else void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      controller?.abort();
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [citizenId, refreshKey, revision]);

  return { ...feed, status, refresh, changeArchive };
}
