"use client";

import "./lounge-passage-controls.css";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPassageGate, PASSAGE_SKIP_LABEL } from "./passage-gate";

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
 * Click anywhere (or press Escape) to skip. If needed, keep the source
 * visible until the destination has decoded its scene.
 */
export function LoungePassage({ direction, sharedMark, prepareDestination, onSwap, onFinish, onFailure }: {
  direction: LoungePassageDirection;
  sharedMark: ReactNode;
  prepareDestination?: () => Promise<void>;
  onSwap: () => void;
  onFinish: () => void;
  onFailure: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<() => void>(() => {});
  const callbacks = useRef({ onSwap, onFinish, onFailure });
  const [fraction, setFraction] = useState(0);
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    callbacks.current = { onSwap, onFinish, onFailure };
  }, [onSwap, onFinish, onFailure]);
  useEffect(() => {
    const mark = document.querySelector<HTMLElement>(".imperial-logo-trigger");
    const bounds = mark?.getBoundingClientRect();
    const origin = {
      x: bounds ? bounds.left + bounds.width * .5 : 36,
      y: bounds ? bounds.top + bounds.height * .5 : 49,
    };
    surfaceRef.current?.style.setProperty("--lounge-passage-origin-x", `${origin.x}px`);
    surfaceRef.current?.style.setProperty("--lounge-passage-origin-y", `${origin.y}px`);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    const width = Math.max(140, Math.min(450, Math.round(window.innerWidth / 3.5)));
    const height = Math.max(100, Math.min(280, Math.round(window.innerHeight / 3.5)));
    if (canvas && ctx) { canvas.width = width; canvas.height = height; }
    const duration = direction === "enter" ? ENTER_DURATION : REVERSE_DURATION;
    let motionStopped = false, frame = 0;
    const stopMotion = () => {
      motionStopped = true;
      window.cancelAnimationFrame(frame);
    };
    const gate = createPassageGate({
      onSwap: () => callbacks.current.onSwap(),
      onFinish: () => callbacks.current.onFinish(),
      onWait: () => setWaiting(true),
      onFailure: () => { stopMotion(); callbacks.current.onFailure(); },
    }, !prepareDestination);
    const finish = () => {
      stopMotion();
      gate.finishMotion();
    };
    endRef.current = finish;

    let timeout: number | undefined;
    if (prepareDestination) {
      timeout = window.setTimeout(gate.destinationFailed, 15_000);
      void Promise.resolve().then(prepareDestination).then(gate.destinationReady, gate.destinationFailed)
        .finally(() => window.clearTimeout(timeout));
    }
    const cleanup = () => {
      stopMotion();
      gate.cancel();
      window.clearTimeout(timeout);
    };
    const onKey = (event: KeyboardEvent) => {
      if (["Escape", "Enter", " ", "Tab"].includes(event.key)) {
        event.preventDefault();
        if (event.key !== "Tab") finish();
      }
    };
    window.addEventListener("keydown", onKey);
    const teardown = () => {
      cleanup();
      window.removeEventListener("keydown", onKey);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !ctx) {
      finish();
      return teardown;
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
    let lastDraw = -1000;
    const started = performance.now();
    const paint = (now: number) => {
      if (motionStopped) return;
      const elapsed = now - started;
      const p = clamp(elapsed / duration);
      if (p >= SWAP_FRACTION && !gate.swap()) { finish(); return; }
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
    return teardown;
  }, [direction, prepareDestination]);

  const entering = direction === "enter";
  const sourceVisible = fraction < .37 ? 1 - smooth((fraction - .10) / .27) : 0;
  const targetVisible = fraction >= .36 ? smooth((fraction - .36) / .18) : 0;
  return <div ref={surfaceRef} className={`lounge-passage${waiting ? " lounge-passage-waiting" : ""}`} role="button" tabIndex={0}
    aria-label={waiting ? "场景加载中" : PASSAGE_SKIP_LABEL}
    aria-busy={waiting}
    onClick={() => endRef.current()}>
    <canvas ref={canvasRef} className="lounge-passage-veil" aria-hidden="true"/>
    <div className="lounge-passage-seal" style={{
      left: "var(--lounge-passage-origin-x, 36px)",
      top: "var(--lounge-passage-origin-y, 49px)",
    }} aria-hidden="true">
      <span className="lounge-passage-seal-source" style={{ opacity: sourceVisible }}>
        {entering ? sharedMark : <Image src="/committee-restroom-badge.png" alt="" width={54} height={54} unoptimized/>}
      </span>
      <span className="lounge-passage-seal-destination" style={{ opacity: targetVisible }}>
        {entering ? <Image src="/committee-restroom-badge.png" alt="" width={54} height={54} unoptimized/> : sharedMark}
      </span>
    </div>
    {waiting && <span className="lounge-passage-status" role="status">正在加载休息室…</span>}
  </div>;
}
