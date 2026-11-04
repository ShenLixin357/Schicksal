"use client";

import type { MiniGameId } from "./mini-game-types";

export function LoungeGameObjects({ onLaunch }: { onLaunch: (id: MiniGameId) => void }) {
  return <div className="lounge-game-objects" aria-label="桌上的 Lounge 游戏机关">
    <button className="lounge-game-object potion-object" type="button" onClick={() => onLaunch("potion-sort")} aria-label="打开炼金师橱柜，开始魔药分层游戏">
      <span className="potion-object-tray" aria-hidden="true" />
      <span className="potion-object-bottle bottle-a" aria-hidden="true"><i /></span>
      <span className="potion-object-bottle bottle-b" aria-hidden="true"><i /></span>
      <span className="potion-object-bottle bottle-c" aria-hidden="true"><i /></span>
      <small>The Alchemist’s Cabinet</small>
    </button>
    <button className="lounge-game-object merge-object" type="button" onClick={() => onLaunch("merge-game")} aria-label="打开天命遗物匣，开始遗物合成游戏">
      <span className="merge-object-box" aria-hidden="true"><i>◆</i><b>S</b></span>
      <small>Cabinet of Convergence</small>
    </button>
  </div>;
}
