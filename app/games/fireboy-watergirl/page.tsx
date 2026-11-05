import type { Metadata } from "next";
import { FireboyWatergirlFrame } from "./game-frame";

export const metadata: Metadata = {
  title: "森林冰火人 · Schicksal",
  description: "天命独立双人游戏入口",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <FireboyWatergirlFrame />;
}
