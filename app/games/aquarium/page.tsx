import type { Metadata } from "next";
import { AquariumGame } from "./aquarium-game";

export const metadata: Metadata = {
  title: "怪怪水族馆 · Schicksal",
  description: "Insaniquarium Deluxe 原版引擎网页移植 · 天命成员专属存档",
  robots: { index: false, follow: false },
};

export default function AquariumPage() { return <AquariumGame />; }
