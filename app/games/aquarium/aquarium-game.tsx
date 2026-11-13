"use client";

import { useEffect, useState } from "react";

export function AquariumGame() {
  const [fromGameRoom, setFromGameRoom] = useState(false);
  useEffect(() => { setFromGameRoom(new URLSearchParams(window.location.search).get("from") === "game-room"); }, []);
  return <main style={{ minHeight: "100svh", background: "#071b20" }}>
    {fromGameRoom && <nav style={{ padding: "10px 18px", background: "#153c40", borderBottom: "1px solid #467678" }}><a href="/?lounge=game-room" style={{ color: "#f7e5c5", fontSize: 14, textDecoration: "none" }}>← 返回八音盒游戏室</a></nav>}
    <iframe src="/games/insaniquarium/index.html" title="怪怪水族馆 · Insaniquarium Deluxe"
      allow="autoplay; fullscreen" allowFullScreen
      style={{ display: "block", border: 0, width: "100%", minHeight: "100svh" }} />
  </main>;
}

