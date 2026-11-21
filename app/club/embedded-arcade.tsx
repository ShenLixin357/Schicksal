"use client";

import { Component, lazy, Suspense, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./game-room-embed.css";

/** One shared, reversible boundary for all Lounge-initiated game routes.
 * Original HTML games, WASM and images still run unmodified in iframes.
 */
export type ArcadeRoute = "ice-fire" | "aquarium";
const FireboyWatergirlGame = lazy(() => import("../games/fireboy-watergirl/game-frame").then(m => ({ default: m.FireboyWatergirlFrame })));
const AquariumGame = lazy(() => import("../games/aquarium/aquarium-game").then(m => ({ default: m.AquariumGame })));

class ArcadeErrorBoundary extends Component<{ children: ReactNode; onClose: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <section className="lounge-embedded-error" role="alert">
          <p>游戏模块暂时无法打开；你的 Lounge 和登录状态仍然保留。</p>
          <button type="button" onClick={this.props.onClose}>返回休息室</button>
        </section>
      : this.props.children;
  }
}

export function EmbeddedArcade({ game, onClose }: { game: ArcadeRoute; onClose: () => void }) {
  // Called only from an actual browser-side click, never at SSR.
  return createPortal(
    <div className="lounge-embedded-game" data-lounge-embedded-game={game}>
      <ArcadeErrorBoundary onClose={onClose}>
        <Suspense fallback={<div className="lounge-embedded-loading" role="status">正在打开游戏…</div>}>
          {game === "ice-fire" ? <FireboyWatergirlGame onBack={onClose} /> : <AquariumGame onBack={onClose} />}
        </Suspense>
      </ArcadeErrorBoundary>
    </div>,
    document.body,
  );
}
