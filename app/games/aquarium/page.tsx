import type { Metadata } from "next";
import { AquariumGame } from "./aquarium-game";

export const metadata: Metadata = {
  title: "翡翠深海 · Schicksal",
  description: "天命成员专属水族馆",
  robots: { index: false, follow: false },
};

export default function AquariumPage() { return <AquariumGame />; }
