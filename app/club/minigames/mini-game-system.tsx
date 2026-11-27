"use client";
import {recordExploration} from "../../guide/exploration";
import {useEffect} from "react";

import { LoungeSolitaire } from "../lounge-solitaire";
import { getMiniGame } from "./mini-game-registry";
import { MiniGameShell } from "./mini-game-shell";
import type { EmblemBlade, MiniGameId } from "./mini-game-types";

export function MiniGameSystem({ gameId, citizenId, emblemBlades, onClose, loungeTitle, backLabel }: {
  gameId: MiniGameId;
  citizenId: string;
  emblemBlades: readonly EmblemBlade[];
  onClose: () => void;
  loungeTitle?: string;
  backLabel?: string;
}) {
  const registration = getMiniGame(gameId);
  useEffect(()=>{void recordExploration("lounge:game:"+gameId);},[gameId]);
  if (registration.integration === "legacy-adapter") return <LoungeSolitaire citizenId={citizenId} blades={emblemBlades} onClose={onClose} backLabel={backLabel} />;
  return <MiniGameShell key={`${citizenId}:${gameId}`} citizenId={citizenId} registration={registration} emblemBlades={emblemBlades} onClose={onClose} loungeTitle={loungeTitle} backLabel={backLabel} />;
}

