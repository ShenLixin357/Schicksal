"use client";
import {recordExploration} from "../guide/exploration";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { extractFabric, paintFabric } from "./mafraer-fabric";
import { BROOM_DOCK, BROOM_HOME, MAGIC_TIMING, ORB, PALACE_SIZE, beginGesture, chargeAt, clamp, easeOut, finishGesture, inertiaStep, moveGesture, recallPose, settled, smooth, springStep, windowPoint, type Gesture, type Point, type SpringPoint, type Weather } from "./mafraer-magic-motion";

export const MAFRAER_MECHANISM_ASSETS = {
  moonlit: "/mafraer-palace-clean-moonlit-v1.png",
  lit: "/mafraer-palace-clean-lit-v1.png",
  broom: "/mafraer-ice-broom-v1.png",
  shell: "/mafraer-crystal-shell-v1.png",
} as const;
const SOURCE_ART = { moonlit: "/mafraer-ice-bedroom-moonlit-v4.png", lit: "/mafraer-ice-bedroom-lit-v4.png" };
const WEATHER_NAMES: Record<Weather, string> = { stardust: "星尘", snow: "细雪", mist: "冰雾" };
type FabricSet = ReturnType<typeof extractFabric>;
type Assets = { moonlit: FabricSet; lit: FabricSet };
type Puff = { kind: Weather; started: number; strength: number; seed: number };
type Runtime = {
  broom: SpringPoint; target: Point; trip: { from: Point; to: Point; started: number } | null;
  broomGesture: Gesture | null; broomDragOrigin: Point; broomMoving: boolean; docked: boolean;
  orbGesture: Gesture | null; orbLastTime: number; angle: number; tilt: number; velocity: number;
  charge: number; pulse: number | null; weather: Puff | null; weatherKind: Weather; serial: number;
  bed: number | null; curtain: number; curtainTrip: { from: number; to: number; started: number; duration: number } | null;
  dirtyFabric: boolean; dirtyOrb: boolean; lit: boolean; ready: boolean; reduced: boolean; pausedAt: number | null;
  lastFrame: number | null; ignoreBroomClick: number; ignoreOrbClick: number;
};
function initialRuntime(): Runtime {
  return {
    broom: { ...BROOM_HOME, vx: 0, vy: 0 }, target: { ...BROOM_HOME }, trip: null,
    broomGesture: null, broomDragOrigin: { ...BROOM_HOME }, broomMoving: false, docked: false,
    orbGesture: null, orbLastTime: 0, angle: 0, tilt: .24, velocity: 0,
    charge: 0, pulse: null, weather: null, weatherKind: "stardust", serial: 0,
    bed: null, curtain: 0, curtainTrip: null, dirtyFabric: true, dirtyOrb: true, lit: false,
    ready: false, reduced: false, pausedAt: null, lastFrame: null, ignoreBroomClick: 0, ignoreOrbClick: 0,
  };
}
const STARS = Array.from({ length: 148 }, (_, i) => {
  const radius = Math.sqrt((i * 41 % 149) / 149) * .72;
  const angle = i * 2.39996 + radius * 4;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: Math.sin(i * 13.37) * .16, size: i % 11 === 0 ? 1.35 : .5 + i % 3 * .17 };
});

function paintOrb(ctx: CanvasRenderingContext2D, size: number, state: Runtime, now: number) {
  ctx.clearRect(0, 0, size, size); ctx.save(); ctx.translate(size / 2, size / 2);
  const r = size * .405;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
  const pulse = state.pulse === null ? 0 : Math.sin(clamp((now - state.pulse) / 3000, 0, 1) * Math.PI);
  const energy = Math.max(state.charge, pulse * .8);
  const haze = ctx.createRadialGradient(-r * .15, r * .12, 0, 0, 0, r);
  haze.addColorStop(0, `rgba(216,204,255,${.16 + energy * .3})`);
  haze.addColorStop(.5, `rgba(116,153,239,${.13 + energy * .14})`); haze.addColorStop(1, "rgba(112,168,242,0)");
  ctx.fillStyle = haze; ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.save(); ctx.rotate(state.angle * .7);
  for (let arm = 0; arm < 3; arm++) {
    ctx.rotate(Math.PI * 2 / 3); ctx.beginPath();
    for (let t = 0; t <= 1; t += .025) {
      const a = t * 3.8, x = Math.cos(a) * t * r * .82, y = Math.sin(a) * t * r * .36;
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineWidth = r * .12; ctx.strokeStyle = `rgba(171,178,244,${.045 + energy * .075})`; ctx.stroke();
  }
  ctx.restore();
  const ca = Math.cos(state.angle), sa = Math.sin(state.angle), ct = Math.cos(state.tilt), st = Math.sin(state.tilt);
  STARS.forEach((star, i) => {
    const x = star.x * ca + star.z * sa, z = -star.x * sa + star.z * ca;
    const y = star.y * ct - z * st, depth = star.y * st + z * ct;
    const perspective = 1 / (1.8 - depth * .5), gather = state.reduced ? 1 : 1 - state.charge * .27;
    const px = x * r * perspective * 1.5 * gather, py = y * r * perspective * 1.5 * gather;
    const shimmer = energy > .02 && !state.reduced ? .76 + .24 * Math.sin(now * .003 + i * 3.1) : .85;
    ctx.globalAlpha = clamp((.32 + energy * .55 + depth * .15) * shimmer, .16, 1);
    ctx.fillStyle = i % 7 === 0 ? "#ffe8ce" : i % 3 === 0 ? "#d4ceff" : "#e4f7ff";
    const sr = star.size * size / 190 * (1 + energy * .65);
    ctx.beginPath(); ctx.arc(px, py, sr, 0, Math.PI * 2); ctx.fill();
    if (i % 19 === 0 && energy > .15) { ctx.fillRect(px - sr * 2.6, py - .35, sr * 5.2, .7); ctx.fillRect(px - .35, py - sr * 2.6, .7, sr * 5.2); }
  });
  ctx.globalAlpha = 1;
  if (energy > .01) {
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * (.14 + energy * .27));
    core.addColorStop(0, `rgba(237,248,255,${energy * .63})`); core.addColorStop(.32, `rgba(192,192,255,${energy * .3})`); core.addColorStop(1, "rgba(161,195,255,0)");
    ctx.fillStyle = core; ctx.fillRect(-r, -r, r * 2, r * 2);
  }
  ctx.restore();
}

function paintWeather(ctx: CanvasRenderingContext2D, puff: Puff | null, now: number, reduced: boolean) {
  ctx.clearRect(0, 0, PALACE_SIZE.width, PALACE_SIZE.height);
  if (!puff) return;
  const elapsed = (now - puff.started) / 1000, life = MAGIC_TIMING.weather / 1000;
  const fade = smooth(elapsed / .3) * (1 - smooth((elapsed - life * .56) / (life * .44)));
  const count = reduced ? 9 : Math.round(34 + puff.strength * 44);
  ctx.save();
  // Weather stays near the globe; it never obscures the whole bedroom.
  for (let i = 0; i < count; i++) {
    const seed = i * 2.39996 + puff.seed * .61, fraction = (i * 37 % count) / count;
    const a = seed % (Math.PI * 2), expansion = reduced ? .65 : easeOut(elapsed / 2.8);
    const radius = (24 + fraction * (70 + puff.strength * 44)) * expansion;
    const x = ORB.x + Math.cos(a) * radius + (reduced ? 0 : Math.sin(elapsed * .8 + seed) * 8);
    const y = ORB.y + Math.sin(a) * radius * .65 + (reduced ? 0 : elapsed * (puff.kind === "snow" ? 16 + fraction * 7 : -7 - fraction * 4));
    if (puff.kind === "mist") {
      if (i % 5) continue;
      const size = 22 + fraction * 24 + expansion * 13;
      const mist = ctx.createRadialGradient(x, y, 0, x, y, size);
      mist.addColorStop(0, `rgba(198,221,248,${fade * (.08 + puff.strength * .08)})`); mist.addColorStop(1, "rgba(166,199,240,0)");
      ctx.fillStyle = mist; ctx.fillRect(x - size, y - size, size * 2, size * 2);
    } else {
      ctx.globalAlpha = fade * (.36 + fraction * .52) * (reduced ? 1 : .75 + .25 * Math.sin(elapsed * 5 + seed));
      const size = puff.kind === "snow" ? 1.25 + fraction * 1.8 : .7 + fraction * 1.4;
      ctx.fillStyle = i % 8 === 0 && puff.kind === "stardust" ? "#f6d7f3" : "#deefff";
      if (puff.kind === "snow" && i % 3 === 0) {
        ctx.strokeStyle = "#deefff"; ctx.lineWidth = .6; ctx.beginPath();
        for (let spoke = 0; spoke < 3; spoke++) { const angle = spoke * Math.PI / 3; ctx.moveTo(x - Math.cos(angle) * size, y - Math.sin(angle) * size); ctx.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size); }
        ctx.stroke();
      } else { ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  ctx.restore();
}

export function MafraerMechanisms({ lit, paused, resonance, soundEnabled, onReady, onWhisper, onCrystalTap }: {
  lit: boolean; paused: boolean; resonance: number | null; soundEnabled: boolean;
  onReady: (ready: boolean) => void; onWhisper: (text: string) => void; onCrystalTap: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [bedBusy, setBedBusy] = useState(false);
  const [curtainClosed, setCurtainClosed] = useState(false);
  const [docked, setDocked] = useState(false);
  const [weatherKind, setWeatherKind] = useState<Weather>("stardust");
  const [weatherMenu, setWeatherMenu] = useState(false);
  const state = useRef(initialRuntime());
  const assets = useRef<Assets | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const fabricCanvas = useRef<HTMLCanvasElement>(null);
  const weatherCanvas = useRef<HTMLCanvasElement>(null);
  const orbCanvas = useRef<HTMLCanvasElement>(null);
  const broomRig = useRef<HTMLDivElement>(null);
  const orbButton = useRef<HTMLButtonElement>(null);
  const frame = useRef<number | null>(null);
  const tick = useRef<(now: number) => void>(() => {});
  const callbacks = useRef({ onReady, onWhisper, onCrystalTap });
  const pausedProp = useRef(paused);
  const sound = useRef({ enabled: soundEnabled, context: null as AudioContext | null, master: null as GainNode | null });
  useEffect(() => { callbacks.current = { onReady, onWhisper, onCrystalTap }; }, [onReady, onWhisper, onCrystalTap]);

  const wake = useCallback(() => {
    if (frame.current === null && state.current.ready && state.current.pausedAt === null) frame.current = requestAnimationFrame((now) => tick.current(now));
  }, []);

  const playSound = useCallback((kind: "wind" | "cloth" | "ice" | "release") => {
    const audio = sound.current;
    if (!audio.enabled) return;
    const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    try {
      const context = audio.context ?? new Context(); audio.context = context;
      const master = audio.master ?? context.createGain();
      if (!audio.master) { master.gain.value = .5; master.connect(context.destination); audio.master = master; }
      if (context.state === "suspended") void context.resume().catch(() => {});
      const now = context.currentTime;
      if (kind === "wind" || kind === "cloth") {
        const duration = kind === "cloth" ? .9 : .7;
        const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate), data = buffer.getChannelData(0);
        let value = 0, noiseSeed = 87631;
        for (let i = 0; i < data.length; i++) { noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) | 0; value = value * .86 + ((noiseSeed >>> 0) / 4294967296 * 2 - 1) * .14; data[i] = value; }
        const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
        source.buffer = buffer; filter.type = "bandpass"; filter.frequency.value = kind === "cloth" ? 540 : 1150; filter.Q.value = .7;
        gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.055, now + .12); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
        source.connect(filter).connect(gain).connect(master); source.start(now); source.stop(now + duration);
        source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      }
      if (kind !== "cloth") [kind === "release" ? 659.25 : 783.99, 987.77, 1318.51].forEach((frequency, i) => {
        const oscillator = context.createOscillator(), gain = context.createGain(), start = now + i * .085;
        oscillator.type = "sine"; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(kind === "wind" ? .009 : .022, start + .015); gain.gain.exponentialRampToValueAtTime(.0001, start + .65);
        oscillator.connect(gain).connect(master); oscillator.start(start); oscillator.stop(start + .7);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch { /* The room remains playable when browser audio is unavailable. */ }
  }, []);

  useEffect(() => {
    sound.current.enabled = soundEnabled;
    const audio = sound.current;
    if (audio.context && audio.master) audio.master.gain.setTargetAtTime(soundEnabled ? .5 : 0, audio.context.currentTime, .025);
  }, [soundEnabled]);

  // The asset promises can settle before React commits the new orb canvas.
  // Wake once after that commit rather than leaving its first frame blank.
  useEffect(() => {
    if (ready) { state.current.dirtyFabric = true; state.current.dirtyOrb = true; wake(); }
  }, [ready, wake]);

  useEffect(() => {
    let cancelled = false;
    const pictures: HTMLImageElement[] = [];
    const timers: number[] = [];
    const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const picture = new window.Image(); pictures.push(picture);
      const timer = window.setTimeout(() => reject(new Error("Palace art timeout")), 18000); timers.push(timer);
      picture.onload = () => { window.clearTimeout(timer); resolve(picture); };
      picture.onerror = () => { window.clearTimeout(timer); reject(new Error("Palace art unavailable")); };
      picture.src = src;
    });
    void Promise.all([SOURCE_ART.moonlit, SOURCE_ART.lit, MAFRAER_MECHANISM_ASSETS.moonlit, MAFRAER_MECHANISM_ASSETS.lit, MAFRAER_MECHANISM_ASSETS.broom, MAFRAER_MECHANISM_ASSETS.shell].map(load)).then(([moonArt, litArt, moonClean, litClean]) => {
      if (cancelled) return;
      assets.current = { moonlit: extractFabric(moonArt, moonClean), lit: extractFabric(litArt, litClean) };
      state.current.ready = true; setReady(true); callbacks.current.onReady(true); wake();
    }).catch(() => { if (!cancelled) { setFailed(true); callbacks.current.onReady(false); callbacks.current.onWhisper("月宫机关的图层暂时未能载入。房间仍保留原画；重新进入即可再试。"); } });
    return () => { cancelled = true; timers.forEach(window.clearTimeout); pictures.forEach((picture) => { picture.onload = null; picture.onerror = null; }); };
  }, [wake]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const s = state.current; s.reduced = media.matches;
      if (s.reduced) {
        if (s.trip) { s.broom = { ...s.trip.to, vx: 0, vy: 0 }; s.trip = null; }
        if (s.broomMoving) { s.broom = { ...s.target, vx: 0, vy: 0 }; s.broomMoving = false; }
        if (s.bed !== null) { s.bed = null; s.curtain = 1; s.curtainTrip = null; setBedBusy(false); setCurtainClosed(true); }
        s.velocity = 0; s.dirtyFabric = true; s.dirtyOrb = true;
      }
      wake();
    };
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [wake]);

  useEffect(() => {
    tick.current = (now) => {
      frame.current = null;
      const s = state.current;
      if (!s.ready || s.pausedAt !== null) return;
      const dt = s.lastFrame === null ? 1 / 60 : clamp((now - s.lastFrame) / 1000, 0, .08); s.lastFrame = now;
      let bank = s.docked ? -7 : 0, yaw = 0;
      if (s.trip) {
        const progress = clamp((now - s.trip.started) / MAGIC_TIMING.recall, 0, 1), pose = recallPose(s.trip.from, s.trip.to, progress);
        s.broom = { x: pose.x, y: pose.y, vx: 0, vy: 0 }; bank = pose.bank; yaw = pose.yaw;
        if (progress === 1) { s.broom = { ...s.trip.to, vx: 0, vy: 0 }; s.trip = null; }
      } else if (s.broomMoving) {
        s.broom = s.reduced ? { ...s.target, vx: 0, vy: 0 } : springStep(s.broom, s.target, dt);
        const bounded = windowPoint(s.broom);
        if (bounded.x !== s.broom.x) s.broom.vx = 0;
        if (bounded.y !== s.broom.y) s.broom.vy = 0;
        s.broom.x = bounded.x; s.broom.y = bounded.y;
        bank += clamp(s.broom.vy * .09 - s.broom.vx * .035, -14, 14); yaw = clamp(s.broom.vx * -.15, -24, 24);
        if (!s.broomGesture && settled(s.broom, s.target)) { s.broom = { ...s.target, vx: 0, vy: 0 }; s.broomMoving = false; }
      }
      if (broomRig.current) {
        broomRig.current.style.left = `${s.broom.x / PALACE_SIZE.width * 100}%`;
        broomRig.current.style.top = `${s.broom.y / PALACE_SIZE.height * 100}%`;
        broomRig.current.style.transform = `translate(-50%,-50%) perspective(480px) rotateY(${yaw}deg) rotateZ(${bank}deg)`;
      }
      if (s.bed !== null) {
        const elapsed = now - s.bed;
        s.dirtyFabric = true;
        if (elapsed >= 3650 && !s.curtainTrip) s.curtainTrip = { from: s.curtain, to: 1, started: s.bed + 3650, duration: 1950 };
        if (elapsed >= MAGIC_TIMING.bed) { s.bed = null; s.curtain = 1; s.curtainTrip = null; setBedBusy(false); setCurtainClosed(true); callbacks.current.onWhisper("厚被子蓬松地落好了，枕头也各自归位。床纱轻轻合拢；再碰一下床纱，就能重新拉开。"); }
      }
      if (s.curtainTrip) {
        const travel = clamp((now - s.curtainTrip.started) / s.curtainTrip.duration, 0, 1);
        s.curtain = s.curtainTrip.from + (s.curtainTrip.to - s.curtainTrip.from) * smooth(travel); s.dirtyFabric = true;
        if (travel === 1) { setCurtainClosed(s.curtainTrip.to === 1); s.curtainTrip = null; }
      }
      const fabric = fabricCanvas.current, fabricContext = fabric?.getContext("2d");
      if (s.dirtyFabric && fabric && fabricContext && assets.current) {
        fabricContext.clearRect(0, 0, fabric.width, fabric.height); fabricContext.save(); fabricContext.scale(fabric.width / PALACE_SIZE.width, fabric.height / PALACE_SIZE.height);
        paintFabric(fabricContext, assets.current[s.lit ? "lit" : "moonlit"], s.bed === null ? null : (now - s.bed) / 1000, s.curtain); fabricContext.restore(); s.dirtyFabric = false;
      }
      const charge = chargeAt(s.orbGesture, now);
      if (charge !== s.charge) { s.charge = charge; s.dirtyOrb = true; }
      if (!s.orbGesture && s.velocity !== 0) { s.angle += s.velocity * dt; s.velocity = s.reduced ? 0 : inertiaStep(s.velocity, dt); s.dirtyOrb = true; }
      if (s.pulse !== null) { s.dirtyOrb = true; if (now - s.pulse >= 3000) s.pulse = null; }
      const orb = orbCanvas.current, orbContext = orb?.getContext("2d");
      if (orb && orbContext && (s.dirtyOrb || s.charge > 0)) { paintOrb(orbContext, orb.width, s, now); s.dirtyOrb = false; }
      const weatherContext = weatherCanvas.current?.getContext("2d");
      if (weatherContext) {
        if (s.weather && now - s.weather.started >= MAGIC_TIMING.weather) s.weather = null;
        paintWeather(weatherContext, s.weather, now, s.reduced);
      }
      if (s.trip || s.broomMoving || s.bed !== null || s.curtainTrip || s.orbGesture || s.velocity || s.pulse !== null || s.weather) wake();
      else s.lastFrame = null;
    };
    const resize = () => {
      const canvas = fabricCanvas.current, width = host.current?.getBoundingClientRect().width || PALACE_SIZE.width;
      if (canvas) {
        const scale = clamp(width * Math.min(window.devicePixelRatio || 1, 2) / PALACE_SIZE.width, .45, 1.35);
        canvas.width = Math.round(PALACE_SIZE.width * scale); canvas.height = Math.round(PALACE_SIZE.height * scale);
        state.current.dirtyFabric = true; wake();
      }
    };
    const observer = new ResizeObserver(resize); if (host.current) observer.observe(host.current); resize();
    return () => { observer.disconnect(); if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; if (sound.current.context) void sound.current.context.close().catch(() => {}); };
  }, [wake]);

  const cancelGestures = useCallback(() => {
    const s = state.current;
    if (s.broomGesture) s.ignoreBroomClick = performance.now() + 800;
    if (s.orbGesture) s.ignoreOrbClick = performance.now() + 800;
    if (s.broomGesture?.moved) { s.target = { ...BROOM_DOCK }; s.docked = true; s.broomMoving = true; setDocked(true); }
    s.broomGesture = null; s.orbGesture = null; s.charge = 0; s.velocity = 0; s.dirtyOrb = true; wake();
  }, [wake]);
  useEffect(() => {
    const update = () => {
      const s = state.current, now = performance.now(), shouldPause = pausedProp.current || document.hidden;
      if (shouldPause && s.pausedAt === null) { cancelGestures(); s.pausedAt = now; if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; }
      else if (!shouldPause && s.pausedAt !== null) {
        const gap = now - s.pausedAt; s.pausedAt = null; s.lastFrame = null;
        if (s.trip) s.trip.started += gap; if (s.bed !== null) s.bed += gap; if (s.curtainTrip) s.curtainTrip.started += gap;
        if (s.weather) s.weather.started += gap; if (s.pulse !== null) s.pulse += gap; wake();
      }
    };
    pausedProp.current = paused; update();
    document.addEventListener("visibilitychange", update); window.addEventListener("blur", cancelGestures);
    return () => { document.removeEventListener("visibilitychange", update); window.removeEventListener("blur", cancelGestures); };
  }, [paused, wake, cancelGestures]);
  useEffect(() => {
    state.current.lit = lit; state.current.dirtyFabric = true; state.current.dirtyOrb = true; wake();
  }, [lit, wake]);
  useEffect(() => {
    if (resonance !== null) { state.current.pulse = performance.now(); state.current.dirtyOrb = true; wake(); }
  }, [resonance, wake]);
  useEffect(() => {
    const close = (event: globalThis.PointerEvent) => { if (!(event.target as Element)?.closest?.("[data-palace-orb-controls]")) setWeatherMenu(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const sceneDelta = (point: Point): Point => {
    const rect = host.current?.getBoundingClientRect();
    return rect ? { x: point.x / rect.width * PALACE_SIZE.width, y: point.y / rect.height * PALACE_SIZE.height } : point;
  };
  const recall = () => {
    const s = state.current; if (!s.ready || s.broomGesture || s.trip) return;
    const to = s.docked ? BROOM_HOME : BROOM_DOCK;
    void recordExploration("lounge:mafraer:broom");
    s.docked = !s.docked; setDocked(s.docked); s.broomMoving = false; s.target = { ...to };
    if (s.reduced) s.broom = { ...to, vx: 0, vy: 0 };
    else s.trip = { from: { x: s.broom.x, y: s.broom.y }, to: { ...to }, started: performance.now() };
    playSound("wind"); callbacks.current.onWhisper(s.docked ? "冰晶扫帚轻轻转身，沿着月光滑到窗边。按住拖动，可以指引它在窗外飞行；松手后它会缓缓停泊。" : "扫帚离开窗边，轻盈地滑回夜空中的原位。"); wake();
  };
  const broomDown = (event: PointerEvent<HTMLButtonElement>) => {
    const s = state.current; if (!s.ready || s.broomGesture || !event.isPrimary || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    s.broomGesture = beginGesture(event.pointerId, { x: event.clientX, y: event.clientY }, performance.now());
    s.broomDragOrigin = { x: s.broom.x, y: s.broom.y }; s.trip = null; s.target = { ...s.broomDragOrigin }; s.broomMoving = false;
  };
  const broomMove = (event: PointerEvent<HTMLButtonElement>) => {
    const s = state.current, gesture = s.broomGesture; if (!gesture || gesture.id !== event.pointerId) return;
    s.broomGesture = moveGesture(gesture, event.pointerId, { x: event.clientX, y: event.clientY });
    if (!s.broomGesture.moved) return;
    const delta = sceneDelta({ x: event.clientX - gesture.origin.x, y: event.clientY - gesture.origin.y });
    s.target = windowPoint({ x: s.broomDragOrigin.x + delta.x, y: s.broomDragOrigin.y + delta.y }); s.broomMoving = true; wake();
  };
  const broomEnd = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const s = state.current, gesture = s.broomGesture; if (!gesture || gesture.id !== event.pointerId) return;
    const finalGesture = moveGesture(gesture, event.pointerId, { x: event.clientX, y: event.clientY });
    const action = finishGesture(finalGesture, event.pointerId, performance.now(), cancelled); s.broomGesture = null; s.ignoreBroomClick = performance.now() + 600;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (finalGesture.moved) {
      s.docked = true; setDocked(true); s.target = { ...BROOM_DOCK }; s.broomMoving = true;
      if (!cancelled) { void recordExploration("lounge:mafraer:broom-flight"); playSound("wind"); callbacks.current.onWhisper("你松开了魔力。扫帚带着最后一点飞行的惯性，慢慢归向窗边。"); }
      wake();
    } else if (action === "tap" || action === "weather") recall();
  };

  const makeBed = () => {
    const s = state.current; if (!s.ready || s.bed !== null) return;
    s.curtain = 0; s.curtainTrip = null; setCurtainClosed(false);
    void recordExploration("lounge:mafraer:bed");
    if (s.reduced) { s.curtain = 1; setCurtainClosed(true); callbacks.current.onWhisper("被子与枕头整理好了，床纱已经合拢。再碰床纱可以拉开。"); }
    else { s.bed = performance.now(); setBedBusy(true); callbacks.current.onWhisper("一双看不见的手托起被角。厚被子缓缓舒展，枕头正一个接一个归位…"); }
    s.dirtyFabric = true; playSound("cloth"); wake();
  };
  const toggleCurtain = () => {
    const s = state.current; if (!s.ready || s.bed !== null) return;
    const to = s.curtainTrip ? 1 - s.curtainTrip.to : s.curtain > .5 ? 0 : 1;
    void recordExploration("lounge:mafraer:curtain");
    if (s.reduced) { s.curtain = to; s.curtainTrip = null; setCurtainClosed(to === 1); s.dirtyFabric = true; }
    else s.curtainTrip = { from: s.curtain, to, started: performance.now(), duration: 1700 };
    playSound("cloth"); callbacks.current.onWhisper(to ? "床纱从两侧缓缓靠拢，把高高的床围进一片柔软的紫色月光。" : "床纱沿着两侧轻轻展开，厚厚的床垫与蓬松被子重新露出来。"); wake();
  };
  const emitWeather = (strength: number) => {
    const s = state.current; s.weather = { kind: s.weatherKind, started: performance.now(), strength: clamp(strength, .15, 1), seed: ++s.serial };
    s.charge = 0; s.pulse = performance.now(); s.dirtyOrb = true;
    void recordExploration("lounge:mafraer:weather");
    playSound("release"); callbacks.current.onWhisper(`你释放了凝聚的魔力。一小阵${WEATHER_NAMES[s.weatherKind]}从水晶球边缘散开，又安静地融回月光。`); wake();
  };
  const crystalTap = () => {
    state.current.pulse = performance.now(); state.current.dirtyOrb = true; playSound("ice"); callbacks.current.onCrystalTap(); wake();
  };
  const orbDown = (event: PointerEvent<HTMLButtonElement>) => {
    const s = state.current; if (!s.ready || s.orbGesture || !event.isPrimary || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    s.orbGesture = beginGesture(event.pointerId, { x: event.clientX, y: event.clientY }, performance.now()); s.orbLastTime = performance.now(); s.velocity = 0;
    setWeatherMenu(true); playSound("ice"); wake();
  };
  const orbMove = (event: PointerEvent<HTMLButtonElement>) => {
    const s = state.current, gesture = s.orbGesture; if (!gesture || gesture.id !== event.pointerId) return;
    s.orbGesture = moveGesture(gesture, event.pointerId, { x: event.clientX, y: event.clientY });
    if (!s.orbGesture.moved) return;
    const delta = sceneDelta({ x: event.clientX - gesture.last.x, y: event.clientY - gesture.last.y });
    const now = performance.now(), angle = delta.x / ORB.diameter * 1.8;
    s.angle += angle; s.tilt = clamp(s.tilt + delta.y / ORB.diameter * .8, -.8, .8);
    s.velocity = s.reduced ? 0 : clamp(angle / Math.max(.012, (now - s.orbLastTime) / 1000), -3.5, 3.5);
    s.orbLastTime = now; s.charge = 0; s.dirtyOrb = true; wake();
  };
  const orbEnd = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const s = state.current, gesture = s.orbGesture; if (!gesture || gesture.id !== event.pointerId) return;
    const finalGesture = moveGesture(gesture, event.pointerId, { x: event.clientX, y: event.clientY });
    const now = performance.now(), action = finishGesture(finalGesture, event.pointerId, now, cancelled), strength = chargeAt(finalGesture, now);
    s.orbGesture = null; s.charge = 0; s.ignoreOrbClick = now + 600; s.dirtyOrb = true;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (cancelled) s.velocity = 0;
    else if (action === "tap") crystalTap();
    else if (action === "weather") emitWeather(strength);
    else if (action === "drag") { void recordExploration("lounge:mafraer:orb-rotate"); if (now - s.orbLastTime > 100) s.velocity = 0; callbacks.current.onWhisper("你拨动了球中的星河。细小星辰掠过冰晶切面，慢慢停在新的方向。"); }
    wake();
  };

  return <div ref={host} className={`mafraer-mechanisms ${ready ? "mechanisms-awake" : ""}`} aria-label="冰晶月宫的小机关">
    <canvas ref={fabricCanvas} className="mafraer-fabric-layer" aria-hidden="true" />
    <canvas ref={weatherCanvas} className="mafraer-weather-layer" width={PALACE_SIZE.width} height={PALACE_SIZE.height} aria-hidden="true" />
    {ready && <>
      <div ref={broomRig} className="mafraer-broom-rig" style={{ left: `${BROOM_HOME.x / PALACE_SIZE.width * 100}%`, top: `${BROOM_HOME.y / PALACE_SIZE.height * 100}%` }}>
        {/* This is the extracted original broom; the plate underneath has none. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MAFRAER_MECHANISM_ASSETS.broom} alt="" draggable={false} aria-hidden="true" />
        <button type="button" className="mafraer-object mafraer-broom-touch" aria-label="冰晶扫帚：点击召回或送回，按住拖动飞行，松手停泊" aria-pressed={docked}
          onPointerDown={broomDown} onPointerMove={broomMove} onPointerUp={(e) => broomEnd(e)} onPointerCancel={(e) => broomEnd(e, true)} onLostPointerCapture={(e) => { if (state.current.broomGesture?.id === e.pointerId) broomEnd(e, true); }}
          onClick={() => { if (performance.now() >= state.current.ignoreBroomClick) recall(); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") { cancelGestures(); return; }
            const direction = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, number[]>)[event.key];
            if (!direction) return; event.preventDefault();
            const s = state.current; s.trip = null; s.target = windowPoint({ x: s.target.x + direction[0] * 16, y: s.target.y + direction[1] * 16 }); s.broomMoving = true; wake();
          }}><span>召回扫帚 · 拖动飞行</span></button>
      </div>
      <button type="button" className="mafraer-object mafraer-bed-touch" style={{ left: "31.3%", top: "52.2%", width: "9.2%", height: "22%" }} onClick={makeBed} disabled={bedBusy} aria-busy={bedBusy} aria-label="施法整理厚被子和枕头，最后合拢床纱"><span>{bedBusy ? "魔法正在整理床铺" : "轻触被子 · 魔法整理床铺"}</span></button>
      <button type="button" className="mafraer-object mafraer-curtain-touch" style={{ left: curtainClosed ? "33.6%" : "39.8%", top: "62%", width: curtainClosed ? "6.4%" : "4.2%", height: "36%" }} onClick={toggleCurtain} disabled={bedBusy} aria-pressed={curtainClosed} aria-label={curtainClosed ? "拉开上方床纱" : "合拢上方床纱"}><span>{curtainClosed ? "拉开床纱" : "合拢床纱"}</span></button>
      <div className="mafraer-orb-rig" data-palace-orb-controls style={{ left: `${ORB.x / PALACE_SIZE.width * 100}%`, top: `${ORB.y / PALACE_SIZE.height * 100}%`, width: `${ORB.diameter / PALACE_SIZE.width * 100}%` } as CSSProperties}>
        <canvas ref={orbCanvas} width={256} height={256} aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mafraer-orb-shell" src={MAFRAER_MECHANISM_ASSETS.shell} alt="" draggable={false} aria-hidden="true" />
        <button ref={orbButton} type="button" className="mafraer-object mafraer-orb-touch" aria-label={`水晶球：轻点星辰共鸣，长按后松手释放${WEATHER_NAMES[weatherKind]}，拖动拨动星河`} aria-describedby="mafraer-orb-instructions"
          onPointerDown={orbDown} onPointerMove={orbMove} onPointerUp={(e) => orbEnd(e)} onPointerCancel={(e) => orbEnd(e, true)} onLostPointerCapture={(e) => { if (state.current.orbGesture?.id === e.pointerId) orbEnd(e, true); }}
          onFocus={() => setWeatherMenu(true)} onClick={() => { if (performance.now() >= state.current.ignoreOrbClick) { setWeatherMenu(true); crystalTap(); } }}
          onKeyDown={(event) => { if (event.key === "Escape") { cancelGestures(); setWeatherMenu(false); } if (event.key.toLowerCase() === "r") { event.preventDefault(); emitWeather(1); } }}><span>轻点共鸣 · 长按凝聚 · 滑动星河</span></button>
      </div>
      <div data-palace-orb-controls className="mafraer-weather-menu" hidden={!weatherMenu} onKeyDown={(event) => { if (event.key === "Escape") { orbButton.current?.focus(); setWeatherMenu(false); } }}>
        <div role="group" aria-label="水晶球天气">{(Object.keys(WEATHER_NAMES) as Weather[]).map((kind) => <button key={kind} type="button" aria-pressed={kind === weatherKind} onClick={() => { state.current.weatherKind = kind; setWeatherKind(kind); }}>{WEATHER_NAMES[kind]}</button>)}</div>
        <p id="mafraer-orb-instructions">长按凝聚，松手释放 · 滑动拨星河</p>
        <button type="button" className="mafraer-weather-release" onClick={() => emitWeather(1)}>释放{WEATHER_NAMES[weatherKind]} <small>R</small></button>
        <button type="button" className="mafraer-weather-close" aria-label="收起天气选项" onClick={() => { orbButton.current?.focus(); setWeatherMenu(false); }}>×</button>
      </div>
    </>}
    {!ready && !failed && <p className="mafraer-mechanisms-loading" role="status">小机关正从月光中醒来…</p>}
  </div>;
}
