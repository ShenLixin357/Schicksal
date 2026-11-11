export function AquariumGame() {
  return <main style={{ minHeight: "100svh", background: "#071b20" }}>
    <iframe src="/games/insaniquarium/index.html" title="怪怪水族馆 · Insaniquarium Deluxe"
      allow="autoplay; fullscreen" allowFullScreen
      style={{ display: "block", border: 0, width: "100%", minHeight: "100svh" }} />
  </main>;
}
