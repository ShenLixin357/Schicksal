"use client";

import type { CSSProperties } from "react";
import { EMBLEM_BLADES } from "./blade-spec";

/** Reusable approved compact/ceremonial empire mark.
 * New public modules should import this renderer, not redraw a local copy.
 */
export function CompactEmpireEmblem({ compact = false, highlight, revealed = 8, ceremonial = false }: { compact?: boolean; highlight?: number; revealed?: number; ceremonial?: boolean }) {
  return (
    <div className={`emblem ${compact ? "compact" : ""} ${ceremonial ? "ceremonial" : ""} ${revealed >= 8 ? "complete" : ""}`} role="img" aria-label="天命第一帝国八棱主标志，正式名称待定">
      <span className="emblem-orbit" />
      {EMBLEM_BLADES.map((blade) => (
        <span className={`emblem-ray ${blade.index === highlight ? "lit" : ""} ${blade.index < revealed ? "visible" : ""}`} key={blade.citizenId} style={{ "--ray": blade.index, "--ray-color": blade.color, "--open-delay": `${blade.index * .035}s` } as CSSProperties}><i /></span>
      ))}
      <span className="emblem-core" />
    </div>
  );
}

