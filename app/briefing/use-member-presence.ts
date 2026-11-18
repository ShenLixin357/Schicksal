"use client";

import { useEffect, useState } from "react";

export type MemberPresence = {
  online: string[];
  windowSeconds: number;
  status: "loading" | "ready" | "error";
};

export function useMemberPresence(citizenId: string): MemberPresence {
  const [state, setState] = useState<MemberPresence>({
    online: [], windowSeconds: 90, status: "loading",
  });
  useEffect(() => {
    if (!citizenId) return;
    let active = true;
    let controller: AbortController | null = null;
    const sync = async () => {
      if (document.visibilityState !== "visible") return;
      controller?.abort();
      const next = new AbortController();
      controller = next;
      try {
        // A visible, authenticated session sends a heartbeat. A hidden tab
        // sends none, and automatically falls offline after 90 seconds.
        const heartbeat = await fetch("/api/presence", {
          method: "POST", credentials: "same-origin", cache: "no-store",
          signal: next.signal,
        });
        if (!heartbeat.ok) throw new Error("heartbeat failed");
        const response = await fetch("/api/presence", {
          cache: "no-store", credentials: "same-origin", signal: next.signal,
        });
        if (!response.ok) throw new Error("presence unavailable");
        const result = await response.json() as { online?: unknown; windowSeconds?: unknown };
        if (!Array.isArray(result.online) || !result.online.every(id => typeof id === "string"))
          throw new Error("invalid presence response");
        if (active && !next.signal.aborted) setState({
          online: result.online,
          windowSeconds: typeof result.windowSeconds === "number" ? result.windowSeconds : 90,
          status: "ready",
        });
      } catch {
        if (active && !next.signal.aborted) setState(previous => ({ ...previous, status: "error" }));
      }
    };
    void sync();
    const interval = window.setInterval(() => { void sync(); }, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") void sync(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false; controller?.abort(); window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [citizenId]);
  return state;
}
