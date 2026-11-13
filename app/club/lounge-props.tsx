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
  const id = useId().replace(/:/g, "");
  return <svg className="music-box-drawing" viewBox="0 0 180 170" aria-hidden="true">
    <defs><linearGradient id={`${id}-box`} x2=".3" y2="1"><stop stopColor="#e1b68a" /><stop offset=".45" stopColor="#7f505e" /><stop offset="1" stopColor="#422e49" /></linearGradient><linearGradient id={`${id}-lid`} x2="1" y2="1"><stop stopColor="#be9a8c" /><stop offset="1" stopColor="#5b3759" /></linearGradient></defs>
    <ellipse cx="91" cy="153" rx="64" ry="10" fill="#130e20" opacity=".45" />
    <g className="music-box-lid"><path d="m29 90 10-64q49-23 101 2l11 63Z" fill={`url(#${id}-lid)`} stroke="#e5be7d" strokeWidth="3" /><path d="m40 79 8-43q40-17 84 1l8 42Z" fill="#d6b7cb" stroke="#ab8266" strokeWidth="2" /><ellipse cx="91" cy="58" rx="27" ry="22" fill="#ece0e4" opacity=".8" /><path d="m91 40 4 12 13 1-10 8 3 12-10-7-11 7 4-12-10-8 13-1Z" fill="#e2b779" /></g>
    <path d="M26 101 40 81h101l14 20-9 43q-54 24-111 0Z" fill={`url(#${id}-box)`} stroke="#d9b87e" strokeWidth="2" /><ellipse cx="90" cy="103" rx="64" ry="22" fill="#d9bb92" stroke="#f6d99c" strokeWidth="2" /><ellipse cx="90" cy="102" rx="47" ry="14" fill="#8a667c" stroke="#e4c48d" />
    <g className="music-box-carousel"><ellipse cx="90" cy="101" rx="27" ry="8" fill="#e7d09e" /><path d="M87 98 91 58l6 40" fill="#e2c27e" /><path d="m91 37 4 10 11 1-9 7 3 11-9-6-9 6 3-11-9-7 11-1Z" fill="#fff1b3" stroke="#c4a267" /><path d="M76 82Q91 70 107 83L113 92Q91 104 68 92Z" fill="#ccb3df" stroke="#fff0cf" /><circle cx="91" cy="70" r="6" fill="#ffe5ba" /></g>
    <path d="M37 125q54 22 107 0M53 138l9 3m57-3 9-3" stroke="#e8bf78" strokeWidth="2" fill="none" /><circle cx="91" cy="133" r="5" fill="#eec984" />
    <g className="music-box-notes" fill="#ffe7a9"><text x="13" y="62" fontSize="24">♪</text><text x="146" y="47" fontSize="28">♫</text><text x="135" y="18" fontSize="18">♪</text></g>
  </svg>;
}

export function MusicBoxPortal({ opening, onOpen }: { opening: boolean; onOpen: () => void }) {
  return <button type="button" className={`club-arcade-music-box ${opening ? "playing" : ""}`} onClick={onOpen} disabled={opening} aria-label="转动八音盒，播放音乐并进入游戏室" aria-busy={opening}><MusicBoxDrawing /><span className="lounge-prop-label">八音盒 · 通往游戏室</span></button>;
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
  const id = useId().replace(/:/g, "");
  const land = "M9 30 19 23 24 12 38 8 47 17 39 26 44 32 32 45 26 59 17 52 19 40ZM55 14 65 10 79 17 89 30 82 39 72 37 67 46 77 55 71 68 61 62 58 45 47 35 49 26ZM86 57l10-4 9 8-5 10-14-2Z";
  return <button className={`club-wordmage-globe ${opening ? "globe-turning" : ""}`} type="button" onClick={onOpen} disabled={opening} aria-label="转动左侧柜子上的地球仪，进入 Nishujiade 的个人休息室" aria-busy={opening}>
    <svg className="wordmage-globe-drawing" viewBox="0 0 120 150" aria-hidden="true"><defs><radialGradient id={`${id}-ocean`} cx=".3" cy=".25" r=".8"><stop stopColor="#7b9ba0" /><stop offset=".5" stopColor="#315966" /><stop offset="1" stopColor="#112731" /></radialGradient><clipPath id={`${id}-sphere`}><circle cx="59" cy="58" r="40" /></clipPath></defs>
      <ellipse cx="60" cy="139" rx="38" ry="7" fill="#211724" opacity=".7" /><path d="M56 101v24l-23 11q27 10 55 0l-24-11v-24" fill="#b18c51" stroke="#e7c287" strokeWidth="2" /><ellipse cx="59" cy="58" rx="48" ry="51" transform="rotate(23 59 58)" fill="none" stroke="#b89355" strokeWidth="5" /><circle cx="59" cy="58" r="41" fill={`url(#${id}-ocean)`} stroke="#d1ac69" strokeWidth="2" />
      <g clipPath={`url(#${id}-sphere)`}><g className="wordmage-globe-map" fill="#b6ab76" stroke="#dad1a2" strokeWidth=".6">{[-100,0,100].map(x=><path key={x} d={land} transform={`translate(${x+9} 15)`} />)}</g><g fill="none" stroke="#c3ba85" strokeWidth=".65" opacity=".5"><ellipse cx="59" cy="58" rx="40" ry="13" /><ellipse cx="59" cy="58" rx="16" ry="40" /><path d="M19 58h80M26 35h66M26 81h66" /></g><ellipse cx="43" cy="37" rx="14" ry="10" fill="#fffbd6" opacity=".12" /></g><path d="M11 75q44 32 98-4" fill="none" stroke="#d7b479" strokeWidth="3" />
    </svg><span>地球仪 · Nishujiade 的休息室</span>
  </button>;
}
