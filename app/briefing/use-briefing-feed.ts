"use client";

import { useEffect, useState } from "react";
import { foundingNews, type BriefingNews, type BriefingTask } from "./briefing-data";

export type BriefingFeedState = "loading" | "ready" | "error";
type BriefingFeed = { tasks: BriefingTask[]; news: BriefingNews[] };

export function useBriefingFeed(citizenId: string) {
  const [feed, setFeed] = useState<BriefingFeed>({ tasks: [], news: [...foundingNews] });
  const [status, setStatus] = useState<BriefingFeedState>("loading");

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
        if (!Array.isArray(payload.tasks) || !Array.isArray(payload.news)) throw new Error("Malformed feed");
        if (active && !nextController.signal.aborted) {
          setFeed({ tasks: payload.tasks, news: payload.news });
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
  }, [citizenId]);

  return { ...feed, status };
}
