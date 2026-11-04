import type { ComponentType, RefAttributes } from "react";

export type MiniGameId = "solitaire" | "potion-sort" | "merge-game" | "jade-sigils" | "ember-echo";
export type MiniGameScoreType = "moves" | "score" | "none";
export type MiniGameSound = "select" | "pour" | "invalid" | "drop" | "collision" | "merge" | "win" | "rune-0" | "rune-1" | "rune-2" | "rune-3";

export type EmblemBlade = {
  index: number;
  color: string;
};

export type MiniGameController = {
  serializeState: () => unknown;
  resetGame: () => void;
  undo?: () => void;
};

export type MiniGameComponentProps = {
  initialState: unknown;
  paused: boolean;
  inputLocked: boolean;
  soundEnabled: boolean;
  emblemBlades: readonly EmblemBlade[];
  onSnapshot: (snapshot: unknown) => void;
  onNewRun: () => void;
  onScoreChange: (score: number) => void;
  onUndoAvailabilityChange: (available: boolean) => void;
  playSound: (sound: MiniGameSound) => void;
};

export type RegisteredMiniGameComponent = ComponentType<MiniGameComponentProps & RefAttributes<MiniGameController>>;

export type MiniGameRegistration = {
  id: MiniGameId;
  title: string;
  description: string;
  icon: string;
  component: RegisteredMiniGameComponent | null;
  integration: "shared-shell" | "legacy-adapter";
  supportsSave: boolean;
  supportsUndo: boolean;
  scoreType: MiniGameScoreType;
  showsBestScore: boolean;
  preferredAspectRatio: string;
  preferredCameraMode: "tabletop" | "portrait-cabinet" | "legacy-table";
  theme?: "jade";
};
