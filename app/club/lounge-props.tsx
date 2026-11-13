"use client";

import { useId } from "react";

export function MagicChatScroll({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  const id = useId().replace(/:/g, "");
  return <button className={`club-magic-scroll ${open ? "unsealed" : ""}`} type="button" onClick={onOpen} aria-label="展开漂浮魔法卷轴，查阅聊天记录" aria-expanded={open} aria-controls="lounge-chat-scroll">
    <svg viewBox="0 0 160 140" aria-hidden="true">
      <defs><linearGradient id={`${id}-paper`} x2=".2" y2="1"><stop stopColor="#fff5d1" /><stop offset=".5" stopColor="#e6c285" /><stop offset="1" stopColor="#c99c61" /></linearGradient><linearGradient id={`${id}-rod`}><stop stopColor="#4d2e29" /><stop offset=".45" stopColor="#f6d590" /><stop offset="1" stopColor="#735039" /></linearGradient></defs>
      <ellipse className="scroll-aura" cx="80" cy="123" rx="54" ry="8" fill="#d0a4ff" opacity=".25" />
      <g className="scroll-parchment"><path d="M39 26Q78 17 121 28L128 100Q83 112 32 99Z" fill={`url(#${id}-paper)`} stroke="#b78e57" strokeWidth="1.5" /><path d="M38 26Q31 20 33 14Q77 4 124 15L125 28Q80 17 38 26Z" fill="#f6dfac" stroke="#c69b60" /><path d="M32 99Q25 103 30 113Q77 127 127 112L128 100Q80 112 32 99Z" fill="#e6c082" stroke="#b58a53" />
        <rect x="24" y="15" width="113" height="9" rx="4.5" fill={`url(#${id}-rod)`} /><rect x="22" y="105" width="115" height="9" rx="4.5" fill={`url(#${id}-rod)`} />
        <path d="M55 40Q80 33 105 40M51 51Q77 45 110 50M48 62Q78 57 111 62M49 73Q76 67 108 74" fill="none" stroke="#9a614a" strokeWidth="2.5" strokeLinecap="round" opacity=".7" />
        <path className="scroll-writing" d="M54 86Q70 80 83 86T108 84" fill="none" stroke="#8c52b0" strokeWidth="3" strokeLinecap="round" pathLength="1" /><path d="m77 90 3-6 3 6 6 3-6 3-3 6-3-6-6-3Z" fill="#cda65e" />
      </g><g className="scroll-sparkles" fill="#ffedb6"><path d="m18 40 3-8 3 8 8 3-8 3-3 8-3-8-8-3Zm122 38 2-6 2 6 6 2-6 2-2 6-2-6-6-2Z" /><circle cx="139" cy="28" r="2.5" /><circle cx="22" cy="90" r="2" /></g>
    </svg><span className="lounge-prop-label">秘密卷轴 · 聊天与往事</span>
  </button>;
}

export function MusicBoxDrawing() {
  return <span className="music-box-art" aria-hidden="true">
    <span className="sculpture-sprite music-box-closed-art" />
    <span className="sculpture-sprite music-box-open-art" />
    <span className="music-box-inner-mechanism"><span className="sculpture-sprite music-box-carousel-art" /></span>
  </span>;
}

export function MusicBoxPortal({ opening, onOpen }: { opening: boolean; onOpen: () => void }) {
  return <button type="button" className={`club-arcade-music-box ${opening ? "playing" : ""}`} onClick={onOpen} disabled={opening} aria-label="转动八音盒，播放音乐并进入游戏室" aria-busy={opening}><MusicBoxDrawing /></button>;
}

export function startMusicBoxTune(): () => void {
  if (typeof window === "undefined" || !window.AudioContext) return () => undefined;
  let context: AudioContext | undefined;
  try {
    context = new window.AudioContext();
    void context.resume().catch(() => undefined);
    const gain = context.createGain(); gain.gain.value = .12; gain.connect(context.destination);
    // An original short pentatonic music-box phrase, sounded only after a click.
    [72, 79, 76, 84, 81, 79, 76, 74, 72, 76, 79, 84].forEach((note, index) => {
      const start = context!.currentTime + .025 + index * .18;
      const oscillator = context!.createOscillator(), envelope = context!.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
      envelope.gain.setValueAtTime(0, start); envelope.gain.linearRampToValueAtTime(.5, start + .008); envelope.gain.exponentialRampToValueAtTime(.001, start + .75);
      oscillator.connect(envelope); envelope.connect(gain); oscillator.start(start); oscillator.stop(start + .8);
    });
    const timer = window.setTimeout(() => { void context?.close().catch(() => undefined); }, 3400);
    return () => { window.clearTimeout(timer); void context?.close().catch(() => undefined); };
  } catch { void context?.close().catch(() => undefined); return () => undefined; }
}

export function RotatingWordmageGlobe({ opening, onOpen }: { opening: boolean; onOpen: () => void }) {
  // The original detailed globe is already painted into the room plate.
  // Idle: only an invisible hit area. No replacement drawing, tooltip or glow.
  return <button className={`club-wordmage-globe ${opening ? "globe-turning" : ""}`} type="button" onClick={onOpen} disabled={opening} aria-label="转动左侧柜子上的地球仪，进入 Nishujiade 的个人休息室" aria-busy={opening}>
    <span className="wordmage-original-globe-turn" aria-hidden="true" />
  </button>;
}
