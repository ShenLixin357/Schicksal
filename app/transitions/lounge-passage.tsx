"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type LoungePassageDirection = "enter" | "exit";
const ENTER_DURATION = 4000;
const REVERSE_DURATION = 2900;
const SWAP_FRACTION = 0.39;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const x = clamp(n); return x * x * (3 - 2 * x); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(x - ix), fy = smooth(y - iy);
  return mix(
    mix(hash(ix, iy), hash(ix + 1, iy), fx),
    mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx),
    fy,
  );
}
function fBm(x: number, y: number) {
  return noise(x, y) * .52 + noise(x * 2.19 + 7.4, y * 2.19) * .3
    + noise(x * 4.13, y * 4.13 + 2.7) * .18;
}

/**
 * A separate canvas veil, not a recolouring/filter of the approved scene.
 * It first conceals the old page, swaps the actual React view in darkness,
 * then lets the destination appear from an organically warped sigil origin.
 * Click anywhere (or press Escape) to skip with no intermediate state.
 */
export function LoungePassage({ direction, sharedMark, onSwap, onFinish }: {
  direction: LoungePassageDirection;
  sharedMark: ReactNode;
  onSwap: () => void;
  onFinish: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const endRef = useRef<() => void>(() => {});
  const callbacks = useRef({ onSwap, onFinish });
  callbacks.current = { onSwap, onFinish };
  const [point, setPoint] = useState({ x: 36, y: 49 });
  const [fraction, setFraction] = useState(0);
  useEffect(() => {
    const mark = document.querySelector<HTMLElement>(".imperial-logo-trigger");
    const bounds = mark?.getBoundingClientRect();
    const origin = {
      x: bounds ? bounds.left + bounds.width * .5 : 36,
      y: bounds ? bounds.top + bounds.height * .5 : 49,
    };
    setPoint(origin);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    const width = Math.max(140, Math.min(450, Math.round(window.innerWidth / 3.5)));
    const height = Math.max(100, Math.min(280, Math.round(window.innerHeight / 3.5)));
    if (canvas && ctx) { canvas.width = width; canvas.height = height; }
    const duration = direction === "enter" ? ENTER_DURATION : REVERSE_DURATION;
    let swapped = false, completed = false, frame = 0;
    const swap = () => {
      if (!swapped) { swapped = true; callbacks.current.onSwap(); }
    };
    const finish = () => {
      if (completed) return;
      completed = true;
      swap();
      window.cancelAnimationFrame(frame);
      callbacks.current.onFinish();
    };
    endRef.current = finish;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !ctx) {
      finish();
      return;
    }

    const imageData = ctx.createImageData(width, height);
    const field = new Float32Array(width * height);
    const detail = new Float32Array(width * height);
    const px = origin.x / window.innerWidth;
    const py = origin.y / window.innerHeight;
    const far = Math.hypot(
      Math.max(px, 1 - px) * window.innerWidth,
      Math.max(py, 1 - py) * window.innerHeight,
    );
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const nx = x / width, ny = y / height, i = y * width + x;
      const m = fBm(nx * 5.7, ny * 5.7);
      const n = fBm(nx * 13.1 + 2.3, ny * 13.1 + 6.1);
      const waveX = (m - .5) * 34 + (n - .5) * 13;
      const waveY = (n - .5) * 34 + (m - .5) * 13;
      const dist = Math.hypot(
        (nx - px) * window.innerWidth + waveX,
        (ny - py) * window.innerHeight + waveY,
      ) / far;
      field[i] = dist + (m - .5) * .038 + (n - .5) * .018;
      detail[i] = m * .64 + n * .36;
    }
    let lastDraw = -1000, started = performance.now();
    const paint = (now: number) => {
      if (completed) return;
      const elapsed = now - started;
      const p = clamp(elapsed / duration);
      if (p >= SWAP_FRACTION) swap();
      if (p >= 1) { finish(); return; }
      if (now - lastDraw < 28) { frame = requestAnimationFrame(paint); return; }
      lastDraw = now;
      const veil = smooth(p / .4);
      const opening = smooth((p - .51) / .49);
      const reach = opening * 1.15;
      // Early phases conceal the old page. After the concealed swap, the
      // destination is unveiled through a moving, porous, noise-warped edge.
      const raw = imageData.data;
      const t = elapsed * .001;
      for (let i = 0; i < field.length; i++) {
        const edgeMotion = Math.sin(detail[i] * 15.2 + t * 1.35) * .013
          + Math.sin(detail[i] * 31.7 - t * .7) * .005;
        const boundary = field[i] + edgeMotion;
        const shroud = 1 - smooth((reach - boundary + .023) / .046);
        const opacity = p <= .51 ? veil : shroud;
        const o = i * 4;
        const grain = detail[i];
        raw[o] = 8 + Math.floor(grain * 8);
        raw[o + 1] = 6 + Math.floor(grain * 4);
        raw[o + 2] = 14 + Math.floor(grain * 12);
        raw[o + 3] = Math.round(clamp(opacity) * 255);
      }
      ctx.putImageData(imageData, 0, 0);
      // Only the small superimposed seal is visible at peak darkness.
      setFraction(p);
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { completed = true; cancelAnimationFrame(frame); window.removeEventListener("keydown", onKey); };
  }, [direction]);

  const entering = direction === "enter";
  const sourceVisible = fraction < .37 ? 1 - smooth((fraction - .10) / .27) : 0;
  const targetVisible = fraction >= .36 ? smooth((fraction - .36) / .18) : 0;
  return <div className="lounge-passage" role="button" tabIndex={0}
    aria-label="正在切换天命与 Committee Lounge，点击任意位置跳过动画"
    onClick={() => endRef.current()}>
    <canvas ref={canvasRef} className="lounge-passage-veil" aria-hidden="true"/>
    <div className="lounge-passage-seal" style={{ left: point.x, top: point.y }} aria-hidden="true">
      <span className="lounge-passage-seal-source" style={{ opacity: sourceVisible }}>
        {entering ? sharedMark : <Image src="/committee-restroom-badge.png" alt="" width={54} height={54} unoptimized/>}
      </span>
      <span className="lounge-passage-seal-destination" style={{ opacity: targetVisible }}>
        {entering ? <Image src="/committee-restroom-badge.png" alt="" width={54} height={54} unoptimized/> : sharedMark}
      </span>
    </div>
  </div>;
}
