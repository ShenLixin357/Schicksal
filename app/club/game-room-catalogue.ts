import type { MiniGameId } from "./minigames/mini-game-types";

type CabinetEntry = { id: string; name: string; object: string; x: number; baseY: number } &
  ({ kind: "mini"; gameId: MiniGameId; href?: never } | { kind: "route"; href: string; gameId?: never });

export const GAME_CABINET: readonly CabinetEntry[] = [
  { kind: "mini", id: "solitaire", name: "天命纸牌", object: "镶金牌匣", gameId: "solitaire", x: 75, baseY: 28.2 },
  { kind: "mini", id: "potion", name: "魔药分层实验", object: "彩色试管架", gameId: "potion-sort", x: 90, baseY: 28.2 },
  { kind: "mini", id: "merge", name: "天命遗物合成", object: "悬浮水晶", gameId: "merge-game", x: 75, baseY: 41 },
  { kind: "mini", id: "sigils", name: "翡翠导光阵", object: "翡翠机关盘", gameId: "jade-sigils", x: 90, baseY: 41 },
  { kind: "mini", id: "echo", name: "余烬回声", object: "星月音乐盒", gameId: "ember-echo", x: 75, baseY: 53.2 },
  { kind: "route", id: "ice-fire", name: "森林冰火人", object: "冰与火的双人雕像", href: "/games/fireboy-watergirl?from=game-room", x: 90, baseY: 53.2 },
  { kind: "route", id: "aquarium", name: "怪怪水族箱", object: "迷你玻璃鱼缸", href: "/games/aquarium?from=game-room", x: 75, baseY: 65 },
];

