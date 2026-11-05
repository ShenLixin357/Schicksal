import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "森林冰火人 · Schicksal",
  description: "天命成员的森林冰火人外部游戏入口",
  robots: { index: false, follow: false },
};

const games = [
  { title: "1 · 森林神庙", description: "Forest Temple · 经典双人机关", slug: "1-forest-temple" },
  { title: "2 · 光明神庙", description: "Light Temple · 光线与反射", slug: "2-light-temple" },
  { title: "3 · 寒冰圣殿", description: "Ice Temple · 冰面机关", slug: "3-ice-temple" },
  { title: "4 · 水晶殿", description: "Crystal Temple · 传送门", slug: "4-crystal-temple" },
  { title: "5 · 元素", description: "Elements · 多种元素挑战", slug: "5-elements" },
  { title: "6 · 童话", description: "Fairy Tales · 精灵与谜题", slug: "6-fairy-tales" },
] as const;

export default function FireboyWatergirlLauncher() {
  return (
    <main style={{ minHeight: "100svh", background: "linear-gradient(140deg,#0b1728,#16394d)", color: "#f5f2e9", fontFamily: "system-ui,sans-serif", padding: "clamp(20px,5vw,64px)", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 850, margin: "0 auto" }}>
        <p style={{ fontSize: 12, letterSpacing: ".22em", color: "#aad2df" }}>SCHICKSAL · EXTERNAL GAME LAUNCHER</p>
        <h1 style={{ fontSize: "clamp(28px,5vw,48px)", marginBottom: 6 }}>🔥 森林冰火人 ❄️</h1>
        <p style={{ lineHeight: 1.8, opacity: .85 }}>选择一代游戏后，将打开 wyf9 提供的第三方网页版本。游戏不在天命服务器托管，使用对方的游戏代码与资源。</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14, marginTop: 28 }}>
          {games.map(game => (
            <a key={game.slug} href={`https://waterfire.p.wyf9.top/games/${game.slug}/`} target="_blank" rel="noopener noreferrer" style={{ padding: "22px 18px", border: "1px solid #527c92", borderRadius: 14, background: "#142f43", color: "inherit", textDecoration: "none" }}>
              <strong style={{ fontSize: 20, display: "block" }}>{game.title}</strong>
              <span style={{ display: "block", opacity: .8, marginTop: 9, fontSize: 13 }}>{game.description}</span>
              <span style={{ display: "block", marginTop: 18, color: "#f4c47b" }}>开始游戏 ↗</span>
            </a>
          ))}
        </div>
        <p style={{ marginTop: 26, opacity: .7, fontSize: 13 }}>火人：方向键　·　水人：W A D　·　原项目目前主要支持本地共用键盘；不同电脑的实时双人联机尚未实现。</p>
        <a href="/" style={{ color: "#b9def2", display: "inline-block", marginTop: 12 }}>← 返回天命主页</a>
      </div>
    </main>
  );
}
