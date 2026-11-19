"use client";

import { useState, type ReactNode } from "react";

/** Preserve existing Honors and Market implementations while combining only navigation. */
export function PointsHub({ honors, market }: { honors: ReactNode; market: ReactNode }) {
  const [tab, setTab] = useState<"honors" | "market">("honors");
  return <section className="points-hub">
    <nav className="points-hub-tabs" aria-label="积分中心">
      <button type="button" aria-current={tab === "honors" ? "page" : undefined}
        className={tab === "honors" ? "active" : ""} onClick={() => setTab("honors")}>积分与荣誉</button>
      <button type="button" aria-current={tab === "market" ? "page" : undefined}
        className={tab === "market" ? "active" : ""} onClick={() => setTab("market")}>跳蚤市场</button>
    </nav>
    {tab === "honors" ? honors : market}
  </section>;
}
