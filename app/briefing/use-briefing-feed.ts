"use client";

import { useCallback, useEffect, useState } from "react";
import { foundingNews, type BriefingNews, type BriefingTask } from "./briefing-data";
import type { InboxViews } from "./affairs-history";

export type BriefingFeedState = "loading" | "ready" | "error";
const emptyViews: InboxViews = { pending: [], participated: [], missed: [], archived: [] };
type BriefingFeed = { tasks: BriefingTask[]; news: BriefingNews[]; views: InboxViews };

export function useBriefingFeed(citizenId: string, refreshKey: string) {
  const [feed, setFeed] = useState<BriefingFeed>({ tasks: [], news: [...foundingNews], views: emptyViews });
  const [status, setStatus] = useState<BriefingFeedState>("loading");
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
    const load = async () => {
      controller?.abort();
      const nextController = new AbortController();
      controller = nextController;
      try {
        const response = await fetch("/api/briefing", { cache: "no-store", credentials: "same-origin", signal: nextController.signal });
        if (!response.ok) throw new Error("Could not sync briefing");
        const payload = await response.json() as Partial<BriefingFeed>;
        if (!Array.isArray(payload.tasks) || !Array.isArray(payload.news) ||
          !payload.views || !Array.isArray(payload.views.pending) ||
          !Array.isArray(payload.views.archived) || !Array.isArray(payload.views.participated) ||
          !Array.isArray(payload.views.missed)) throw new Error("Malformed feed");
        if (active && !nextController.signal.aborted) {
          setFeed({ tasks: payload.tasks, news: payload.news, views: payload.views });
          setStatus("ready");
        }
      } catch {
        if (active && !nextController.signal.aborted) setStatus("error");
      }
    };
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [citizenId, refreshKey, revision]);

  return { ...feed, status, refresh, changeArchive };
}
