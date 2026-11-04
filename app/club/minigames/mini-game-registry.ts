import { MergeGame } from "./merge-game";
import { PotionSortGame } from "./potion-sort";
import { JadeSigilsGame } from "./jade-sigils";
import { EmberEchoGame } from "./ember-echo";
import type { MiniGameId, MiniGameRegistration } from "./mini-game-types";

export const MINI_GAME_REGISTRY: Record<MiniGameId, MiniGameRegistration> = {
  solitaire: {
    id: "solitaire",
    title: "Lounge Solitaire",
    description: "天命纸牌",
    icon: "▰",
    component: null,
    integration: "legacy-adapter",
    supportsSave: false,
    supportsUndo: true,
    scoreType: "moves",
    showsBestScore: false,
    preferredAspectRatio: "16 / 10",
    preferredCameraMode: "legacy-table",
  },
  "potion-sort": {
    id: "potion-sort",
    title: "The Alchemist’s Cabinet",
    description: "魔药分层实验",
    icon: "⚗",
    component: PotionSortGame,
    integration: "shared-shell",
    supportsSave: true,
    supportsUndo: true,
    scoreType: "moves",
    showsBestScore: false,
    preferredAspectRatio: "16 / 10",
    preferredCameraMode: "tabletop",
  },
  "merge-game": {
    id: "merge-game",
    title: "Cabinet of Convergence",
    description: "天命遗物合成",
    icon: "◆",
    component: MergeGame,
    integration: "shared-shell",
    supportsSave: true,
    supportsUndo: false,
    scoreType: "score",
    showsBestScore: true,
    preferredAspectRatio: "3 / 4",
    preferredCameraMode: "portrait-cabinet",
  },
  "jade-sigils": {
    id: "jade-sigils",
    title: "The Verdant Circuit",
    description: "翡翠导光阵 · Lord Chryser 的刻盘机关",
    icon: "◇",
    component: JadeSigilsGame,
    integration: "shared-shell",
    supportsSave: true,
    supportsUndo: true,
    scoreType: "moves",
    showsBestScore: false,
    preferredAspectRatio: "1 / 1",
    preferredCameraMode: "tabletop",
    theme: "jade",
  },
  "ember-echo": {
    id: "ember-echo",
    title: "Echoes of the Jade Ember",
    description: "余烬回声 · 翡翠音乐匣的记忆试炼",
    icon: "♮",
    component: EmberEchoGame,
    integration: "shared-shell",
    supportsSave: true,
    supportsUndo: false,
    scoreType: "score",
    showsBestScore: true,
    preferredAspectRatio: "1 / 1",
    preferredCameraMode: "tabletop",
    theme: "jade",
  },
};

export function getMiniGame(id: MiniGameId) {
  return MINI_GAME_REGISTRY[id];
}
