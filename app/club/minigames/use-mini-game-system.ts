"use client";

import { useCallback, useState } from "react";
import type { MiniGameId } from "./mini-game-types";

/** Lightweight launch/close state. Importing this hook must not
 * pull the Klondike engine or every mini-game into the Lounge bundle.
 */
export function useMiniGameSystem() {
  const [activeGame, setActiveGame] = useState<MiniGameId | null>(null);
  const launchMiniGame = useCallback((id: MiniGameId) => setActiveGame(id), []);
  const closeMiniGame = useCallback(() => setActiveGame(null), []);
  return { activeGame, launchMiniGame, closeMiniGame };
}
